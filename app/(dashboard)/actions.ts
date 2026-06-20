"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/supabase/workspace";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import {
  opportunitySchema,
  reminderSchema,
  type OpportunityFormInput,
  type ReminderFormInput,
} from "@/lib/validation/pipeline";
import { showSchema, type ShowFormInput } from "@/lib/validation/show";
import { getDefaultProbability } from "@/lib/pipeline";
import type { PipelineStage } from "@/types";

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function createShow(values: ShowFormInput): Promise<ActionResult> {
  const parsed = showSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire spectacle contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : spectacle valide, non enregistre." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("shows").insert({
    company_id: workspace.companyId,
    title: parsed.data.title,
    discipline: parsed.data.discipline,
    status: parsed.data.status,
    next_date: parsed.data.nextDate || null,
    budget: parsed.data.budget ?? 0,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/shows");
  revalidatePath("/dashboard");

  return { ok: true, message: "Spectacle cree." };
}

export async function createContact(values: ContactFormValues): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire contact contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : contact valide, non enregistre." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("contacts").insert({
    company_id: workspace.companyId,
    name: parsed.data.name,
    organization: parsed.data.organization,
    role: parsed.data.role || null,
    email: parsed.data.email || null,
    city: parsed.data.city || null,
    status: parsed.data.status,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  return { ok: true, message: "Contact cree." };
}

export async function createOpportunity(values: OpportunityFormInput): Promise<ActionResult> {
  const parsed = opportunitySchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire opportunite contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : opportunite valide, non enregistree." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("opportunities").insert({
    company_id: workspace.companyId,
    title: parsed.data.title,
    contact_id: parsed.data.contactId || null,
    show_id: parsed.data.showId || null,
    stage: parsed.data.stage,
    value: parsed.data.value,
    probability: parsed.data.probability,
    next_action: parsed.data.nextAction || null,
    next_follow_up_at: parsed.data.nextFollowUpAt || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { ok: true, message: "Opportunite creee." };
}

export async function updateOpportunityStage(
  opportunityId: string,
  stage: PipelineStage,
): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : statut mis a jour." };
  }

  const supabase = await getSupabaseServerClient();
  const updates: {
    stage: PipelineStage;
    probability: number;
    next_follow_up_at?: string;
  } = {
    stage,
    probability: getDefaultProbability(stage),
  };

  if (stage === "Relance prevue") {
    updates.next_follow_up_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  const { error } = await supabase
    .from("opportunities")
    .update(updates)
    .eq("id", opportunityId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { ok: true, message: "Pipeline mis a jour." };
}

export async function createReminder(values: ReminderFormInput): Promise<ActionResult> {
  const parsed = reminderSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire relance contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : relance valide, non enregistree." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("reminders").insert({
    company_id: workspace.companyId,
    title: parsed.data.title,
    due_date: parsed.data.dueDate,
    related_to: parsed.data.relatedTo || null,
    priority: parsed.data.priority,
    opportunity_id: parsed.data.opportunityId || null,
    contact_id: parsed.data.contactId || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/reminders");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { ok: true, message: "Relance creee." };
}

export async function completeReminder(reminderId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : relance terminee." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("reminders")
    .update({ done: true, completed_at: new Date().toISOString() })
    .eq("id", reminderId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  return { ok: true, message: "Relance terminee." };
}
