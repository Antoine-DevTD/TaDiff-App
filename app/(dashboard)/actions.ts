"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { hasSupabaseEnv } from "@/lib/env";
import { requireManagerAccess, requireWriteAccess } from "@/lib/supabase/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/supabase/workspace";
import { calendarEventSchema, type CalendarEventInput } from "@/lib/validation/calendar";
import { companyProfileSchema, type CompanyProfileInput } from "@/lib/validation/company";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import {
  documentUploadRequestSchema,
  showDocumentSchema,
  type DocumentUploadRequest,
  type ShowDocumentFormInput,
} from "@/lib/validation/document";
import { getDocumentFileError, sanitizeDocumentFilename } from "@/lib/documents-upload";
import { getPosterFileError } from "@/lib/poster-upload";
import { quoteSchema, type QuoteFormInput } from "@/lib/validation/billing";
import {
  grantSchema,
  grantStatuses,
  type GrantFormInput,
} from "@/lib/validation/grant";
import {
  patronageSchema,
  patronageStatuses,
  type PatronageFormInput,
} from "@/lib/validation/patronage";
import { referenceGrants } from "@/data/reference-grants";
import type { PatronageStatus } from "@/types";
import {
  demoCompanyName,
  demoContacts,
  demoDate,
  demoDocuments,
  demoFixedCosts,
  demoGrants,
  demoOpportunities,
  demoPatronageDeals,
  demoQuotes,
  demoReminders,
  demoShows,
  demoTreasury,
} from "@/data/demo-company";
import type { GrantStatus } from "@/types";
import {
  fixedCostSchema,
  treasuryBalanceSchema,
  type FixedCostFormInput,
  type TreasuryBalanceFormInput,
} from "@/lib/validation/finance";
import {
  opportunitySchema,
  reminderSchema,
  type OpportunityFormInput,
  type ReminderFormInput,
} from "@/lib/validation/pipeline";
import { showSchema, type ShowFormInput } from "@/lib/validation/show";
import { feedbackSchema, type FeedbackFormInput } from "@/lib/validation/feedback";
import { getDefaultProbability } from "@/lib/pipeline";
import type { PipelineStage } from "@/types";

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function submitFeedback(values: FeedbackFormInput): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Merci de completer le message." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : retour bien recu (non enregistre)." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("submit_feedback", {
    feedback_kind: parsed.data.kind,
    feedback_message: parsed.data.message,
    feedback_page: parsed.data.page || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Merci, votre retour a bien ete envoye." };
}

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

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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

  await logActivity("a cree le spectacle", "spectacle", parsed.data.title);

  revalidatePath("/shows");
  revalidatePath("/dashboard");

  return { ok: true, message: "Spectacle cree." };
}

