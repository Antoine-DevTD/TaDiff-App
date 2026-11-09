import "server-only";
import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { resourceDocumentSchema } from "@/lib/resources";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PublishedResource, ResourceAsset, ResourceLoadResult, ResourcePage, ResourceRevision } from "@/types/resources";

export const RESOURCE_CONNECTION_ERROR = "Les ressources nécessitent une connexion à TaDiff. Réessayez dans un instant.";
const LOAD_ERROR = "Impossible de charger les ressources. Vérifiez la connexion et l’installation de l’espace ressources.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isResourceId(value: unknown): value is string { return typeof value === "string" && UUID.test(value); }

// React cache lives only for the current server request. Every mutation still
// checks the entitlement in PostgreSQL, including after a concurrent revocation.
export const canEditResources = cache(async function canEditResources(): Promise<boolean> {
  noStore();
  if (!hasSupabaseEnv()) return false;
  try {
    const db = await getSupabaseServerClient();
    const { data: user, error: authError } = await db.auth.getUser();
    if (authError || !user.user) return false;
    const { data, error } = await db.rpc("can_edit_resources");
    return !error && data === true;
  } catch { return false; }
});

export function parseResourcePage(value: unknown): ResourcePage | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ResourcePage;
  const parsed = resourceDocumentSchema.safeParse(row.draft);
  if (!isResourceId(row.id) || !parsed.success || !Number.isSafeInteger(row.revision) || row.revision < 1
    || typeof row.created_at !== "string" || typeof row.updated_at !== "string"
    || (row.published_at !== null && typeof row.published_at !== "string")
    || (row.archived_at != null && typeof row.archived_at !== "string")) return null;
  return { id: row.id, draft: parsed.data, revision: row.revision, created_at: row.created_at, updated_at: row.updated_at, published_at: row.published_at, archived_at: row.archived_at ?? null };
}

function publication(value: PublishedResource): PublishedResource {
  const document = resourceDocumentSchema.parse(value.document);
  return { id: value.id, document, published_at: value.published_at, updated_at: value.updated_at };
}

async function guarded<T>(empty: T, run: () => Promise<T>, editor = false): Promise<ResourceLoadResult<T>> {
  noStore();
  if (!hasSupabaseEnv()) return { data: empty, error: RESOURCE_CONNECTION_ERROR };
  if (editor && !await canEditResources()) return { data: empty, error: "La gestion des ressources est réservée aux personnes autorisées." };
  try { return { data: await run(), error: null }; }
  catch { return { data: empty, error: LOAD_ERROR }; }
}

// Fetch every page of results; never silently hide resources after REST's row cap.
async function collect<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < 100000; offset += 200) {
    const { data, error } = await read(offset, offset + 199);
    if (error || !data) throw new Error("resource_load_failed");
    rows.push(...data);
    if (data.length < 200) return rows;
  }
  throw new Error("resource_load_limit");
}

export async function listResourcePages(): Promise<ResourceLoadResult<ResourcePage[]>> {
  return guarded([], async () => {
    const db = await getSupabaseServerClient();
    const rows = await collect((from, to) => db.from("resource_pages").select("id,draft,revision,published_at,archived_at,created_at,updated_at").order("updated_at", { ascending: false }).order("id").range(from, to));
    return rows.map((row) => { const parsed = parseResourcePage(row); if (!parsed) throw new Error("resource_invalid"); return parsed; });
  }, true);
}

export async function getResourcePage(id: string): Promise<ResourceLoadResult<ResourcePage | null>> {
  if (!isResourceId(id)) return { data: null, error: "Page introuvable." };
  return guarded(null, async () => {
    const db = await getSupabaseServerClient();
    const { data, error } = await db.from("resource_pages").select("id,draft,revision,published_at,archived_at,created_at,updated_at").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const parsed = parseResourcePage(data); if (!parsed) throw new Error("resource_invalid"); return parsed;
  }, true);
}

export async function listPublishedResources(): Promise<ResourceLoadResult<PublishedResource[]>> {
  return guarded([], async () => {
    const db = await getSupabaseServerClient();
    return (await collect((from, to) => db.from("resource_publications").select("id,document,published_at,updated_at").order("published_at", { ascending: false }).order("id").range(from, to))).map(publication);
  });
}

export async function getPublishedResource(slug: string): Promise<ResourceLoadResult<PublishedResource | null>> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return { data: null, error: null };
  return guarded(null, async () => {
    const db = await getSupabaseServerClient();
    const { data, error } = await db.from("resource_publications").select("id,document,published_at,updated_at").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data ? publication(data) : null;
  });
}

export async function listResourceAssets(pageId: string): Promise<ResourceLoadResult<ResourceAsset[]>> {
  if (!isResourceId(pageId)) return { data: [], error: "Page introuvable." };
  return guarded([], async () => {
    const db = await getSupabaseServerClient();
    return collect((from, to) => db.from("resource_assets").select("id,page_id,name,mime_type,size,storage_path,created_at").eq("page_id", pageId).order("created_at", { ascending: false }).order("id").range(from, to));
  }, true);
}

export async function loadResourceRevisions(id: string): Promise<ResourceLoadResult<ResourceRevision[]>> {
  if (!isResourceId(id)) return { data: [], error: "Page introuvable." };
  return guarded([], async () => {
    const db = await getSupabaseServerClient();
    const rows = await collect((from, to) => db.from("resource_revisions").select("id,page_id,revision,document,created_at").eq("page_id", id).order("revision", { ascending: false }).range(from, to));
    return rows.map((row) => ({ ...row, document: resourceDocumentSchema.parse(row.document) }));
  }, true);
}
