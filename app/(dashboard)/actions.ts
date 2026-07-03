"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/supabase/workspace";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import {
  showDocumentSchema,
  type ShowDocumentFormInput,
} from "@/lib/validation/document";
import {
  fixedCostSchema,
  type FixedCostFormInput,
} from "@/lib/validation/finance";
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

function getDateAfterDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function ensureOpportunityReminder({
  contactId,
  companyId,
  dueDate,
  opportunityId,
  priority = "normal",
  relatedTo,
  title,
}: {
  contactId?: string | null;
  companyId: string;
  dueDate: string;
  opportunityId: string;
  priority?: "low" | "normal" | "high";
  relatedTo: string;
  title: string;
}) {
  const supabase = await getSupabaseServerClient();
  const { data: existingReminder, error: lookupError } = await supabase
    .from("reminders")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("done", false)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, message: lookupError.message };
  }

  if (existingReminder) {
    const { error } = await supabase
      .from("reminders")
      .update({
        title,
        due_date: dueDate,
        related_to: relatedTo,
        priority,
        contact_id: contactId ?? null,
      })
      .eq("id", existingReminder.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "Relance existante replanifiee." };
  }

  const { error } = await supabase.from("reminders").insert({
    company_id: companyId,
    title,
    due_date: dueDate,
    related_to: relatedTo,
    priority,
    opportunity_id: opportunityId,
    contact_id: contactId ?? null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Relance creee." };
}

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
    poster_url: parsed.data.posterUrl || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/shows");
  revalidatePath("/dashboard");

  return { ok: true, message: "Spectacle cree." };
}