export async function updateShow(showId: string, values: ShowFormInput): Promise<ActionResult> {
  const parsed = showSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire spectacle contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : spectacle mis a jour, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("shows")
    .update({
      title: parsed.data.title,
      discipline: parsed.data.discipline,
      status: parsed.data.status,
      next_date: parsed.data.nextDate || null,
      budget: parsed.data.budget ?? 0,
      poster_url: parsed.data.posterUrl || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", showId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/shows");
  revalidatePath(`/shows/${showId}`);
  revalidatePath("/pipeline");
  revalidatePath("/documents");
  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity("a modifie le spectacle", "spectacle", parsed.data.title);

  return { ok: true, message: "Spectacle mis a jour." };
}

export async function deleteShow(showId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : spectacle supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();

  // Les documents lies sont supprimes en cascade : on nettoie d'abord
  // leurs fichiers stockes pour ne pas laisser d'orphelins dans le bucket.
  const storagePrefix = `${workspace.companyId}/${showId}`;
  const { data: storedFiles } = await supabase.storage
    .from("documents")
    .list(storagePrefix, { limit: 1000 });

  if (storedFiles && storedFiles.length > 0) {
    await supabase.storage
      .from("documents")
      .remove(storedFiles.map((file) => `${storagePrefix}/${file.name}`));
  }

  const { error } = await supabase.from("shows").delete().eq("id", showId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/shows");
  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/documents");
  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity("a supprime un spectacle", "spectacle");

  return { ok: true, message: "Spectacle supprime, dates detachees." };
}

export async function updateContact(
  contactId: string,
  values: ContactFormValues,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire contact contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : contact mis a jour, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      name: parsed.data.name,
      organization: parsed.data.organization,
      role: parsed.data.role || null,
      email: parsed.data.email || null,
      city: parsed.data.city || null,
      status: parsed.data.status,
    })
    .eq("id", contactId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  await logActivity("a modifie le contact", "contact", parsed.data.name);

  return { ok: true, message: "Contact mis a jour." };
}

export async function deleteContact(contactId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : contact supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  await logActivity("a supprime un contact", "contact");

  return { ok: true, message: "Contact supprime, dates et relances detachees." };
}

export async function updateFixedCost(
  fixedCostId: string,
  values: FixedCostFormInput,
): Promise<ActionResult> {
  const parsed = fixedCostSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire frais fixe contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : frais fixe mis a jour, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("fixed_costs")
    .update({
      label: parsed.data.label,
      category: parsed.data.category,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      next_due_date: parsed.data.nextDueDate,
      notes: parsed.data.notes || null,
    })
    .eq("id", fixedCostId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/finances");
  revalidatePath("/billing");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  await logActivity("a modifie le frais fixe", "frais fixe", parsed.data.label);

  return { ok: true, message: "Frais fixe mis a jour." };
}

export async function deleteFixedCost(fixedCostId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : frais fixe supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("fixed_costs").delete().eq("id", fixedCostId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/finances");
  revalidatePath("/billing");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  await logActivity("a supprime un frais fixe", "frais fixe");

  return { ok: true, message: "Frais fixe supprime." };
}

export async function deleteReminder(reminderId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : relance supprimee." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("reminders").delete().eq("id", reminderId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/reminders");
  revalidatePath("/pipeline");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  await logActivity("a supprime une relance", "relance");

  return { ok: true, message: "Relance supprimee." };
}

export async function createShowDocument(values: ShowDocumentFormInput): Promise<ActionResult> {
  const parsed = showDocumentSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire document contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : document valide, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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
    storage_path: parsed.data.storagePath || null,
    notes: parsed.data.notes || null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/shows/${parsed.data.showId}`);
  revalidatePath("/shows");
  revalidatePath("/documents");
  revalidatePath("/subventions");
  revalidatePath("/dashboard");

  await logActivity("a ajoute le document", "document", parsed.data.title);

  return { ok: true, message: "Document ajoute au spectacle." };
}

export async function prepareDocumentUpload(
  values: DocumentUploadRequest,
): Promise<ActionResult & { signedUrl?: string; storagePath?: string }> {
  const parsed = documentUploadRequestSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "La demande d'upload n'est pas valide." };
  }

  const fileError = getDocumentFileError({
    size: parsed.data.fileSize,
    type: parsed.data.fileType,
  });

  if (fileError) {
    return { ok: false, message: fileError };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      message: "Mode demo : l'upload de fichier demande une base Supabase connectee.",
    };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const storagePath = `${workspace.companyId}/${parsed.data.showId}/${crypto.randomUUID()}-${sanitizeDocumentFilename(parsed.data.fileName)}`;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Impossible de preparer l'upload." };
  }

  return {
    ok: true,
    message: "Upload pret.",
    signedUrl: data.signedUrl,
    storagePath,
  };
}

export async function updateCompanyProfile(
  values: CompanyProfileInput,
): Promise<ActionResult> {
  const parsed = companyProfileSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le profil compagnie contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : profil valide sans enregistrement." };
  }

  const accessError = await requireManagerAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      city: parsed.data.city || null,
      discipline: parsed.data.discipline || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      siret: parsed.data.siret || null,
      license_number: parsed.data.licenseNumber || null,
      logo_url: parsed.data.logoUrl || null,
      description: parsed.data.description || null,
    })
    .eq("id", workspace.companyId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  await logActivity("a mis a jour le profil de la compagnie", "company", parsed.data.name);

  return { ok: true, message: "Profil de la compagnie enregistre." };
}

export async function createCalendarEvent(
  values: CalendarEventInput,
): Promise<ActionResult> {
  const parsed = calendarEventSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "L'evenement contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : evenement valide sans enregistrement." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("calendar_events").insert({
    company_id: workspace.companyId,
    title: parsed.data.title,
    event_date: parsed.data.eventDate,
    kind: parsed.data.kind,
    related_show_id: parsed.data.relatedShowId || null,
    note: parsed.data.note || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  await logActivity("a ajoute un evenement a l agenda", "calendar", parsed.data.title);

  return { ok: true, message: "Evenement ajoute a l'agenda." };
}

export async function deleteCalendarEvent(eventId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : evenement supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/calendar");
  return { ok: true, message: "Evenement supprime." };
}

export async function setMemberRole(
  targetUserId: string,
  newRole: string,
): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : role non modifie." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_member_role", {
    target_user_id: targetUserId,
    new_role: newRole,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  await logActivity("a change le role d un membre", "team", newRole);

  return { ok: true, message: "Role mis a jour." };
}

export async function joinCompanyByCode(code: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Mode demo : rejoindre une compagnie demande Supabase." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_company_by_code", { code });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { ok: true, message: `Vous avez rejoint ${data ?? "la compagnie"}.` };
}

export async function regenerateInviteCode(): Promise<ActionResult & { code?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo.", code: "DEMO1234" };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("regenerate_invite_code");

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");

  return { ok: true, message: "Nouveau code genere.", code: data ?? undefined };
}

export async function prepareShowPosterUpload(values: {
  showId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}): Promise<ActionResult & { signedUrl?: string; publicUrl?: string; storagePath?: string }> {
  const fileError = getPosterFileError({ size: values.fileSize, type: values.fileType });

  if (fileError) {
    return { ok: false, message: fileError };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      message: "Mode demo : l'upload d'affiche demande une base Supabase connectee.",
    };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const showSegment = values.showId || "sans-spectacle";
  const storagePath = `${workspace.companyId}/${showSegment}/${crypto.randomUUID()}-${sanitizeDocumentFilename(values.fileName)}`;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("posters")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Impossible de preparer l'upload." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("posters").getPublicUrl(storagePath);

  return {
    ok: true,
    message: "Upload pret.",
    signedUrl: data.signedUrl,
    publicUrl,
    storagePath,
  };
}

export async function deleteShowDocument(documentId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : document supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { data: document, error: lookupError } = await supabase
    .from("show_documents")
    .select("id,show_id,title,storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (lookupError || !document) {
    return { ok: false, message: lookupError?.message ?? "Document introuvable." };
  }

  if (document.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([document.storage_path]);

    if (storageError) {
      return { ok: false, message: storageError.message };
    }
  }

  const { error } = await supabase.from("show_documents").delete().eq("id", documentId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/shows/${document.show_id}`);
  revalidatePath("/shows");
  revalidatePath("/documents");
  revalidatePath("/subventions");
  revalidatePath("/dashboard");

  await logActivity("a supprime le document", "document", document.title);

  return { ok: true, message: "Document supprime." };
}

export async function createFixedCost(values: FixedCostFormInput): Promise<ActionResult> {
  const parsed = fixedCostSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire frais fixe contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : frais fixe valide, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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

  await logActivity("a ajoute le frais fixe", "frais fixe", parsed.data.label);

  return { ok: true, message: "Frais fixe ajoute." };
}

export async function recordTreasuryBalance(
  values: TreasuryBalanceFormInput,
): Promise<ActionResult> {
  const parsed = treasuryBalanceSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le solde saisi n'est pas valide." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : solde valide, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("treasury_snapshots").insert({
    company_id: workspace.companyId,
    balance: parsed.data.balance,
    note: parsed.data.note || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity(
    "a mis a jour le solde de tresorerie",
    "tresorerie",
    `${parsed.data.balance.toLocaleString("fr-FR")} EUR`,
  );

  return { ok: true, message: "Solde de tresorerie mis a jour." };
}

export async function createContact(values: ContactFormValues): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire contact contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : contact valide, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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

  await logActivity("a cree le contact", "contact", parsed.data.name);

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

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, imported: 0, skipped: values.length, message: accessError };
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

  await logActivity(
    "a importe des contacts CSV",
    "contact",
    `${parsedContacts.length} contact(s)`,
  );

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
    return { ok: true, message: "Mode demo : contact et date valides, non enregistres." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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
    return { ok: false, message: "Le formulaire de date contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : date valide, non enregistree." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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
    return { ok: false, message: error?.message ?? "Date non creee." };
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

  await logActivity("a cree la date possible", "diffusion", parsed.data.title);

  return {
    ok: true,
    message: parsed.data.nextFollowUpAt
      ? "Date creee avec relance."
      : "Date creee.",
  };
}

export async function updateOpportunity(
  opportunityId: string,
  values: OpportunityFormInput,
): Promise<ActionResult> {
  const parsed = opportunitySchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire de date contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : date mise a jour." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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

  await logActivity("a modifie la date possible", "diffusion", parsed.data.title);

  return { ok: true, message: "Date mise a jour." };
}

export async function createQuoteFromOpportunity(
  opportunityId: string,
): Promise<ActionResult & { quoteId?: string }> {
  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      quoteId: `quote-${opportunityId}`,
      message: "Mode demo : devis prepare depuis la date.",
    };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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
    return { ok: false, message: opportunityError?.message ?? "Date introuvable." };
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

  await logActivity("a cree le devis", "devis", number);

  return { ok: true, quoteId: quote.id, message: `Devis ${number} cree.` };
}

