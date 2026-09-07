"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPosterFileError } from "@/lib/poster-upload";
import { runMaterialReminders } from "@/lib/material-reminders";
import { preparePrivateUpload, removePrivateObject, type StorageProvider } from "@/lib/storage/server";
import { requireWriteAccess } from "@/lib/supabase/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/supabase/workspace";

export type MaterialActionResult = { ok: boolean; message: string };
const uuid = z.string().uuid();
const optionalUuid = z.union([uuid, z.literal("")]);
const category = z.enum(["costume", "accessoire", "decor", "technique", "consommable", "autre"]);
const status = z.enum(["to_prepare", "ready", "to_buy", "packed"]);

const itemSchema = z.object({
  showId: uuid,
  itemId: optionalUuid.optional(),
  name: z.string().trim().min(2, "Donnez un nom au matériel.").max(120),
  category,
  description: z.string().trim().max(500),
  ownerContactId: optionalUuid,
  ownerLabel: z.string().trim().max(120),
  defaultResponsibleContactId: optionalUuid,
  isConsumable: z.boolean(),
  quantityOwned: z.coerce.number().min(0).max(100000),
  unit: z.string().trim().min(1).max(30),
  unitCost: z.coerce.number().min(0).max(1000000),
  photoStoragePath: z.string().trim().max(500),
  photoStorageProvider: z.union([z.enum(["supabase", "r2"]), z.literal("")]),
  notes: z.string().trim().max(1000),
});

const requirementSchema = z.object({
  showId: uuid,
  requirementId: optionalUuid.optional(),
  itemId: uuid,
  performanceDate: z.string().date(),
  performanceTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).or(z.literal("")),
  venue: z.string().trim().max(160),
  quantityNeeded: z.coerce.number().positive().max(100000),
  responsibleContactId: optionalUuid,
  status,
  notes: z.string().trim().max(500),
});

const batchItemSchema = itemSchema.omit({ itemId: true, description: true, photoStoragePath: true, photoStorageProvider: true, notes: true }).extend({
  items: z.array(itemSchema.pick({ name: true, category: true, ownerContactId: true, ownerLabel: true, defaultResponsibleContactId: true, isConsumable: true, quantityOwned: true, unit: true, unitCost: true })).min(1).max(50),
}).pick({ showId: true, items: true });

async function getContext() {
  const accessError = await requireWriteAccess();
  if (accessError) return { error: accessError, companyId: null, supabase: null };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { error: workspace.error ?? "Compagnie introuvable.", companyId: null, supabase: null };
  return { error: null, companyId: workspace.companyId, supabase: await getSupabaseServerClient() };
}

export async function saveMaterialItem(input: z.input<typeof itemSchema>): Promise<MaterialActionResult & { itemId?: string }> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Matériel incomplet." };
  const ctx = await getContext();
  if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };

  const value = parsed.data;
  const payload = {
    company_id: ctx.companyId,
    show_id: value.showId,
    name: value.name,
    category: value.category,
    description: value.description || null,
    owner_contact_id: value.ownerContactId || null,
    owner_label: value.ownerLabel || null,
    default_responsible_contact_id: value.defaultResponsibleContactId || null,
    is_consumable: value.isConsumable,
    quantity_owned: value.quantityOwned,
    unit: value.unit,
    unit_cost: value.unitCost,
    photo_storage_path: value.photoStoragePath || null,
    photo_storage_provider: value.photoStorageProvider || null,
    notes: value.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (value.itemId) {
    const { error } = await ctx.supabase.from("show_material_items").update(payload).eq("id", value.itemId).eq("show_id", value.showId).eq("company_id", ctx.companyId);
    if (error) return { ok: false, message: error.message };
    revalidatePath(`/shows/${value.showId}`);
    return { ok: true, message: "Matériel mis à jour.", itemId: value.itemId };
  }

  const { data, error } = await ctx.supabase.from("show_material_items").insert(payload).select("id").single();
  if (error || !data) return { ok: false, message: error?.message ?? "Impossible d’ajouter le matériel." };
  revalidatePath(`/shows/${value.showId}`);
  return { ok: true, message: "Matériel ajouté au spectacle.", itemId: data.id };
}

export async function saveMaterialItemsBatch(input: z.input<typeof batchItemSchema>): Promise<MaterialActionResult & { items?: Array<{ id: string; index: number }> }> {
  const parsed = batchItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Liste de matériel incomplète." };
  const ctx = await getContext();
  if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const rows = parsed.data.items.map((item) => ({ company_id: ctx.companyId!, show_id: parsed.data.showId, name: item.name, category: item.category, owner_contact_id: item.ownerContactId || null, owner_label: item.ownerLabel || null, default_responsible_contact_id: item.defaultResponsibleContactId || null, is_consumable: item.isConsumable, quantity_owned: item.quantityOwned, unit: item.unit, unit_cost: item.unitCost }));
  const { data, error } = await ctx.supabase.from("show_material_items").insert(rows).select("id");
  if (error || !data) return { ok: false, message: error?.message ?? "Impossible d’ajouter la liste." };
  revalidatePath(`/shows/${parsed.data.showId}`);
  return { ok: true, message: `${data.length} objet(s) ajouté(s).`, items: data.map((row, index) => ({ id: row.id, index })) };
}

