"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/env";
import { requireWriteAccess } from "@/lib/supabase/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/supabase/workspace";
import type { Json } from "@/types/database.types";

export type RehearsalActionResult = { ok: boolean; message: string };
const uuid = z.string().uuid();

async function context() {
  const accessError = await requireWriteAccess();
  if (accessError) return { error: accessError, companyId: null, supabase: null };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { error: workspace.error ?? "Compagnie introuvable.", companyId: null, supabase: null };
  return { error: null, companyId: workspace.companyId, supabase: await getSupabaseServerClient() };
}

export async function addShowTeamMember(showId: string, contactId: string, jobTitle: string, characterName: string, alternateGroup: string): Promise<RehearsalActionResult> {
  const parsed = z.object({ showId: uuid, contactId: uuid, jobTitle: z.string().trim().min(2).max(80), characterName: z.string().trim().max(80), alternateGroup: z.string().trim().max(80) }).safeParse({ showId, contactId, jobTitle, characterName, alternateGroup });
  if (!parsed.success) return { ok: false, message: "Choisissez une personne et indiquez sa fonction." };
  if (!hasSupabaseEnv()) return { ok: false, message: "L’enregistrement demande une base Supabase locale." };
  const ctx = await context(); if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const { error } = await ctx.supabase.from("show_team_members").insert({ company_id: ctx.companyId, show_id: parsed.data.showId, contact_id: parsed.data.contactId, job_title: parsed.data.jobTitle, character_name: parsed.data.characterName || null, alternate_group: parsed.data.alternateGroup || null });
  if (error) return { ok: false, message: error.code === "23505" ? "Cette personne fait déjà partie de l’équipe." : error.message };
  revalidatePath(`/shows/${showId}`); return { ok: true, message: "Personne ajoutée à l’équipe." };
}

export async function removeShowTeamMember(showId: string, memberId: string): Promise<RehearsalActionResult> {
  if (!uuid.safeParse(memberId).success || !hasSupabaseEnv()) return { ok: false, message: "Membre invalide." };
  const ctx = await context(); if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  if (!uuid.safeParse(showId).success) return { ok: false, message: "Spectacle invalide." };
  const { error } = await ctx.supabase.from("show_team_members").delete().eq("id", memberId).eq("show_id", showId).eq("company_id", ctx.companyId);
  if (error) return { ok: false, message: error.message }; revalidatePath(`/shows/${showId}`); return { ok: true, message: "Personne retirée de l’équipe." };
}

const pollSchema = z.object({ showId: uuid, title: z.string().trim().min(3).max(120), defaultLocation: z.string().trim().max(160), deadline: z.string().optional(), showResponses: z.boolean(), teamMemberIds: z.array(uuid).min(1), slots: z.array(z.object({ date: z.string().date(), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), location: z.string().trim().max(160) })).min(1).max(180) });

export async function createRehearsalPoll(input: z.input<typeof pollSchema>): Promise<RehearsalActionResult> {
  const parsed = pollSchema.safeParse(input); if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Sondage incomplet." };
  if (parsed.data.slots.some((slot) => slot.endTime <= slot.startTime)) return { ok: false, message: "Chaque heure de fin doit être après l’heure de début." };
  if (!hasSupabaseEnv()) return { ok: false, message: "L’enregistrement demande une base Supabase locale." };
  const ctx = await context(); if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const { error } = await ctx.supabase.rpc("create_rehearsal_poll", { p_show_id: parsed.data.showId, p_title: parsed.data.title, p_default_location: parsed.data.defaultLocation, p_deadline: parsed.data.deadline || null, p_show_responses: parsed.data.showResponses, p_team_member_ids: parsed.data.teamMemberIds, p_slots: parsed.data.slots as Json });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/shows/${parsed.data.showId}`); return { ok: true, message: "Sondage créé. Le lien est prêt à être partagé." };
}

export async function confirmRehearsalSlots(showId: string, pollId: string, slotIds: string[]): Promise<RehearsalActionResult> {
  const parsed = z.object({ showId: uuid, pollId: uuid, slotIds: z.array(uuid).min(1) }).safeParse({ showId, pollId, slotIds }); if (!parsed.success) return { ok: false, message: "Sélectionnez au moins un créneau." };
  const ctx = await context(); if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const { error } = await ctx.supabase.rpc("confirm_rehearsal_slots", { p_show_id: showId, p_poll_id: pollId, p_slot_ids: slotIds });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/shows/${showId}`); revalidatePath("/calendar"); return { ok: true, message: "Répétition(s) confirmée(s) dans l’agenda." };
}

export async function updateRehearsalSlotLocations(showId: string, pollId: string, slotIds: string[], location: string): Promise<RehearsalActionResult> {
  const parsed = z.object({ showId: uuid, pollId: uuid, slotIds: z.array(uuid).min(1).max(180), location: z.string().trim().max(160) }).safeParse({ showId, pollId, slotIds, location });
  if (!parsed.success) return { ok: false, message: "Sélectionnez les créneaux et indiquez un lieu valide." };
  const ctx = await context(); if (ctx.error || !ctx.supabase || !ctx.companyId) return { ok: false, message: ctx.error ?? "Accès refusé." };
  const { data: poll } = await ctx.supabase.from("rehearsal_polls").select("id").eq("id", pollId).eq("show_id", showId).eq("company_id", ctx.companyId).maybeSingle();
  if (!poll) return { ok: false, message: "Sondage introuvable." };
  const { error } = await ctx.supabase.from("rehearsal_slots").update({ location: parsed.data.location || null }).eq("poll_id", pollId).eq("company_id", ctx.companyId).in("id", parsed.data.slotIds);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/shows/${showId}`); revalidatePath(`/repetitions`); return { ok: true, message: `Lieu mis à jour pour ${slotIds.length} créneau(x).` };
}