export async function updateQuote(
  quoteId: string,
  values: QuoteFormInput,
): Promise<ActionResult> {
  const parsed = quoteSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire devis contient des erreurs." };
  }

  if (parsed.data.depositDue + parsed.data.balanceDue > parsed.data.amount) {
    return {
      ok: false,
      message: "Acompte + solde ne peuvent pas depasser le montant total.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : devis mis a jour, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("quotes")
    .update({
      title: parsed.data.title,
      organization: parsed.data.organization,
      status: parsed.data.status,
      amount: parsed.data.amount,
      deposit_due: parsed.data.depositDue,
      balance_due: parsed.data.balanceDue,
      due_date: parsed.data.dueDate || null,
    })
    .eq("id", quoteId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/billing");
  revalidatePath(`/billing/${quoteId}`);
  revalidatePath("/finances");
  revalidatePath("/contracts");
  revalidatePath("/dashboard");

  await logActivity("a modifie le devis", "devis", parsed.data.title);

  return { ok: true, message: "Devis mis a jour." };
}

export async function deleteQuote(quoteId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : devis supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("quotes").delete().eq("id", quoteId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/billing");
  revalidatePath("/finances");
  revalidatePath("/contracts");
  revalidatePath("/dashboard");

  await logActivity("a supprime un devis", "devis");

  return { ok: true, message: "Devis supprime." };
}

export async function deleteOpportunity(opportunityId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : date supprimee." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("opportunities").delete().eq("id", opportunityId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  await logActivity("a supprime une date possible", "diffusion");

  return { ok: true, message: "Date supprimee." };
}

export async function updateOpportunityStage(
  opportunityId: string,
  stage: PipelineStage,
): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : statut mis a jour." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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

  await logActivity("a change le statut d'une date", "diffusion", stage);

  return { ok: true, message: "Diffusion mise a jour." };
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

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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
    return { ok: false, message: opportunityError?.message ?? "Date introuvable." };
  }

  if (opportunity.stage === "Confirme" || opportunity.stage === "Perdu") {
    return { ok: false, message: "Impossible de replanifier une date fermee." };
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

  await logActivity("a planifie une relance", "diffusion", opportunity.title);

  return {
    ok: true,
    message: days === 3 ? "Relance prioritaire planifiee a J+3." : "Relance planifiee a J+7.",
    dueDate,
  };
}

export async function seedDemoCompany(): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      message: "Mode demo : les donnees mock sont deja affichees sans Supabase.",
    };
  }

  const accessError = await requireManagerAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();

  // Garde-fou : ne jamais injecter la demo dans un espace deja utilise.
  const [{ count: showCount }, { count: contactCount }] = await Promise.all([
    supabase.from("shows").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
  ]);

  if ((showCount ?? 0) > 0 || (contactCount ?? 0) > 0) {
    return {
      ok: false,
      message:
        "Cet espace contient deja des spectacles ou des contacts. Utilisez un compte vierge pour la compagnie de demonstration.",
    };
  }

  const companyId = workspace.companyId;

  const { error: companyError } = await supabase
    .from("companies")
    .update({ name: demoCompanyName })
    .eq("id", companyId);

  if (companyError) {
    return { ok: false, message: companyError.message };
  }

  const { data: insertedShows, error: showsError } = await supabase
    .from("shows")
    .insert(
      demoShows.map((show) => ({
        company_id: companyId,
        title: show.title,
        discipline: show.discipline,
        status: show.status,
        next_date: show.nextDateInDays === null ? null : demoDate(show.nextDateInDays),
        budget: show.budget,
        poster_url: show.posterUrl,
        notes: show.notes,
      })),
    )
    .select("id,title");

  if (showsError || !insertedShows) {
    return { ok: false, message: showsError?.message ?? "Spectacles demo non crees." };
  }

  const showIdByKey = new Map(
    demoShows.map((show) => [
      show.key,
      insertedShows.find((inserted) => inserted.title === show.title)?.id ?? null,
    ]),
  );

  const { data: insertedContacts, error: contactsError } = await supabase
    .from("contacts")
    .insert(
      demoContacts.map((contact) => ({
        company_id: companyId,
        name: contact.name,
        organization: contact.organization,
        role: contact.role,
        email: contact.email,
        city: contact.city,
        status: contact.status,
      })),
    )
    .select("id,name");

  if (contactsError || !insertedContacts) {
    return { ok: false, message: contactsError?.message ?? "Contacts demo non crees." };
  }

  const contactIdByKey = new Map(
    demoContacts.map((contact) => [
      contact.key,
      insertedContacts.find((inserted) => inserted.name === contact.name)?.id ?? null,
    ]),
  );

  const { data: insertedOpportunities, error: opportunitiesError } = await supabase
    .from("opportunities")
    .insert(
      demoOpportunities.map((opportunity) => ({
        company_id: companyId,
        contact_id: contactIdByKey.get(opportunity.contactKey) ?? null,
        show_id: showIdByKey.get(opportunity.showKey) ?? null,
        title: opportunity.title,
        stage: opportunity.stage,
        value: opportunity.value,
        probability: opportunity.probability,
        next_action: opportunity.nextAction || null,
        next_follow_up_at:
          opportunity.nextFollowUpInDays === null
            ? null
            : demoDate(opportunity.nextFollowUpInDays),
        lost_reason:
          opportunity.stage === "Perdu" ? "Programmation complete sur la saison." : null,
      })),
    )
    .select("id,title");

  if (opportunitiesError || !insertedOpportunities) {
    return {
      ok: false,
      message: opportunitiesError?.message ?? "Dates demo non creees.",
    };
  }

  const opportunityIdByTitle = new Map(
    insertedOpportunities.map((opportunity) => [opportunity.title, opportunity.id]),
  );

  const { error: remindersError } = await supabase.from("reminders").insert(
    demoReminders.map((reminder) => ({
      company_id: companyId,
      title: reminder.title,
      due_date: demoDate(reminder.dueInDays),
      related_to: reminder.relatedTo,
      priority: reminder.priority,
      opportunity_id: opportunityIdByTitle.get(reminder.relatedTo) ?? null,
    })),
  );

  if (remindersError) {
    return { ok: false, message: remindersError.message };
  }

  const { error: fixedCostsError } = await supabase.from("fixed_costs").insert(
    demoFixedCosts.map((cost) => ({
      company_id: companyId,
      label: cost.label,
      category: cost.category,
      amount: cost.amount,
      frequency: cost.frequency,
      next_due_date: demoDate(cost.nextDueInDays),
      notes: cost.notes,
    })),
  );

  if (fixedCostsError) {
    return { ok: false, message: fixedCostsError.message };
  }

  const { error: treasuryError } = await supabase.from("treasury_snapshots").insert({
    company_id: companyId,
    balance: demoTreasury.balance,
    note: demoTreasury.note,
  });

  if (treasuryError) {
    return { ok: false, message: treasuryError.message };
  }

  const { error: documentsError } = await supabase.from("show_documents").insert(
    demoDocuments
      .filter((document) => showIdByKey.get(document.showKey))
      .map((document) => ({
        company_id: companyId,
        show_id: showIdByKey.get(document.showKey) as string,
        title: document.title,
        document_type: document.documentType,
        status: document.status,
        notes: document.notes || null,
        updated_at: new Date().toISOString(),
      })),
  );

  if (documentsError) {
    return { ok: false, message: documentsError.message };
  }

  const { error: quotesError } = await supabase.from("quotes").insert(
    demoQuotes.map((quote) => ({
      company_id: companyId,
      opportunity_id: opportunityIdByTitle.get(quote.opportunityTitle) ?? null,
      number: quote.number,
      title: quote.title,
      organization: quote.organization,
      amount: quote.amount,
      deposit_due: quote.depositDue,
      balance_due: quote.balanceDue,
      status: quote.status,
      due_date: demoDate(quote.dueInDays),
    })),
  );

  if (quotesError) {
    return { ok: false, message: quotesError.message };
  }

  const { error: grantsError } = await supabase.from("grant_opportunities").insert(
    demoGrants.map((grant) => ({
      company_id: companyId,
      show_id: grant.showKey ? (showIdByKey.get(grant.showKey) ?? null) : null,
      title: grant.title,
      funder: grant.funder,
      territory: grant.territory,
      discipline: grant.discipline,
      deadline: demoDate(grant.deadlineInDays),
      amount: grant.amount,
      status: grant.status,
      requirements: grant.requirements,
      eligibility: grant.eligibility,
      source_url: grant.sourceUrl,
    })),
  );

  if (grantsError) {
    return { ok: false, message: grantsError.message };
  }

  const { error: patronageError } = await supabase.from("patronage_deals").insert(
    demoPatronageDeals.map((deal) => ({
      company_id: companyId,
      company_name: deal.companyName,
      contact_name: deal.contactName,
      amount: deal.amount,
      status: deal.status,
      next_action: deal.nextAction,
      next_follow_up_at:
        deal.nextFollowUpInDays === null ? null : demoDate(deal.nextFollowUpInDays),
    })),
  );

  if (patronageError) {
    return { ok: false, message: patronageError.message };
  }

  revalidatePath("/mecenat");
  revalidatePath("/dashboard");
  revalidatePath("/shows");
  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/finances");
  revalidatePath("/billing");
  revalidatePath("/subventions");
  revalidatePath("/documents");
  revalidatePath("/calendar");
  revalidatePath("/contracts");
  revalidatePath("/settings");

  await logActivity("a installe la compagnie de demonstration", "compagnie", demoCompanyName);

  return {
    ok: true,
    message: `Compagnie de demonstration installee : ${demoShows.length} spectacles, ${demoContacts.length} contacts, ${demoOpportunities.length} dates, ${demoQuotes.length} devis, ${demoGrants.length} subventions, ${demoPatronageDeals.length} partenaires mecenat.`,
  };
}