export async function saveMaterialRequirement(input: z.input<typeof requirementSchema>): Promise<MaterialActionResult & { requirementId?: string }> {
  const parsed = requirementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Préparation incomplète." };
  const ctx = await getContext();
  if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const value = parsed.data;
  const payload = {
    company_id: ctx.companyId,
    show_id: value.showId,
    material_item_id: value.itemId,
    performance_date: value.performanceDate,
    performance_time: value.performanceTime || null,
    venue: value.venue || null,
    quantity_needed: value.quantityNeeded,
    responsible_contact_id: value.responsibleContactId || null,
    status: value.status,
    notes: value.notes || null,
    updated_at: new Date().toISOString(),
  };
  if (value.requirementId) {
    const { error } = await ctx.supabase.from("show_material_requirements").update(payload).eq("id", value.requirementId).eq("show_id", value.showId).eq("company_id", ctx.companyId);
    if (error) return { ok: false, message: error.code === "23505" ? "Cet objet est déjà prévu pour cette date et cette heure." : error.message };
    revalidatePath(`/shows/${value.showId}`);
    return { ok: true, message: "Préparation mise à jour.", requirementId: value.requirementId };
  }
  const { data, error } = await ctx.supabase.from("show_material_requirements").insert(payload).select("id").single();
  if (error || !data) return { ok: false, message: error?.code === "23505" ? "Cet objet est déjà prévu pour cette date et cette heure." : error?.message ?? "Impossible d’ajouter cet objet à la date." };
  revalidatePath(`/shows/${value.showId}`);
  return { ok: true, message: "Objet ajouté à cette date.", requirementId: data.id };
}

export async function deleteMaterialItem(showId: string, itemId: string): Promise<MaterialActionResult> {
  if (!uuid.safeParse(showId).success || !uuid.safeParse(itemId).success) return { ok: false, message: "Matériel invalide." };
  const ctx = await getContext();
  if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const { data } = await ctx.supabase.from("show_material_items").select("photo_storage_path,photo_storage_provider").eq("id", itemId).eq("show_id", showId).eq("company_id", ctx.companyId).maybeSingle();
  const { error } = await ctx.supabase.from("show_material_items").delete().eq("id", itemId).eq("show_id", showId).eq("company_id", ctx.companyId);
  if (error) return { ok: false, message: error.message };
  if (data?.photo_storage_path && data.photo_storage_provider) await removePrivateObject(data.photo_storage_provider as StorageProvider, data.photo_storage_path).catch(() => undefined);
  revalidatePath(`/shows/${showId}`);
  return { ok: true, message: "Matériel retiré du spectacle." };
}

export async function deleteMaterialRequirement(showId: string, requirementId: string): Promise<MaterialActionResult> {
  if (!uuid.safeParse(showId).success || !uuid.safeParse(requirementId).success) return { ok: false, message: "Préparation invalide." };
  const ctx = await getContext();
  if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const { error } = await ctx.supabase.from("show_material_requirements").delete().eq("id", requirementId).eq("show_id", showId).eq("company_id", ctx.companyId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/shows/${showId}`);
  return { ok: true, message: "Objet retiré de cette date." };
}

export async function prepareMaterialPhotoUpload(input: { showId: string; fileName: string; fileSize: number; fileType: string }) {
  const parsed = z.object({ showId: uuid, fileName: z.string().trim().min(1).max(180), fileSize: z.number().int().positive(), fileType: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Image invalide." };
  const fileError = getPosterFileError({ size: parsed.data.fileSize, type: parsed.data.fileType });
  if (fileError) return { ok: false as const, message: fileError };
  const ctx = await getContext();
  if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false as const, message: ctx.error ?? "Accès refusé." };
  const { data: show } = await ctx.supabase.from("shows").select("id").eq("id", parsed.data.showId).eq("company_id", ctx.companyId).maybeSingle();
  if (!show) return { ok: false as const, message: "Spectacle introuvable." };
  const extension = parsed.data.fileType === "image/png" ? "png" : parsed.data.fileType === "image/webp" ? "webp" : "jpg";
  const storagePath = `${ctx.companyId}/shows/${parsed.data.showId}/materials/${crypto.randomUUID()}.${extension}`;
  try {
    const prepared = await preparePrivateUpload(storagePath, parsed.data.fileType);
    return { ok: true as const, message: "Envoi préparé.", storagePath, provider: prepared.provider, signedUrl: prepared.signedUrl };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Impossible de préparer l’image." };
  }
}

export async function sendMaterialReminderNow(showId: string, performanceDate: string): Promise<MaterialActionResult> {
  const parsed = z.object({ showId: uuid, performanceDate: z.string().date() }).safeParse({ showId, performanceDate });
  if (!parsed.success) return { ok: false, message: "Date invalide." };
  const ctx = await getContext();
  if (ctx.error || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  try {
    const result = await runMaterialReminders({ showId: parsed.data.showId, targetDate: parsed.data.performanceDate });
    revalidatePath(`/shows/${showId}`);
    if (result.sent > 0) return { ok: true, message: `${result.sent} rappel(s) envoyé(s). Consultez les emails locaux.` };
    if (result.skipped > 0) return { ok: true, message: "Les rappels de cette date ont déjà été envoyés." };
    if (result.missingEmails > 0) return { ok: false, message: "Aucun rappel envoyé : ajoutez une adresse email aux personnes responsables." };
    return { ok: false, message: "Aucun matériel avec une personne responsable pour cette date." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Envoi impossible." };
  }
}