export async function createShowDocument(values: ShowDocumentFormInput): Promise<ActionResult> {
  const parsed = showDocumentSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire document contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : document valide, non enregistre." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("show_documents").insert({
    company_id: workspace.companyId,
    show_id: parsed.data.showId,
    title: parsed.data.title,
    document_type: parsed.data.documentType,
    status: parsed.data.status,
    file_url: parsed.data.fileUrl || null,
    notes: parsed.data.notes || null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/shows/${parsed.data.showId}`);
  revalidatePath("/shows");
  revalidatePath("/documents");
  revalidatePath("/dashboard");

  return { ok: true, message: "Document ajoute au spectacle." };
}

export async function createFixedCost(values: FixedCostFormInput): Promise<ActionResult> {
  const parsed = fixedCostSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire frais fixe contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : frais fixe valide, non enregistre." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("fixed_costs").insert({
    company_id: workspace.companyId,
    label: parsed.data.label,
    category: parsed.data.category,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    next_due_date: parsed.data.nextDueDate,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/billing");
  revalidatePath("/calendar");

  return { ok: true, message: "Frais fixe ajoute." };
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

export async function importContacts(
  values: ContactFormValues[],
): Promise<ActionResult & { imported: number; skipped: number }> {
  const limitedValues = values.slice(0, 500);
  const parsedContacts = limitedValues
    .map((value) => contactSchema.safeParse(value))
    .filter((result): result is { success: true; data: ContactFormValues } => result.success)
    .map((result) => result.data);
  const skipped = values.length - parsedContacts.length;

  if (parsedContacts.length === 0) {
    return {
      ok: false,
      imported: 0,
      skipped: values.length,
      message: "Aucun contact valide a importer.",
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      imported: parsedContacts.length,
      skipped,
      message: `Mode demo : ${parsedContacts.length} contact(s) CSV valide(s), non enregistre(s).`,
    };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return {
      ok: false,
      imported: 0,
      skipped: values.length,
      message: workspace.error ?? "Compagnie introuvable.",
    };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("contacts").insert(
    parsedContacts.map((contact) => ({
      company_id: workspace.companyId,
      name: contact.name,
      organization: contact.organization,
      role: contact.role || null,
      email: contact.email || null,
      city: contact.city || null,
      status: contact.status,
    })),
  );

  if (error) {
    return { ok: false, imported: 0, skipped: values.length, message: error.message };
  }

  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return {
    ok: true,
    imported: parsedContacts.length,
    skipped,
    message:
      skipped > 0
        ? `${parsedContacts.length} contact(s) importe(s), ${skipped} ligne(s) ignoree(s).`
        : `${parsedContacts.length} contact(s) importe(s).`,
  };
}

export async function createOpportunityWithNewContact(
  values: OpportunityFormInput,
  contactValues: ContactFormValues,
): Promise<ActionResult> {
  const parsedOpportunity = opportunitySchema.safeParse(values);
  const parsedContact = contactSchema.safeParse(contactValues);

  if (!parsedOpportunity.success || !parsedContact.success) {
    return { ok: false, message: "Le formulaire contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : contact et opportunite valides, non enregistres." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      company_id: workspace.companyId,
      name: parsedContact.data.name,
      organization: parsedContact.data.organization,
      role: parsedContact.data.role || null,
      email: parsedContact.data.email || null,
      city: parsedContact.data.city || null,
      status: parsedContact.data.status,
    })
    .select("id")
    .single();

  if (error || !contact) {
    return { ok: false, message: error?.message ?? "Contact non cree." };
  }

  return createOpportunity({
    ...parsedOpportunity.data,
    contactId: contact.id,
  });
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
  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .insert({
      company_id: workspace.companyId,
      title: parsed.data.title,
      contact_id: parsed.data.contactId || null,
      show_id: parsed.data.showId || null,
      stage: parsed.data.stage,
      value: parsed.data.value,
      probability: parsed.data.probability,
      next_action: parsed.data.nextAction || null,
      next_follow_up_at: parsed.data.nextFollowUpAt || null,
      lost_reason: parsed.data.stage === "Perdu" ? parsed.data.lostReason || null : null,
    })
    .select("id")
    .single();

  if (error || !opportunity) {
    return { ok: false, message: error?.message ?? "Opportunite non creee." };
  }

  if (parsed.data.nextFollowUpAt) {
    await ensureOpportunityReminder({
      companyId: workspace.companyId,
      title: parsed.data.nextAction || `Relancer ${parsed.data.title}`,
      dueDate: parsed.data.nextFollowUpAt,
      relatedTo: parsed.data.title,
      priority: parsed.data.probability >= 60 ? "high" : "normal",
      opportunityId: opportunity.id,
      contactId: parsed.data.contactId || null,
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: parsed.data.nextFollowUpAt
      ? "Opportunite creee avec relance."
      : "Opportunite creee.",
  };
}

export async function updateOpportunity(
  opportunityId: string,
  values: OpportunityFormInput,
): Promise<ActionResult> {
  const parsed = opportunitySchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire opportunite contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : opportunite mise a jour." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("opportunities")
    .update({
      title: parsed.data.title,
      contact_id: parsed.data.contactId || null,
      show_id: parsed.data.showId || null,
      stage: parsed.data.stage,
      value: parsed.data.value,
      probability: parsed.data.probability,
      next_action: parsed.data.nextAction || null,
      next_follow_up_at: parsed.data.nextFollowUpAt || null,
      lost_reason: parsed.data.stage === "Perdu" ? parsed.data.lostReason || null : null,
    })
    .eq("id", opportunityId);

  if (error) {
    return { ok: false, message: error.message };
  }

  if (parsed.data.nextFollowUpAt && parsed.data.stage !== "Confirme" && parsed.data.stage !== "Perdu") {
    const workspace = await getOrCreateWorkspace();

    if (workspace.companyId) {
      await ensureOpportunityReminder({
        companyId: workspace.companyId,
        title: parsed.data.nextAction || `Relancer ${parsed.data.title}`,
        dueDate: parsed.data.nextFollowUpAt,
        relatedTo: parsed.data.title,
        priority: parsed.data.probability >= 60 ? "high" : "normal",
        opportunityId,
        contactId: parsed.data.contactId || null,
      });
    }
  }

  if (parsed.data.stage === "Confirme" || parsed.data.stage === "Perdu") {
    await supabase
      .from("reminders")
      .update({ done: true, completed_at: new Date().toISOString() })
      .eq("opportunity_id", opportunityId)
      .eq("done", false);
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  return { ok: true, message: "Opportunite mise a jour." };
}

export async function createQuoteFromOpportunity(
  opportunityId: string,
): Promise<ActionResult & { quoteId?: string }> {
  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      quoteId: `quote-${opportunityId}`,
      message: "Mode demo : devis prepare depuis l'opportunite.",
    };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { data: existingQuote, error: existingQuoteError } = await supabase
    .from("quotes")
    .select("id,number")
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (existingQuoteError) {
    return { ok: false, message: existingQuoteError.message };
  }

  if (existingQuote) {
    revalidatePath("/billing");
    revalidatePath("/finances");

    return {
      ok: true,
      quoteId: existingQuote.id,
      message: `Devis deja existant : ${existingQuote.number}.`,
    };
  }

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id,title,value,contact_id,contacts(name,organization)")
    .eq("id", opportunityId)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    return { ok: false, message: opportunityError?.message ?? "Opportunite introuvable." };
  }

  const { count, error: countError } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return { ok: false, message: countError.message };
  }

  const amount = opportunity.value ?? 0;
  const depositDue = Math.round(amount * 0.3);
  const nextIndex = (count ?? 0) + 1;
  const number = `DEV-${new Date().getFullYear()}-${nextIndex.toString().padStart(3, "0")}`;
  const organization =
    opportunity.contacts?.organization || opportunity.contacts?.name || "Structure a renseigner";

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      company_id: workspace.companyId,
      opportunity_id: opportunity.id,
      number,
      title: opportunity.title,
      organization,
      amount,
      deposit_due: depositDue,
      balance_due: Math.max(0, amount - depositDue),
      status: "A preparer",
      due_date: getDateAfterDays(15),
    })
    .select("id")
    .single();

  if (error || !quote) {
    return { ok: false, message: error?.message ?? "Devis non cree." };
  }

  revalidatePath("/billing");
  revalidatePath("/finances");
  revalidatePath("/contracts");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { ok: true, quoteId: quote.id, message: `Devis ${number} cree.` };
}

export async function deleteOpportunity(opportunityId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : opportunite supprimee." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("opportunities").delete().eq("id", opportunityId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  return { ok: true, message: "Opportunite supprimee." };
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
    lost_reason?: string | null;
  } = {
    stage,
    probability: getDefaultProbability(stage),
  };

  const followUpDate = getDateAfterDays(7);

  if (stage === "Relance prevue") {
    updates.next_follow_up_at = followUpDate;
  }

  if (stage !== "Perdu") {
    updates.lost_reason = null;
  }

  const { error } = await supabase
    .from("opportunities")
    .update(updates)
    .eq("id", opportunityId);

  if (error) {
    return { ok: false, message: error.message };
  }

  if (stage === "Relance prevue") {
    const workspace = await getOrCreateWorkspace();
    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("id,title,contact_id,next_action")
      .eq("id", opportunityId)
      .single();

    if (opportunity && workspace.companyId) {
      await ensureOpportunityReminder({
        companyId: workspace.companyId,
        title: opportunity.next_action || `Relancer ${opportunity.title}`,
        dueDate: followUpDate,
        relatedTo: opportunity.title,
        priority: "normal",
        opportunityId: opportunity.id,
        contactId: opportunity.contact_id,
      });
    }
  }

  if (stage === "Confirme" || stage === "Perdu") {
    await supabase
      .from("reminders")
      .update({ done: true, completed_at: new Date().toISOString() })
      .eq("opportunity_id", opportunityId)
      .eq("done", false);
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  return { ok: true, message: "Pipeline mis a jour." };
}

export async function scheduleOpportunityFollowUp(
  opportunityId: string,
  days: 3 | 7,
): Promise<ActionResult & { dueDate?: string }> {
  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: `Mode demo : relance planifiee a J+${days}.`,
      dueDate: getDateAfterDays(days),
    };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const dueDate = getDateAfterDays(days);
  const supabase = await getSupabaseServerClient();
  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id,title,contact_id,next_action,stage")
    .eq("id", opportunityId)
    .single();

  if (opportunityError || !opportunity) {
    return { ok: false, message: opportunityError?.message ?? "Opportunite introuvable." };
  }

  if (opportunity.stage === "Confirme" || opportunity.stage === "Perdu") {
    return { ok: false, message: "Impossible de replanifier une opportunite fermee." };
  }

  const { error } = await supabase
    .from("opportunities")
    .update({
      next_follow_up_at: dueDate,
      stage: opportunity.stage === "A qualifier" ? "Relance prevue" : opportunity.stage,
    })
    .eq("id", opportunityId);

  if (error) {
    return { ok: false, message: error.message };
  }

  const reminderResult = await ensureOpportunityReminder({
    companyId: workspace.companyId,
    title: opportunity.next_action || `Relancer ${opportunity.title}`,
    dueDate,
    relatedTo: opportunity.title,
    priority: days === 3 ? "high" : "normal",
    opportunityId: opportunity.id,
    contactId: opportunity.contact_id,
  });

  if (!reminderResult.ok) {
    return reminderResult;
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: days === 3 ? "Relance prioritaire planifiee a J+3." : "Relance planifiee a J+7.",
    dueDate,
  };
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

  if (parsed.data.opportunityId) {
    const { data: existingReminder, error: lookupError } = await supabase
      .from("reminders")
      .select("id")
      .eq("opportunity_id", parsed.data.opportunityId)
      .eq("done", false)
      .maybeSingle();

    if (lookupError) {
      return { ok: false, message: lookupError.message };
    }

    if (existingReminder) {
      return { ok: true, message: "Relance deja ouverte pour cette opportunite." };
    }
  }

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