export async function createPatronageDeal(values: PatronageFormInput): Promise<ActionResult> {
  const parsed = patronageSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire mecenat contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : partenaire valide, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("patronage_deals").insert({
    company_id: workspace.companyId,
    company_name: parsed.data.companyName,
    contact_name: parsed.data.contactName || null,
    amount: parsed.data.amount,
    status: parsed.data.status,
    next_action: parsed.data.nextAction || null,
    next_follow_up_at: parsed.data.nextFollowUpAt || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/mecenat");
  revalidatePath("/dashboard");

  await logActivity("a ajoute le partenaire mecenat", "mecenat", parsed.data.companyName);

  return { ok: true, message: "Partenaire ajoute au suivi mecenat." };
}

export async function updatePatronageStatus(
  dealId: string,
  status: PatronageStatus,
): Promise<ActionResult> {
  if (!patronageStatuses.includes(status)) {
    return { ok: false, message: "Statut mecenat invalide." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : statut mis a jour." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("patronage_deals")
    .update({ status })
    .eq("id", dealId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/mecenat");
  revalidatePath("/dashboard");

  await logActivity("a change le statut d'un partenaire mecenat", "mecenat", status);

  return { ok: true, message: "Statut du partenaire mis a jour." };
}

export async function deletePatronageDeal(dealId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : partenaire supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("patronage_deals").delete().eq("id", dealId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/mecenat");
  revalidatePath("/dashboard");

  await logActivity("a retire un partenaire mecenat", "mecenat");

  return { ok: true, message: "Partenaire retire du suivi." };
}

export async function createGrantOpportunity(values: GrantFormInput): Promise<ActionResult> {
  const parsed = grantSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire subvention contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : dispositif valide, non enregistre." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("grant_opportunities").insert({
    company_id: workspace.companyId,
    show_id: parsed.data.relatedShowId || null,
    title: parsed.data.title,
    funder: parsed.data.funder,
    territory: parsed.data.territory || null,
    discipline: parsed.data.discipline || null,
    deadline: parsed.data.deadline,
    amount: parsed.data.amount,
    status: parsed.data.status,
    requirements: parsed.data.requirements ?? [],
    eligibility: parsed.data.eligibility || null,
    source_url: parsed.data.sourceUrl || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity("a ajoute la subvention", "subvention", parsed.data.title);

  return { ok: true, message: "Dispositif ajoute au radar." };
}

export async function updateGrantStatus(
  grantId: string,
  status: GrantStatus,
): Promise<ActionResult> {
  if (!grantStatuses.includes(status)) {
    return { ok: false, message: "Statut de subvention invalide." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : statut mis a jour." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("grant_opportunities")
    .update({ status })
    .eq("id", grantId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity("a change le statut d'une subvention", "subvention", status);

  return { ok: true, message: "Statut du dispositif mis a jour." };
}

export async function deleteGrantOpportunity(grantId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : dispositif supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("grant_opportunities").delete().eq("id", grantId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity("a retire une subvention du radar", "subvention");

  return { ok: true, message: "Dispositif retire du radar." };
}

export async function importReferenceGrants(): Promise<ActionResult & { imported: number }> {
  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      imported: referenceGrants.length,
      message: "Mode demo : dispositifs de reference valides, non enregistres.",
    };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, imported: 0, message: accessError };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, imported: 0, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("grant_opportunities")
    .select("title,funder");

  if (existingError) {
    return { ok: false, imported: 0, message: existingError.message };
  }

  const existingKeys = new Set(
    (existing ?? []).map((grant) => `${grant.funder}::${grant.title}`),
  );
  const toImport = referenceGrants.filter(
    (grant) => !existingKeys.has(`${grant.funder}::${grant.title}`),
  );

  if (toImport.length === 0) {
    return {
      ok: true,
      imported: 0,
      message: "Les dispositifs de reference sont deja dans le radar.",
    };
  }

  const { error } = await supabase.from("grant_opportunities").insert(
    toImport.map((grant) => ({
      company_id: workspace.companyId,
      title: grant.title,
      funder: grant.funder,
      territory: grant.territory,
      discipline: grant.discipline,
      deadline: grant.deadline,
      amount: grant.amount,
      status: "A surveiller" as const,
      requirements: grant.requirements,
      eligibility: grant.eligibility,
      source_url: grant.sourceUrl,
      themes: grant.themes,
    })),
  );

  if (error) {
    return { ok: false, imported: 0, message: error.message };
  }

  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity(
    "a importe les dispositifs de reference",
    "subvention",
    `${toImport.length} dispositif(s)`,
  );

  return {
    ok: true,
    imported: toImport.length,
    message: `${toImport.length} dispositif(s) de reference ajoutes. Verifiez les dates indicatives avant depot.`,
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

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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
      return { ok: true, message: "Relance deja ouverte pour cette date." };
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

  await logActivity("a cree la relance", "relance", parsed.data.title);

  return { ok: true, message: "Relance creee." };
}

export async function updateReminder(
  reminderId: string,
  values: ReminderFormInput,
): Promise<ActionResult> {
  const parsed = reminderSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire relance contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : relance mise a jour, non enregistree." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("reminders")
    .update({
      title: parsed.data.title,
      due_date: parsed.data.dueDate,
      related_to: parsed.data.relatedTo || null,
      priority: parsed.data.priority,
    })
    .eq("id", reminderId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/reminders");
  revalidatePath("/pipeline");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  await logActivity("a modifie la relance", "relance", parsed.data.title);

  return { ok: true, message: "Relance mise a jour." };
}

export async function completeReminder(reminderId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : relance terminee." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
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

  await logActivity("a termine une relance", "relance");

  return { ok: true, message: "Relance terminee." };
}
