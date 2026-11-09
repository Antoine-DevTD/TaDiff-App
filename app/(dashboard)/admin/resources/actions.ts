"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { resourceDocumentSchema, validateResourceForPublication } from "@/lib/resources";
import { canEditResources, isResourceId, loadResourceRevisions, parseResourcePage, RESOURCE_CONNECTION_ERROR } from "@/lib/resources-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import type { ResourceDocument, ResourceLoadResult, ResourceRevision, ResourceSaveInput, ResourceSaveResult } from "@/types/resources";

function revisionValid(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }

async function mutate(id: string, document: ResourceDocument | null, expectedRevision: number | null, action: "save" | "publish" | "unpublish" | "restore" | "archive" | "unarchive", revisionId?: string): Promise<ResourceSaveResult> {
  if (!hasSupabaseEnv()) return { ok: false, message: RESOURCE_CONNECTION_ERROR };
  if (!isResourceId(id) || (expectedRevision !== null && !revisionValid(expectedRevision)) || (revisionId !== undefined && !isResourceId(revisionId))) return { ok: false, message: "Les informations de la page sont invalides." };
  if (!await canEditResources()) return { ok: false, message: "Vous n’avez pas l’autorisation de modifier les ressources." };
  try {
    const db = await getSupabaseServerClient();
    const { data, error } = await db.rpc("mutate_resource_page", {
      p_id: id, p_document: document as Json | null, p_expected_revision: expectedRevision, p_action: action, p_revision_id: revisionId ?? null,
    });
    if (error) {
      if (error.code === "PT409" || error.code === "40001" || error.message?.includes("resource_conflict")) return { ok: false, conflict: true, message: "Cette page a été modifiée ailleurs. Copiez vos changements puis rechargez la page avant de réessayer." };
      if (error.code === "23505" || error.message?.includes("resource_slug_taken")) return { ok: false, message: "Cette adresse est déjà utilisée par une autre page. Choisissez une autre adresse." };
      if (error.message?.includes("resource_asset_invalid")) return { ok: false, message: "Une pièce jointe n’appartient pas à cette page. Importez-la à nouveau depuis cette page." };
      if (error.message?.includes("resource_archived")) return { ok: false, message: "Cette page est archivée. Restaurez-la avant de la modifier ou de la publier." };
      if (error.message?.includes("resource_not_archived")) return { ok: false, message: "Cette page n’est plus archivée. Rechargez la liste pour retrouver son état actuel." };
      if (error.code === "42501") return { ok: false, message: "Vous n’avez plus l’autorisation de modifier les ressources." };
      return { ok: false, message: "La page n’a pas été enregistrée. Vérifiez la connexion et l’installation de l’espace ressources." };
    }
    const page = parseResourcePage(data);
    if (!page) return { ok: false, message: "L’enregistrement n’a pas pu être confirmé. Rechargez la page pour vérifier son état." };
    revalidatePath("/admin/resources", "layout");
    revalidatePath("/ressources", "layout");
    revalidatePath("/resources");
    revalidatePath("/resources/manage", "layout");
    revalidatePath("/resources/manage/[id]", "page");
    return { ok: true, page, message: action === "publish" ? "La page est publiée." : action === "unpublish" ? "La page n’est plus publiée." : action === "restore" ? "Cette version a été restaurée en brouillon." : action === "archive" ? "La page est archivée et retirée de la bibliothèque." : action === "unarchive" ? "La page a été restaurée en brouillon. Vous pouvez la publier à nouveau." : "Le brouillon est enregistré." };
  } catch { return { ok: false, message: "La connexion a été interrompue. Rechargez la page pour vérifier l’enregistrement avant de réessayer." }; }
}

export async function saveResourcePage(input: ResourceSaveInput): Promise<ResourceSaveResult> {
  if (!input || typeof input !== "object" || (input.publish !== undefined && typeof input.publish !== "boolean")) return { ok: false, message: "Les informations de la page sont invalides." };
  const parsed = resourceDocumentSchema.safeParse(input.document);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Le contenu de la page est invalide." };
  if (input.publish) {
    const error = validateResourceForPublication(parsed.data);
    if (error) return { ok: false, message: error };
  }
  return mutate(input.id, parsed.data, input.expectedRevision, input.publish ? "publish" : "save");
}

export async function unpublishResourcePage(id: string, expectedRevision: number): Promise<ResourceSaveResult> {
  if (!revisionValid(expectedRevision)) return { ok: false, message: "Rechargez la page avant de la retirer." };
  return mutate(id, null, expectedRevision, "unpublish");
}
export async function restoreResourceRevision(id: string, revisionId: string, expectedRevision: number): Promise<ResourceSaveResult> {
  if (!revisionValid(expectedRevision) || !isResourceId(revisionId)) return { ok: false, message: "La version demandée est invalide." };
  return mutate(id, null, expectedRevision, "restore", revisionId);
}
export async function getResourceRevisions(id: string): Promise<ResourceLoadResult<ResourceRevision[]>> {
  return loadResourceRevisions(id);
}

export async function archiveResourcePage(id: string, expectedRevision: number): Promise<ResourceSaveResult> {
  if (!revisionValid(expectedRevision)) return { ok: false, message: "Rechargez la page avant de l’archiver." };
  return mutate(id, null, expectedRevision, "archive");
}

export async function restoreArchivedResourcePage(id: string, expectedRevision: number): Promise<ResourceSaveResult> {
  if (!revisionValid(expectedRevision)) return { ok: false, message: "Rechargez la page avant de la restaurer." };
  return mutate(id, null, expectedRevision, "unarchive");
}
