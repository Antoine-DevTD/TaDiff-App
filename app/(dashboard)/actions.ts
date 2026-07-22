"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { hasSupabaseEnv } from "@/lib/env";
import { requireManagerAccess, requireWriteAccess } from "@/lib/supabase/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getConfiguredStorageProvider,
  preparePrivateUpload,
  removePrivateObject,
  type StorageProvider,
} from "@/lib/storage/server";
import { getOrCreateWorkspace } from "@/lib/supabase/workspace";
import { calendarEventSchema, type CalendarEventInput } from "@/lib/validation/calendar";
import { companyProfileSchema, type CompanyProfileInput } from "@/lib/validation/company";
import {
  companyDocumentSchema,
  type CompanyDocumentInput,
} from "@/lib/validation/company-document";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import {
  documentUploadRequestSchema,
  showDocumentSchema,
  type DocumentUploadRequest,
  type ShowDocumentFormInput,
} from "@/lib/validation/document";
import { getDocumentFileError, sanitizeDocumentFilename } from "@/lib/documents-upload";
import { showDocumentTypes } from "@/lib/show-documents";
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
  reminderCompletionSchema,
  reminderSchema,
  type OpportunityFormInput,
  type ReminderCompletionInput,
  type ReminderFormInput,
} from "@/lib/validation/pipeline";
import { showSchema, type ShowFormInput } from "@/lib/validation/show";
import {
  showEmailProfileSchema,
  type ShowEmailProfileInput,
} from "@/lib/validation/show-email-profile";
import {
  showBudgetItemSchema,
  showBudgetProfileSchema,
  type ShowBudgetItemInput,
  type ShowBudgetProfileInput,
} from "@/lib/validation/show-budget";
import { feedbackSchema, type FeedbackFormInput } from "@/lib/validation/feedback";
import {
  calculateCompanyRevenue,
  getDefaultProbability,
  getWilliamOpportunityAction,
} from "@/lib/pipeline";
import type { PipelineStage, Reminder } from "@/types";
import { emailTemplateSchema, type EmailTemplateInput } from "@/lib/validation/email-template";
import type { Database, Json } from "@/types/database.types";

type ActionResult = {
  ok: boolean;
  message: string;
  calendarEvent?: import("@/types").CalendarEvent;
  reminder?: Reminder;
  reminders?: Reminder[];
  treasurySnapshot?: import("@/types").TreasurySnapshot;
};

export async function saveEmailTemplate(
  templateId: string | null,
  values: EmailTemplateInput,
): Promise<ActionResult> {
  const parsed = emailTemplateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Modele invalide." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : modele valide, non enregistre." };
  }

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };

  const supabase = await getSupabaseServerClient();
  const payload = {
    name: parsed.data.name,
    message_type: parsed.data.messageType,
    subject_template: parsed.data.subjectTemplate,
    body_json: parsed.data.bodyJson as Json,
    updated_at: new Date().toISOString(),
  };

  const result = templateId
    ? await supabase.from("email_templates").update(payload).eq("id", templateId)
    : await (async () => {
        const workspace = await getOrCreateWorkspace();
        if (!workspace.companyId) return { error: { message: workspace.error ?? "Compagnie introuvable." } };
        return supabase.from("email_templates").insert({ ...payload, company_id: workspace.companyId });
      })();

  if (result.error) {
    return {
      ok: false,
      message: result.error.message.includes("schema cache")
        ? "Appliquez la migration 037_email_templates.sql avant d'enregistrer."
        : result.error.message,
    };
  }

  revalidatePath("/campaigns");
  revalidatePath("/contacts");
  return { ok: true, message: "Modele enregistre." };
}

export async function deleteEmailTemplate(templateId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) return { ok: true, message: "Mode demo : modele retire." };
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("email_templates").delete().eq("id", templateId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/campaigns");
  revalidatePath("/contacts");
  return { ok: true, message: "Modele supprime." };
}

function isDetailedBudgetSchemaCacheError(message: string | undefined) {
  return Boolean(
    message?.includes("schema cache") &&
      (message.includes("detailed_budget_enabled") || message.includes("show_budget_items")),
  );
}

type PerformanceInvitationResult = ActionResult & {
  invitation?: {
    id: string;
    performanceOpportunityId: string;
    recipientName: string;
    recipientEmail: string;
    subject: string;
    performanceDate: string;
    venue: string;
    sentAt: string;
    deliveredAt: string;
    emailOpenedAt: string;
    emailClickedAt: string;
    bouncedAt: string;
    linkOpenedAt: string;
    respondedAt: string;
    response: "yes" | "no" | null;
    createdAt: string;
    url: string;
  };
};

function isOpportunitySchemaCacheError(message: string | undefined) {
  return Boolean(
    message?.includes("schema cache") &&
      (message.includes("lost_reason") ||
        message.includes("next_action") ||
        message.includes("next_follow_up_at") ||
        message.includes("performance_date") ||
        message.includes("probability")),
  );
}

function isOpportunityExploitationSchemaError(message: string | undefined) {
  return Boolean(
    message?.includes("schema cache") &&
      (message.includes("exploitation_mode") ||
        message.includes("cession_fee") ||
        message.includes("estimated_box_office") ||
        message.includes("company_share_percent") ||
        message.includes("minimum_guarantee") ||
        message.includes("venue_rental")),
  );
}

function withoutOptionalOpportunityColumns<T extends Record<string, unknown>>(payload: T) {
  const fallbackPayload = { ...payload };
  delete fallbackPayload.next_action;
  delete fallbackPayload.next_follow_up_at;
  delete fallbackPayload.performance_date;
  delete fallbackPayload.probability;
  delete fallbackPayload.lost_reason;
  return fallbackPayload;
}

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
  showId,
  actionType = "call",
  priority = "normal",
  relatedTo,
  title,
}: {
  contactId?: string | null;
  companyId: string;
  dueDate: string;
  opportunityId: string;
  showId?: string | null;
  actionType?: "call" | "email" | "document" | "quote" | "administration" | "other";
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
        show_id: showId ?? null,
        action_type: actionType,
      })
      .eq("id", existingReminder.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "Action existante replanifiee." };
  }

  const { error } = await supabase.from("reminders").insert({
    company_id: companyId,
    title,
    due_date: dueDate,
    related_to: relatedTo,
    priority,
    opportunity_id: opportunityId,
    contact_id: contactId ?? null,
    show_id: showId ?? null,
    action_type: actionType,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Action creee." };
}

export async function createExploitation(values: {
  showId: string; contactId?: string; title: string; venue?: string; city?: string;
  exploitationMode: "cession" | "corealisation" | "location" | "other";
  startDate: string; endDate: string; cessionFeePerPerformance: number;
  companySharePercent: number; minimumGuarantee: number; venueRentalTotal: number;
  fixedCostsTotal: number;
}): Promise<ActionResult> {
  if (!values.showId || !values.title.trim() || !values.startDate || !values.endDate) {
    return { ok: false, message: "Spectacle, titre et periode sont requis." };
  }
  const start = new Date(`${values.startDate}T12:00:00`);
  const end = new Date(`${values.endDate}T12:00:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    return { ok: false, message: "La periode d'exploitation est invalide." };
  }
  const dayCount = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (dayCount > 60) {
    return { ok: false, message: "Une serie est limitee a 60 representations. Creez plusieurs exploitations pour une periode plus longue." };
  }
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  if (!hasSupabaseEnv()) return { ok: false, message: "Une base Supabase est requise." };
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  const supabase = await getSupabaseServerClient();
  const { data: exploitation, error } = await supabase.from("exploitations").insert({
    company_id: workspace.companyId,
    show_id: values.showId,
    contact_id: values.contactId || null,
    title: values.title.trim(),
    venue: values.venue?.trim() || null,
    city: values.city?.trim() || null,
    exploitation_mode: values.exploitationMode,
    status: "confirmee",
    start_date: values.startDate,
    end_date: values.endDate,
    cession_fee_per_performance: Math.max(0, values.cessionFeePerPerformance || 0),
    company_share_percent: Math.min(100, Math.max(0, values.companySharePercent || 0)),
    minimum_guarantee: Math.max(0, values.minimumGuarantee || 0),
    venue_rental_total: Math.max(0, values.venueRentalTotal || 0),
    fixed_costs_total: Math.max(0, values.fixedCostsTotal || 0),
  }).select("id").single();
  if (error || !exploitation) return { ok: false, message: error?.message ?? "Exploitation non creee." };
  const { error: performanceError } = await supabase.from("exploitation_performances").insert(
    dates.map((performanceDate) => ({ company_id: workspace.companyId!, exploitation_id: exploitation.id, performance_date: performanceDate })),
  );
  if (performanceError) {
    await supabase.from("exploitations").delete().eq("id", exploitation.id);
    return { ok: false, message: performanceError.message };
  }
  revalidatePath("/pipeline");
  revalidatePath("/finances");
  revalidatePath("/calendar");
  return { ok: true, message: `${dates.length} representation(s) ajoutee(s) a l'exploitation.` };
}

export async function updateExploitationPerformance(performanceId: string, values: {
  capacity: number; paidTickets: number; complimentaryTickets: number;
  grossBoxOffice: number; ticketingFees: number; variableCosts: number; sacdDeclared: boolean;
}): Promise<ActionResult> {
  if (!performanceId || Object.values(values).some((value) => typeof value === "number" && value < 0)) {
    return { ok: false, message: "Chiffres de billetterie invalides." };
  }
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("exploitation_performances").update({
    capacity: values.capacity,
    paid_tickets: values.paidTickets,
    complimentary_tickets: values.complimentaryTickets,
    gross_box_office: values.grossBoxOffice,
    ticketing_fees: values.ticketingFees,
    variable_costs: values.variableCosts,
    sacd_declared: values.sacdDeclared,
    updated_at: new Date().toISOString(),
  }).eq("id", performanceId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/pipeline");
  revalidatePath("/finances");
  return { ok: true, message: "Billetterie mise a jour." };
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
  const showValues = {
    company_id: workspace.companyId,
    title: parsed.data.title,
    discipline: parsed.data.discipline,
    status: parsed.data.status,
    next_date: parsed.data.nextDate || null,
    budget: parsed.data.budget ?? 0,
    detailed_budget_enabled: parsed.data.detailedBudgetEnabled,
    poster_url: parsed.data.posterUrl || null,
    capture_url: parsed.data.captureUrl || null,
    notes: parsed.data.notes || null,
  };
  let { error } = await supabase.from("shows").insert(showValues);

  if (isDetailedBudgetSchemaCacheError(error?.message)) {
    const fallback = await supabase.from("shows").insert({
      company_id: showValues.company_id,
      title: showValues.title,
      discipline: showValues.discipline,
      status: showValues.status,
      next_date: showValues.next_date,
      budget: showValues.budget,
      poster_url: showValues.poster_url,
      capture_url: showValues.capture_url,
      notes: showValues.notes,
    });
    error = fallback.error;
  }

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
  const showValues = {
    title: parsed.data.title,
    discipline: parsed.data.discipline,
    status: parsed.data.status,
    next_date: parsed.data.nextDate || null,
    budget: parsed.data.budget ?? 0,
    detailed_budget_enabled: parsed.data.detailedBudgetEnabled,
    poster_url: parsed.data.posterUrl || null,
    capture_url: parsed.data.captureUrl || null,
    notes: parsed.data.notes || null,
  };
  let { error } = await supabase
    .from("shows")
    .update(showValues)
    .eq("id", showId);

  if (isDetailedBudgetSchemaCacheError(error?.message)) {
    const fallback = await supabase
      .from("shows")
      .update({
        title: showValues.title,
        discipline: showValues.discipline,
        status: showValues.status,
        next_date: showValues.next_date,
        budget: showValues.budget,
        poster_url: showValues.poster_url,
        capture_url: showValues.capture_url,
        notes: showValues.notes,
      })
      .eq("id", showId);
    error = fallback.error;
  }

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

export async function updateShowEmailProfile(
  showId: string,
  values: ShowEmailProfileInput,
): Promise<ActionResult> {
  const parsed = showEmailProfileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "La presentation contient des erreurs.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : presentation validee, non enregistree." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("shows")
    .update({
      logline: parsed.data.logline?.trim() || null,
      synopsis_text: parsed.data.synopsisText?.trim() || null,
      intention_note_text: parsed.data.intentionNoteText?.trim() || null,
      themes: parsed.data.themes.map((theme) => theme.trim()).filter(Boolean),
      target_audience: parsed.data.targetAudience?.trim() || null,
      email_pitch: parsed.data.emailPitch?.trim() || null,
    })
    .eq("id", showId);

  if (error) {
    const migrationMissing = error.message.includes("schema cache");
    return {
      ok: false,
      message: migrationMissing
        ? "Appliquez les migrations 035 et 051 avant d'enregistrer."
        : error.message,
    };
  }

  await logActivity("a affine la presentation", "spectacle", showId);
  revalidatePath(`/shows/${showId}`);
  revalidatePath("/shows");
  revalidatePath("/campaigns");

  return { ok: true, message: "Presentation enregistree." };
}

export async function saveShowBudgetItem(
  showId: string,
  itemId: string | null,
  values: ShowBudgetItemInput,
) {
  const parsed = showBudgetItemSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ligne de budget invalide." };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: "Mode démo : ligne validée, non enregistrée.",
      item: {
        id: itemId ?? crypto.randomUUID(),
        showId,
        ...parsed.data,
        sortOrder: 0,
      },
    };
  }

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };

  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { data: ownedShow } = await supabase
    .from("shows")
    .select("id")
    .eq("id", showId)
    .eq("company_id", workspace.companyId)
    .maybeSingle();

  if (!ownedShow) return { ok: false, message: "Spectacle introuvable dans cette compagnie." };

  const budgetValues = {
    kind: parsed.data.kind,
    category: parsed.data.category,
    label: parsed.data.label,
    amount: parsed.data.amount,
    scope: parsed.data.scope,
    updated_at: new Date().toISOString(),
  };

  const response = itemId
    ? await supabase
        .from("show_budget_items")
        .update(budgetValues)
        .eq("id", itemId)
        .eq("show_id", showId)
        .eq("company_id", workspace.companyId)
        .select("id,show_id,kind,category,label,amount,scope,sort_order")
        .single()
    : await supabase
        .from("show_budget_items")
        .insert({
          ...budgetValues,
          company_id: workspace.companyId,
          show_id: showId,
        })
        .select("id,show_id,kind,category,label,amount,scope,sort_order")
        .single();

  if (response.error || !response.data) {
    const message = response.error?.message.includes("scope")
      ? "Appliquez la migration 054 avant d'enregistrer une dépense par représentation."
      : isDetailedBudgetSchemaCacheError(response.error?.message)
        ? "Le budget détaillé doit être activé avec la migration 034."
      : response.error?.message ?? "Impossible d'enregistrer cette ligne.";
    return { ok: false, message };
  }

  revalidatePath(`/shows/${showId}`);
  revalidatePath("/finances");

  return {
    ok: true,
    message: itemId ? "Ligne mise à jour." : "Ligne ajoutée.",
    item: {
      id: response.data.id,
      showId: response.data.show_id,
      kind: response.data.kind,
      category: response.data.category,
      label: response.data.label,
      amount: response.data.amount ?? 0,
      scope: response.data.scope ?? "creation",
      sortOrder: response.data.sort_order,
    },
  };
}

export async function saveShowBudgetProfile(showId: string, values: ShowBudgetProfileInput) {
  const parsed = showBudgetProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Hypothèses de budget invalides." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode démo : hypothèses validées.", profile: { showId, ...parsed.data } };
  }

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { ok: false, message: workspace.error ?? "Compagnie introuvable." };

  const supabase = await getSupabaseServerClient();
  const { data: ownedShow } = await supabase.from("shows").select("id")
    .eq("id", showId).eq("company_id", workspace.companyId).maybeSingle();
  if (!ownedShow) return { ok: false, message: "Spectacle introuvable dans cette compagnie." };

  const profileValues = {
    company_id: workspace.companyId,
    convention: parsed.data.convention,
    rate_source_url: parsed.data.rateSourceUrl || null,
    rate_effective_date: parsed.data.rateEffectiveDate || null,
    performances_target: parsed.data.performancesTarget,
    exploitation_mode: parsed.data.exploitationMode,
    cession_fee: parsed.data.cessionFee,
    venue_rental: parsed.data.venueRental,
    minimum_guarantee: parsed.data.minimumGuarantee,
    company_share_percent: parsed.data.companySharePercent,
    average_ticket_price: parsed.data.averageTicketPrice,
    venue_capacity: parsed.data.venueCapacity,
    expected_occupancy_percent: parsed.data.expectedOccupancyPercent,
    rights_territory: parsed.data.rightsTerritory,
    author_rights_percent: parsed.data.authorRightsPercent,
    sacd_contribution_percent: parsed.data.sacdContributionPercent,
    director_rights_percent: parsed.data.directorRightsPercent,
    music_rights_percent: parsed.data.musicRightsPercent,
    overhead_percent: parsed.data.overheadPercent,
    contingency_percent: parsed.data.contingencyPercent,
    cession_margin_percent: parsed.data.cessionMarginPercent,
    personnel: parsed.data.personnel as Json,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("show_budget_profiles").upsert({
    show_id: showId,
    ...profileValues,
  }, { onConflict: "show_id" });

  if (error) {
    return {
      ok: false,
      message: error.message.includes("schema cache")
        ? "Appliquez la migration 054 avant d'enregistrer le budget théâtre."
        : error.message,
    };
  }

  revalidatePath(`/shows/${showId}`);
  revalidatePath("/finances");
  return { ok: true, message: "Hypothèses enregistrées.", profile: { showId, ...parsed.data } };
}

export async function deleteShowBudgetItem(showId: string, itemId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) return { ok: true, message: "Mode démo : ligne supprimée." };

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };

  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("show_budget_items")
    .delete()
    .eq("id", itemId)
    .eq("show_id", showId)
    .eq("company_id", workspace.companyId);

  if (error) {
    return {
      ok: false,
      message: isDetailedBudgetSchemaCacheError(error.message)
        ? "Le budget détaillé doit être activé avec la migration 034."
        : error.message,
    };
  }

  revalidatePath(`/shows/${showId}`);
  revalidatePath("/finances");
  return { ok: true, message: "Ligne supprimée." };
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
  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  if (parsed.data.venueId) {
    const { data: venue } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", parsed.data.venueId)
      .eq("company_id", workspace.companyId)
      .eq("contact_type", "venue")
      .maybeSingle();
    if (!venue) return { ok: false, message: "Le lieu selectionne n'appartient pas a cette compagnie." };
  }

  const payload = {
    contact_type: parsed.data.contactType,
    venue_id: parsed.data.contactType === "person" ? parsed.data.venueId || null : null,
    name: parsed.data.name,
    organization: parsed.data.contactType === "venue" ? parsed.data.name : parsed.data.organization,
    role: parsed.data.contactType === "venue" ? "Lieu" : parsed.data.role || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    city: parsed.data.city || null,
    address: parsed.data.contactType === "venue" ? parsed.data.address || null : null,
    postal_code: parsed.data.contactType === "venue" ? parsed.data.postalCode || null : null,
    department: parsed.data.contactType === "venue" ? parsed.data.department || null : null,
    region: parsed.data.contactType === "venue" ? parsed.data.region || null : null,
    website: parsed.data.contactType === "venue" ? parsed.data.website || null : null,
    capacity: parsed.data.contactType === "venue" && parsed.data.capacity ? Number(parsed.data.capacity) : null,
    latitude: parsed.data.contactType === "venue" && parsed.data.latitude ? Number(parsed.data.latitude.replace(",", ".")) : null,
    longitude: parsed.data.contactType === "venue" && parsed.data.longitude ? Number(parsed.data.longitude.replace(",", ".")) : null,
    status: parsed.data.status,
    tags: normalizeContactTags(parsed.data.tags),
  };
  let { error } = await supabase.from("contacts").update(payload).eq("id", contactId);

  if (isContactKindSchemaCacheError(error)) {
    return { ok: false, message: "Appliquez la migration 049 avant de modifier une personne ou un lieu." };
  }

  if (isContactTagsSchemaCacheError(error)) {
    const fallbackPayload = {
      name: payload.name,
      organization: payload.organization,
      role: payload.role,
      email: payload.email,
      city: payload.city,
      status: payload.status,
    };
    const retry = await supabase.from("contacts").update(fallbackPayload).eq("id", contactId);
    error = retry.error;
  }

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

function normalizeContactTags(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function isContactTagsSchemaCacheError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("tags") || error?.message?.includes("phone"));
}

function isContactKindSchemaCacheError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("contact_type") ||
    error?.message?.includes("venue_id") ||
    error?.message?.includes("address") ||
    error?.message?.includes("postal_code") ||
    error?.message?.includes("latitude") ||
    error?.message?.includes("longitude"),
  );
}

export async function deleteContact(contactId: string): Promise<ActionResult> {
  const result = await deleteContacts([contactId]);
  return result.ok
    ? { ...result, message: "Contact supprime, dates et actions detachees." }
    : result;
}

export async function deleteContacts(contactIds: string[]): Promise<ActionResult> {
  const uniqueContactIds = Array.from(new Set(contactIds.filter(Boolean)));

  if (uniqueContactIds.length === 0 || uniqueContactIds.length > 500) {
    return { ok: false, message: "Selection de contacts invalide." };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: `Mode demo : ${uniqueContactIds.length} contact(s) supprime(s).`,
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
  const { data: existingContacts, error: lookupError } = await supabase
    .from("contacts")
    .select("id,name")
    .eq("company_id", workspace.companyId)
    .in("id", uniqueContactIds);

  if (lookupError) {
    return { ok: false, message: lookupError.message };
  }

  if (!existingContacts || existingContacts.length !== uniqueContactIds.length) {
    return { ok: false, message: "Un contact est introuvable ou n'appartient pas a cette compagnie." };
  }

  const { data: deletedContacts, error } = await supabase
    .from("contacts")
    .delete()
    .eq("company_id", workspace.companyId)
    .in("id", uniqueContactIds)
    .select("id");

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!deletedContacts || deletedContacts.length !== uniqueContactIds.length) {
    return { ok: false, message: "Tous les contacts n'ont pas pu etre supprimes." };
  }

  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  await logActivity(
    uniqueContactIds.length > 1 ? "a supprime des contacts" : "a supprime un contact",
    "contact",
    existingContacts.map((contact) => contact.name).slice(0, 5).join(", "),
  );

  return { ok: true, message: `${uniqueContactIds.length} contact(s) supprime(s).` };
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
    return { ok: true, message: "Mode demo : action supprimee." };
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

  await logActivity("a supprime une action", "action");

  return { ok: true, message: "Action supprimee." };
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
    storage_provider: getConfiguredStorageProvider(),
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

export async function replaceShowDocument(
  documentId: string,
  values: ShowDocumentFormInput,
): Promise<ActionResult> {
  const parsed = showDocumentSchema.safeParse(values);

  if (!parsed.success || !parsed.data.storagePath) {
    return { ok: false, message: "La nouvelle version du document n'est pas valide." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : nouvelle version validee, non enregistree." };
  }

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };

  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase
    .from("show_documents")
    .select("id,show_id,title,storage_path,storage_provider")
    .eq("id", documentId)
    .eq("company_id", workspace.companyId)
    .maybeSingle();

  if (lookupError || !existing || existing.show_id !== parsed.data.showId) {
    await removePrivateObject(getConfiguredStorageProvider(), parsed.data.storagePath);
    return { ok: false, message: lookupError?.message ?? "Document introuvable." };
  }

  const { error } = await supabase
    .from("show_documents")
    .update({
      title: parsed.data.title,
      document_type: parsed.data.documentType,
      status: parsed.data.status,
      file_url: parsed.data.fileUrl || null,
      storage_path: parsed.data.storagePath,
      storage_provider: getConfiguredStorageProvider(),
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("company_id", workspace.companyId);

  if (error) {
    await removePrivateObject(getConfiguredStorageProvider(), parsed.data.storagePath);
    return { ok: false, message: error.message };
  }

  if (existing.storage_path && existing.storage_path !== parsed.data.storagePath) {
    await removePrivateObject((existing.storage_provider || "supabase") as StorageProvider, existing.storage_path);
  }

  revalidatePath(`/shows/${existing.show_id}`);
  revalidatePath("/shows");
  revalidatePath("/documents");
  revalidatePath("/subventions");
  revalidatePath("/dashboard");
  await logActivity("a remplace le document", "document", existing.title);

  return { ok: true, message: "Nouvelle version enregistree." };
}

export async function classifyShowDocument(documentId: string, showId: string, documentType: string): Promise<ActionResult> {
  if (!showDocumentTypes.includes(documentType as (typeof showDocumentTypes)[number]) || documentType === "A renseigner") {
    return { ok: false, message: "Choisissez un type de document precis." };
  }
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("show_documents").update({
    document_type: documentType as (typeof showDocumentTypes)[number],
    updated_at: new Date().toISOString(),
  }).eq("id", documentId).eq("show_id", showId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/shows/${showId}`);
  return { ok: true, message: "Type de document enregistre." };
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
  let prepared;
  try {
    prepared = await preparePrivateUpload(storagePath, parsed.data.fileType);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Impossible de preparer l'upload." };
  }

  return {
    ok: true,
    message: "Upload pret.",
    signedUrl: prepared.signedUrl,
    storagePath,
  };
}

export async function createShowWorkFolder(showId: string, name: string, parentId?: string | null): Promise<ActionResult> {
  const cleanName = name.trim().slice(0, 100);
  if (!showId || !cleanName) return { ok: false, message: "Le nom du dossier est requis." };
  if (!hasSupabaseEnv()) return { ok: false, message: "Une base Supabase est requise." };
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("show_work_folders").insert({
    company_id: workspace.companyId,
    show_id: showId,
    parent_id: parentId || null,
    name: cleanName,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/shows/${showId}`);
  return { ok: true, message: "Dossier cree." };
}

export async function createShowWorkDocument(values: {
  showId: string;
  folderId?: string | null;
  title: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
}): Promise<ActionResult> {
  if (!values.showId || !values.storagePath || !values.title.trim()) return { ok: false, message: "Document incomplet." };
  const fileError = getDocumentFileError({ size: values.fileSize, type: values.mimeType });
  if (fileError) return { ok: false, message: fileError };
  if (!hasSupabaseEnv()) return { ok: false, message: "Une base Supabase est requise." };
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  const supabase = await getSupabaseServerClient();
  const provider = getConfiguredStorageProvider();
  const { data: userData } = await supabase.auth.getUser();
  const { data: document, error } = await supabase.from("show_work_documents").insert({
    company_id: workspace.companyId,
    show_id: values.showId,
    folder_id: values.folderId || null,
    title: values.title.trim().slice(0, 180),
    storage_path: values.storagePath,
    storage_provider: provider,
    mime_type: values.mimeType,
    file_size: values.fileSize,
    created_by: userData.user?.id ?? null,
  }).select("id").single();
  if (error || !document) return { ok: false, message: error?.message ?? "Document non enregistre." };
  const { error: versionError } = await supabase.from("show_work_document_versions").insert({
    document_id: document.id,
    company_id: workspace.companyId,
    storage_path: values.storagePath,
    storage_provider: provider,
    mime_type: values.mimeType,
    file_size: values.fileSize,
    version_number: 1,
    created_by: userData.user?.id ?? null,
  });
  if (versionError) return { ok: false, message: versionError.message };
  revalidatePath(`/shows/${values.showId}`);
  return { ok: true, message: "Document de travail ajoute." };
}

export async function replaceShowWorkDocument(documentId: string, values: {
  showId: string; storagePath: string; mimeType: string; fileSize: number;
}): Promise<ActionResult> {
  if (!documentId || !values.storagePath) return { ok: false, message: "Nouvelle version invalide." };
  const fileError = getDocumentFileError({ size: values.fileSize, type: values.mimeType });
  if (fileError) return { ok: false, message: fileError };
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  const supabase = await getSupabaseServerClient();
  const { data: existing, error } = await supabase.from("show_work_documents")
    .select("id,version_number").eq("id", documentId).eq("company_id", workspace.companyId).single();
  if (error || !existing) return { ok: false, message: error?.message ?? "Document introuvable." };
  const nextVersion = existing.version_number + 1;
  const provider = getConfiguredStorageProvider();
  const { data: userData } = await supabase.auth.getUser();
  const { error: versionError } = await supabase.from("show_work_document_versions").insert({
    document_id: documentId, company_id: workspace.companyId, storage_path: values.storagePath,
    storage_provider: provider, mime_type: values.mimeType, file_size: values.fileSize,
    version_number: nextVersion, created_by: userData.user?.id ?? null,
  });
  if (versionError) return { ok: false, message: versionError.message };
  const { error: updateError } = await supabase.from("show_work_documents").update({
    storage_path: values.storagePath, storage_provider: provider, mime_type: values.mimeType,
    file_size: values.fileSize, version_number: nextVersion, updated_at: new Date().toISOString(),
  }).eq("id", documentId).eq("company_id", workspace.companyId);
  if (updateError) return { ok: false, message: updateError.message };
  revalidatePath(`/shows/${values.showId}`);
  return { ok: true, message: `Version ${nextVersion} enregistree.` };
}

export async function deleteShowWorkDocument(documentId: string, showId: string): Promise<ActionResult> {
  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };
  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  const supabase = await getSupabaseServerClient();
  const { data: versions } = await supabase.from("show_work_document_versions")
    .select("storage_path,storage_provider").eq("document_id", documentId).eq("company_id", workspace.companyId);
  const { error } = await supabase.from("show_work_documents").delete().eq("id", documentId).eq("company_id", workspace.companyId);
  if (error) return { ok: false, message: error.message };
  await Promise.allSettled((versions ?? []).map((version) =>
    removePrivateObject((version.storage_provider || "supabase") as StorageProvider, version.storage_path),
  ));
  revalidatePath(`/shows/${showId}`);
  return { ok: true, message: "Document supprime." };
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

export async function createCompanyDocument(
  values: CompanyDocumentInput,
): Promise<ActionResult> {
  const parsed = companyDocumentSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le document contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : document valide sans enregistrement." };
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
  const { error } = await supabase.from("company_documents").insert({
    company_id: workspace.companyId,
    title: parsed.data.title,
    doc_type: parsed.data.docType,
    storage_path: parsed.data.storagePath || null,
    storage_provider: getConfiguredStorageProvider(),
    file_url: parsed.data.fileUrl || null,
    note: parsed.data.note || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/subventions");
  await logActivity("a ajoute un document compagnie", "company_document", parsed.data.title);

  return { ok: true, message: "Document de la compagnie enregistre." };
}

export async function deleteCompanyDocument(documentId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : document supprime." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const { data: document } = await supabase
    .from("company_documents")
    .select("id,storage_path,storage_provider")
    .eq("id", documentId)
    .maybeSingle();

  const { error } = await supabase.from("company_documents").delete().eq("id", documentId);

  if (error) {
    return { ok: false, message: error.message };
  }

  if (document?.storage_path) {
    await removePrivateObject((document.storage_provider || "supabase") as StorageProvider, document.storage_path);
  }

  revalidatePath("/settings");
  revalidatePath("/subventions");
  return { ok: true, message: "Document supprime." };
}

export async function createCalendarEvent(
  values: CalendarEventInput,
): Promise<ActionResult> {
  const parsed = calendarEventSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "L'evenement contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: "Mode demo : evenement ajoute pour cette visite.",
      calendarEvent: {
        id: `calendar-demo-${Date.now()}`,
        title: parsed.data.title,
        eventDate: parsed.data.eventDate,
        kind: parsed.data.kind,
        relatedShowId: parsed.data.relatedShowId || null,
        note: parsed.data.note || "",
        allDay: parsed.data.allDay,
        startTime: parsed.data.allDay ? null : parsed.data.startTime || null,
        endTime: parsed.data.allDay ? null : parsed.data.endTime || null,
        location: parsed.data.location || "",
      },
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
  const eventPayload = {
    company_id: workspace.companyId,
    title: parsed.data.title,
    event_date: parsed.data.eventDate,
    kind: parsed.data.kind,
    related_show_id: parsed.data.relatedShowId || null,
    note: parsed.data.note || null,
    all_day: parsed.data.allDay,
    start_time: parsed.data.allDay ? null : parsed.data.startTime || null,
    end_time: parsed.data.allDay ? null : parsed.data.endTime || null,
    location: parsed.data.location || null,
  };
  let { data: createdEvent, error } = await supabase
    .from("calendar_events")
    .insert(eventPayload)
    .select("id,title,event_date,kind,related_show_id,note,all_day,start_time,end_time,location")
    .single();

  if (error && isMissingCalendarScheduleColumn(error.message)) {
    const legacyResult = await supabase
      .from("calendar_events")
      .insert({
        company_id: eventPayload.company_id,
        title: eventPayload.title,
        event_date: eventPayload.event_date,
        kind: eventPayload.kind,
        related_show_id: eventPayload.related_show_id,
        note: eventPayload.note,
      })
      .select("id,title,event_date,kind,related_show_id,note")
      .single();

    createdEvent = legacyResult.data
      ? {
          ...legacyResult.data,
          all_day: parsed.data.allDay,
          start_time: parsed.data.startTime || null,
          end_time: parsed.data.endTime || null,
          location: parsed.data.location || null,
        }
      : null;
    error = legacyResult.error;
  }

  if (error || !createdEvent) {
    return { ok: false, message: error?.message ?? "Evenement non ajoute." };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  await logActivity("a ajoute un evenement a l agenda", "calendar", parsed.data.title);

  return {
    ok: true,
    message: "Evenement ajoute a l'agenda.",
    calendarEvent: {
      id: createdEvent.id,
      title: createdEvent.title,
      eventDate: createdEvent.event_date,
      kind: createdEvent.kind,
      relatedShowId: createdEvent.related_show_id,
      note: createdEvent.note ?? "",
      allDay: createdEvent.all_day,
      startTime: createdEvent.start_time,
      endTime: createdEvent.end_time,
      location: createdEvent.location ?? "",
    },
  };
}

function isMissingCalendarScheduleColumn(message: string) {
  return ["all_day", "start_time", "end_time", "location", "schema cache"].some((column) =>
    message.toLowerCase().includes(column),
  );
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
    .select("id,show_id,title,storage_path,storage_provider")
    .eq("id", documentId)
    .maybeSingle();

  if (lookupError || !document) {
    return { ok: false, message: lookupError?.message ?? "Document introuvable." };
  }

  if (document.storage_path) {
    try {
      await removePrivateObject((document.storage_provider || "supabase") as StorageProvider, document.storage_path);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Suppression du fichier impossible." };
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
    return {
      ok: true,
      message: "Mode demo : solde mis a jour pour cette visite.",
      treasurySnapshot: {
        id: `treasury-demo-${Date.now()}`,
        balance: parsed.data.balance,
        recordedOn: new Date().toISOString().slice(0, 10),
        note: parsed.data.note || "",
      },
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
  const { data: snapshot, error } = await supabase
    .from("treasury_snapshots")
    .insert({
      company_id: workspace.companyId,
      balance: parsed.data.balance,
      note: parsed.data.note || null,
    })
    .select("id,balance,recorded_on,note")
    .single();

  if (error || !snapshot) {
    return { ok: false, message: error?.message ?? "Solde non enregistre." };
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");

  await logActivity(
    "a mis a jour le solde de tresorerie",
    "tresorerie",
    `${parsed.data.balance.toLocaleString("fr-FR")} EUR`,
  );

  return {
    ok: true,
    message: "Solde de tresorerie mis a jour.",
    treasurySnapshot: {
      id: snapshot.id,
      balance: snapshot.balance,
      recordedOn: snapshot.recorded_on,
      note: snapshot.note ?? "",
    },
  };
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
  let resolvedVenueId = parsed.data.venueId || "";

  if (parsed.data.contactType === "person" && !resolvedVenueId && parsed.data.organization) {
    const { data: matchingVenue } = await supabase
      .from("contacts")
      .select("id")
      .eq("company_id", workspace.companyId)
      .eq("contact_type", "venue")
      .ilike("name", parsed.data.organization.trim())
      .maybeSingle();
    resolvedVenueId = matchingVenue?.id ?? "";
  }

  if (resolvedVenueId) {
    const { data: venue } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", resolvedVenueId)
      .eq("company_id", workspace.companyId)
      .eq("contact_type", "venue")
      .maybeSingle();
    if (!venue) return { ok: false, message: "Le lieu selectionne n'appartient pas a cette compagnie." };
  }

  const payload = {
    company_id: workspace.companyId,
    contact_type: parsed.data.contactType,
    venue_id: parsed.data.contactType === "person" ? resolvedVenueId || null : null,
    name: parsed.data.name,
    organization: parsed.data.contactType === "venue" ? parsed.data.name : parsed.data.organization,
    role: parsed.data.contactType === "venue" ? "Lieu" : parsed.data.role || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    city: parsed.data.city || null,
    address: parsed.data.contactType === "venue" ? parsed.data.address || null : null,
    postal_code: parsed.data.contactType === "venue" ? parsed.data.postalCode || null : null,
    department: parsed.data.contactType === "venue" ? parsed.data.department || null : null,
    region: parsed.data.contactType === "venue" ? parsed.data.region || null : null,
    website: parsed.data.contactType === "venue" ? parsed.data.website || null : null,
    capacity: parsed.data.contactType === "venue" && parsed.data.capacity ? Number(parsed.data.capacity) : null,
    latitude: parsed.data.contactType === "venue" && parsed.data.latitude ? Number(parsed.data.latitude.replace(",", ".")) : null,
    longitude: parsed.data.contactType === "venue" && parsed.data.longitude ? Number(parsed.data.longitude.replace(",", ".")) : null,
    status: parsed.data.status,
    tags: normalizeContactTags(parsed.data.tags),
  };
  let { data: createdContact, error } = await supabase.from("contacts").insert(payload).select("id").single();

  if (isContactKindSchemaCacheError(error)) {
    return { ok: false, message: "Appliquez la migration 049 avant de creer une personne ou un lieu." };
  }

  if (isContactTagsSchemaCacheError(error)) {
    const fallbackPayload = {
      company_id: payload.company_id,
      name: payload.name,
      organization: payload.organization,
      role: payload.role,
      email: payload.email,
      city: payload.city,
      status: payload.status,
    };
    const retry = await supabase.from("contacts").insert(fallbackPayload).select("id").single();
    createdContact = retry.data;
    error = retry.error;
  }

  if (error) {
    return { ok: false, message: error.message };
  }

  if (parsed.data.contactType === "venue" && parsed.data.directorName?.trim() && createdContact?.id) {
    const { error: directorError } = await supabase.from("contacts").insert({
      company_id: workspace.companyId,
      contact_type: "person",
      venue_id: createdContact.id,
      name: parsed.data.directorName.trim(),
      organization: parsed.data.name,
      role: "Direction",
      email: parsed.data.directorEmail || null,
      phone: parsed.data.directorPhone || null,
      city: parsed.data.city || null,
      status: parsed.data.status,
      tags: ["Direction"],
    });

    if (directorError) {
      await supabase.from("contacts").delete().eq("id", createdContact.id);
      return { ok: false, message: `Le lieu n'a pas ete cree : ${directorError.message}` };
    }
  }

  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  await logActivity("a cree le contact", "contact", parsed.data.name);

  return { ok: true, message: "Contact cree." };
}

export async function importContacts(
  values: ContactFormValues[],
): Promise<ActionResult & { imported: number; skipped: number }> {
  const limitedValues = values.slice(0, 300);
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
  const payload = parsedContacts.map((contact) => ({
    company_id: workspace.companyId,
    contact_type: contact.contactType,
    venue_id: null,
    name: contact.name,
    organization: contact.contactType === "venue" ? contact.name : contact.organization,
    role: contact.contactType === "venue" ? "Lieu" : contact.role || null,
    email: contact.email || null,
    phone: contact.phone || null,
    city: contact.city || null,
    address: contact.contactType === "venue" ? contact.address || null : null,
    postal_code: contact.contactType === "venue" ? contact.postalCode || null : null,
    department: contact.contactType === "venue" ? contact.department || null : null,
    region: contact.contactType === "venue" ? contact.region || null : null,
    website: contact.contactType === "venue" ? contact.website || null : null,
    capacity: contact.contactType === "venue" && contact.capacity ? Number(contact.capacity) : null,
    latitude: contact.contactType === "venue" && contact.latitude ? Number(contact.latitude.replace(",", ".")) : null,
    longitude: contact.contactType === "venue" && contact.longitude ? Number(contact.longitude.replace(",", ".")) : null,
    status: contact.status,
    tags: normalizeContactTags(contact.tags),
  }));
  let { error } = await supabase.from("contacts").insert(payload);

  if (isContactTagsSchemaCacheError(error)) {
    const fallbackPayload = payload.map((contact) => ({
      company_id: contact.company_id,
      name: contact.name,
      organization: contact.organization,
      role: contact.role,
      email: contact.email,
      city: contact.city,
      status: contact.status,
    }));
    const retry = await supabase.from("contacts").insert(fallbackPayload);
    error = retry.error;
  }

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
  const contactPayload = {
    company_id: workspace.companyId,
    name: parsedContact.data.name,
    organization: parsedContact.data.organization,
    role: parsedContact.data.role || null,
    email: parsedContact.data.email || null,
    phone: parsedContact.data.phone || null,
    city: parsedContact.data.city || null,
    status: parsedContact.data.status,
  };
  let { data: contact, error } = await supabase
    .from("contacts")
    .insert(contactPayload)
    .select("id")
    .single();

  if (isContactTagsSchemaCacheError(error)) {
    const retry = await supabase
      .from("contacts")
      .insert({
        company_id: contactPayload.company_id,
        name: contactPayload.name,
        organization: contactPayload.organization,
        role: contactPayload.role,
        email: contactPayload.email,
        city: contactPayload.city,
        status: contactPayload.status,
      })
      .select("id")
      .single();
    contact = retry.data;
    error = retry.error;
  }

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
  const revenue = calculateCompanyRevenue(parsed.data);
  const williamAction = getWilliamOpportunityAction(
    parsed.data.stage,
    parsed.data.exploitationMode,
  );
  const basePayload = {
    company_id: workspace.companyId,
    title: parsed.data.title,
    contact_id: parsed.data.contactId || null,
    show_id: parsed.data.showId || null,
    stage: parsed.data.stage,
    value: revenue,
    probability: getDefaultProbability(parsed.data.stage),
    exploitation_mode: parsed.data.exploitationMode,
    cession_fee: parsed.data.cessionFee,
    estimated_box_office: parsed.data.estimatedBoxOffice,
    company_share_percent: parsed.data.companySharePercent,
    minimum_guarantee: parsed.data.minimumGuarantee,
    venue_rental: parsed.data.venueRental,
    performance_date: parsed.data.performanceDate || null,
    next_action: parsed.data.nextAction || williamAction.action || null,
    next_follow_up_at: parsed.data.nextFollowUpAt || williamAction.dueDate || null,
    lost_reason: parsed.data.stage === "Perdu" ? parsed.data.lostReason || null : null,
  };
  let { data: opportunity, error } = await supabase
    .from("opportunities")
    .insert(basePayload)
    .select("id")
    .single();

  if (error && isOpportunityExploitationSchemaError(error.message)) {
    return { ok: false, message: "Appliquez la migration SQL 036 avant de créer une diffusion." };
  }

  if (error && isOpportunitySchemaCacheError(error.message)) {
    const retry = await supabase
      .from("opportunities")
      .insert(withoutOptionalOpportunityColumns(basePayload))
      .select("id")
      .single();

    opportunity = retry.data;
    error = retry.error;
  }

  if (error || !opportunity) {
    return { ok: false, message: error?.message ?? "Date non creee." };
  }

  const nextFollowUpAt = parsed.data.nextFollowUpAt || williamAction.dueDate;
  const nextAction = parsed.data.nextAction || williamAction.action;

  if (nextFollowUpAt && nextAction) {
    await ensureOpportunityReminder({
      companyId: workspace.companyId,
      title: nextAction,
      dueDate: nextFollowUpAt,
      relatedTo: parsed.data.title,
      priority: getDefaultProbability(parsed.data.stage) >= 60 ? "high" : "normal",
      opportunityId: opportunity.id,
      contactId: parsed.data.contactId || null,
      showId: parsed.data.showId || null,
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  if (parsed.data.showId) {
    revalidatePath(`/shows/${parsed.data.showId}`);
  }

  await logActivity("a cree la date possible", "diffusion", parsed.data.title);

  return {
    ok: true,
    message: nextFollowUpAt ? "Diffusion créée avec l'action proposée par William." : "Diffusion créée.",
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
  const revenue = calculateCompanyRevenue(parsed.data);
  const basePayload = {
    title: parsed.data.title,
    contact_id: parsed.data.contactId || null,
    show_id: parsed.data.showId || null,
    stage: parsed.data.stage,
    value: revenue,
    probability: getDefaultProbability(parsed.data.stage),
    exploitation_mode: parsed.data.exploitationMode,
    cession_fee: parsed.data.cessionFee,
    estimated_box_office: parsed.data.estimatedBoxOffice,
    company_share_percent: parsed.data.companySharePercent,
    minimum_guarantee: parsed.data.minimumGuarantee,
    venue_rental: parsed.data.venueRental,
    performance_date: parsed.data.performanceDate || null,
    next_action: parsed.data.nextAction || null,
    next_follow_up_at: parsed.data.nextFollowUpAt || null,
    lost_reason: parsed.data.stage === "Perdu" ? parsed.data.lostReason || null : null,
  };
  let { error } = await supabase
    .from("opportunities")
    .update(basePayload)
    .eq("id", opportunityId);

  if (error && isOpportunityExploitationSchemaError(error.message)) {
    return { ok: false, message: "Appliquez la migration SQL 036 avant de modifier cette diffusion." };
  }

  if (error && isOpportunitySchemaCacheError(error.message)) {
    const retry = await supabase
      .from("opportunities")
      .update(withoutOptionalOpportunityColumns(basePayload))
      .eq("id", opportunityId);

    error = retry.error;
  }

  if (error) {
    return { ok: false, message: error.message };
  }

  if (parsed.data.nextFollowUpAt && parsed.data.stage !== "Confirme" && parsed.data.stage !== "Perdu") {
    const workspace = await getOrCreateWorkspace();

    if (workspace.companyId) {
      await ensureOpportunityReminder({
        companyId: workspace.companyId,
        title: parsed.data.nextAction || `Contacter ${parsed.data.title}`,
        dueDate: parsed.data.nextFollowUpAt,
        relatedTo: parsed.data.title,
        priority: parsed.data.probability >= 60 ? "high" : "normal",
        opportunityId,
        contactId: parsed.data.contactId || null,
        showId: parsed.data.showId || null,
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
  if (parsed.data.showId) {
    revalidatePath(`/shows/${parsed.data.showId}`);
  }

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
      .select("id,title,contact_id,show_id,next_action")
      .eq("id", opportunityId)
      .single();

    if (opportunity && workspace.companyId) {
      await ensureOpportunityReminder({
        companyId: workspace.companyId,
        title: opportunity.next_action || `Contacter ${opportunity.title}`,
        dueDate: followUpDate,
        relatedTo: opportunity.title,
        priority: "normal",
        opportunityId: opportunity.id,
        contactId: opportunity.contact_id,
        showId: opportunity.show_id,
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

  return { ok: true, message: "Date mise a jour." };
}

export async function scheduleOpportunityFollowUp(
  opportunityId: string,
  days: 3 | 7,
): Promise<ActionResult & { dueDate?: string }> {
  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: `Mode demo : action planifiee a J+${days}.`,
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
    .select("id,title,contact_id,show_id,next_action,stage")
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
    title: opportunity.next_action || `Contacter ${opportunity.title}`,
    dueDate,
    relatedTo: opportunity.title,
    priority: days === 3 ? "high" : "normal",
    opportunityId: opportunity.id,
    contactId: opportunity.contact_id,
    showId: opportunity.show_id,
  });

  if (!reminderResult.ok) {
    return reminderResult;
  }

  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  await logActivity("a planifie une action", "action", opportunity.title);

  return {
    ok: true,
    message: days === 3 ? "Action prioritaire planifiee a J+3." : "Action planifiee a J+7.",
    dueDate,
  };
}

export async function createPerformanceInvitation(
  opportunityId: string,
  performanceOpportunityId: string,
): Promise<PerformanceInvitationResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Les invitations publiques necessitent Supabase." };
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
  const [{ data: target, error: targetError }, { data: performance, error: performanceError }] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select("id,company_id,contact_id,show_id,title,contacts(name,email),shows(title)")
        .eq("id", opportunityId)
        .single(),
      supabase
        .from("opportunities")
        .select("id,company_id,show_id,stage,performance_date,contacts(organization),shows(title)")
        .eq("id", performanceOpportunityId)
        .single(),
    ]);

  if (targetError || !target) {
    return { ok: false, message: targetError?.message ?? "Date a relancer introuvable." };
  }

  if (performanceError || !performance) {
    return { ok: false, message: performanceError?.message ?? "Representation introuvable." };
  }

  if (
    target.company_id !== workspace.companyId ||
    performance.company_id !== workspace.companyId ||
    !target.show_id ||
    target.show_id !== performance.show_id
  ) {
    return { ok: false, message: "La representation doit concerner le meme spectacle." };
  }

  if (performance.stage !== "Confirme" || !performance.performance_date) {
    return { ok: false, message: "Choisissez une representation confirmee avec une date de jeu." };
  }

  const recipientEmail = target.contacts?.email?.trim() ?? "";
  const recipientName = target.contacts?.name?.trim() ?? "";

  if (!target.contact_id || !recipientEmail || !recipientName) {
    return { ok: false, message: "Le contact doit avoir un nom et une adresse email." };
  }

  const subject = `Invitation - ${target.shows?.title ?? performance.shows?.title ?? target.title}`;
  const { data: userData } = await supabase.auth.getUser();
  const existing = await supabase
    .from("performance_invitations")
    .select(
      "id,token,performance_opportunity_id,recipient_name,recipient_email,subject,performance_date,venue,sent_at,delivered_at,email_opened_at,email_clicked_at,bounced_at,link_opened_at,responded_at,response,created_at",
    )
    .eq("opportunity_id", opportunityId)
    .eq("performance_opportunity_id", performanceOpportunityId)
    .eq("recipient_email", recipientEmail)
    .is("response", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let invitation = existing.data;

  if (!invitation) {
    const created = await supabase
      .from("performance_invitations")
      .insert({
        company_id: workspace.companyId,
        opportunity_id: opportunityId,
        performance_opportunity_id: performanceOpportunityId,
        contact_id: target.contact_id,
        show_id: target.show_id,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        subject,
        performance_date: performance.performance_date,
        venue: performance.contacts?.organization ?? null,
        created_by: userData.user?.id ?? null,
      })
      .select(
        "id,token,performance_opportunity_id,recipient_name,recipient_email,subject,performance_date,venue,sent_at,delivered_at,email_opened_at,email_clicked_at,bounced_at,link_opened_at,responded_at,response,created_at",
      )
      .single();

    if (created.error || !created.data) {
      return {
        ok: false,
        message:
          created.error?.message ??
          "Invitation non creee. Verifiez que la migration 032 est appliquee.",
      };
    }

    invitation = created.data;
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  revalidatePath("/pipeline");
  await logActivity("a prepare une invitation", "diffusion", recipientName);

  return {
    ok: true,
    message: "Invitation personnalisee preparee.",
    invitation: {
      id: invitation.id,
      performanceOpportunityId: invitation.performance_opportunity_id,
      recipientName: invitation.recipient_name,
      recipientEmail: invitation.recipient_email,
      subject: invitation.subject,
      performanceDate: invitation.performance_date,
      venue: invitation.venue ?? "",
      sentAt: invitation.sent_at ?? "",
      deliveredAt: invitation.delivered_at ?? "",
      emailOpenedAt: invitation.email_opened_at ?? "",
      emailClickedAt: invitation.email_clicked_at ?? "",
      bouncedAt: invitation.bounced_at ?? "",
      linkOpenedAt: invitation.link_opened_at ?? "",
      respondedAt: invitation.responded_at ?? "",
      response: invitation.response,
      createdAt: invitation.created_at,
      url: `${appUrl}/invitation/${invitation.token}`,
    },
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

  const contactPayload = demoContacts.map((contact) => ({
    company_id: companyId,
    name: contact.name,
    organization: contact.organization,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
    city: contact.city,
    status: contact.status,
    tags: contact.tags,
  }));
  let { data: insertedContacts, error: contactsError } = await supabase
    .from("contacts")
    .insert(contactPayload)
    .select("id,name");

  if (isContactTagsSchemaCacheError(contactsError)) {
    const fallbackPayload = contactPayload.map((contact) => ({
      company_id: contact.company_id,
      name: contact.name,
      organization: contact.organization,
      role: contact.role,
      email: contact.email,
      city: contact.city,
      status: contact.status,
    }));
    const retry = await supabase.from("contacts").insert(fallbackPayload).select("id,name");
    insertedContacts = retry.data;
    contactsError = retry.error;
  }

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
        performance_date:
          opportunity.performanceInDays === null ? null : demoDate(opportunity.performanceInDays),
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

export async function updateGrantShow(grantId: string, showId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : spectacle rattache." };
  }

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };

  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  if (showId) {
    const { data: show } = await supabase
      .from("shows")
      .select("id")
      .eq("id", showId)
      .eq("company_id", workspace.companyId)
      .maybeSingle();
    if (!show) return { ok: false, message: "Ce spectacle n'appartient pas a la compagnie." };
  }

  const { error } = await supabase
    .from("grant_opportunities")
    .update({ show_id: showId || null })
    .eq("id", grantId)
    .eq("company_id", workspace.companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  await logActivity("a rattache une subvention a un spectacle", "subvention", showId || "compagnie");

  return { ok: true, message: showId ? "Spectacle rattache." : "Aide classee au niveau de la compagnie." };
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
    return { ok: false, message: "Le formulaire action contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: "Mode demo : action ajoutee pour cette visite.",
      reminder: {
        id: `demo-${Date.now()}`,
        label: parsed.data.title,
        dueDate: parsed.data.dueDate,
        relatedTo: parsed.data.relatedTo ?? "",
        done: false,
        priority: parsed.data.priority,
        showId: parsed.data.showId,
        contactId: parsed.data.contactId,
        actionType: parsed.data.actionType ?? "other",
      },
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
      return { ok: true, message: "Action deja ouverte pour cette date." };
    }
  }

  const reminderPayload = {
    company_id: workspace.companyId,
    title: parsed.data.title,
    due_date: parsed.data.dueDate,
    related_to: parsed.data.relatedTo || null,
    priority: parsed.data.priority,
    opportunity_id: parsed.data.opportunityId || null,
    contact_id: parsed.data.contactId || null,
    show_id: parsed.data.showId || null,
    action_type: parsed.data.actionType ?? "other",
  };
  let { data: createdReminder, error } = await supabase
    .from("reminders")
    .insert(reminderPayload)
    .select("id,title,due_date,related_to,done,priority,show_id,contact_id,action_type")
    .single();

  if (error && isReminderOptionalColumnError(error.message)) {
    const fallback = await supabase
      .from("reminders")
      .insert({
        company_id: reminderPayload.company_id,
        title: reminderPayload.title,
        due_date: reminderPayload.due_date,
        related_to: reminderPayload.related_to,
        priority: reminderPayload.priority,
        opportunity_id: reminderPayload.opportunity_id,
        contact_id: reminderPayload.contact_id,
      })
      .select("id,title,due_date,related_to,done,priority,contact_id")
      .single();

    createdReminder = fallback.data
      ? { ...fallback.data, show_id: null, action_type: "other" as const }
      : null;
    error = fallback.error;
  }

  if (error || !createdReminder) {
    return { ok: false, message: error?.message ?? "Action non creee." };
  }

  revalidatePath("/reminders");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  await logActivity("a cree l'action", "action", parsed.data.title);

  return {
    ok: true,
    message: "Action creee.",
    reminder: {
      id: createdReminder.id,
      label: createdReminder.title,
      dueDate: createdReminder.due_date,
      relatedTo: createdReminder.related_to ?? "",
      done: createdReminder.done,
      priority: createdReminder.priority,
      showId: createdReminder.show_id ?? undefined,
      contactId: createdReminder.contact_id ?? undefined,
      actionType: createdReminder.action_type,
    },
  };
}

function isReminderOptionalColumnError(message: string) {
  return ["show_id", "action_type", "completion_", "reminder_events", "schema cache"]
    .some((fragment) => message.toLowerCase().includes(fragment.toLowerCase()));
}

export async function updateReminder(
  reminderId: string,
  values: ReminderFormInput,
): Promise<ActionResult> {
  const parsed = reminderSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire action contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : action mise a jour, non enregistree." };
  }

  const accessError = await requireWriteAccess();

  if (accessError) {
    return { ok: false, message: accessError };
  }

  const supabase = await getSupabaseServerClient();
  const updatePayload: Database["public"]["Tables"]["reminders"]["Update"] = {
    title: parsed.data.title,
    due_date: parsed.data.dueDate,
    related_to: parsed.data.relatedTo || null,
    priority: parsed.data.priority,
  };
  if (parsed.data.showId !== undefined) updatePayload.show_id = parsed.data.showId || null;
  if (parsed.data.actionType !== undefined) updatePayload.action_type = parsed.data.actionType;

  const { error } = await supabase
    .from("reminders")
    .update(updatePayload)
    .eq("id", reminderId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/reminders");
  revalidatePath("/pipeline");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  await logActivity("a modifie l'action", "action", parsed.data.title);

  return { ok: true, message: "Action mise a jour." };
}

export async function createRemindersForContacts(
  contactIds: string[],
  values: ReminderFormInput,
): Promise<ActionResult> {
  const parsed = reminderSchema.safeParse(values);
  const uniqueContactIds = Array.from(new Set(contactIds.filter(Boolean)));

  if (!parsed.success || !parsed.data.showId) {
    return { ok: false, message: "Le spectacle, l'action et la date sont requis." };
  }

  if (uniqueContactIds.length < 2 || uniqueContactIds.length > 200) {
    return { ok: false, message: "Selectionnez entre 2 et 200 contacts." };
  }

  const parsedData = parsed.data;

  function reminderTitle(contactName: string) {
    return parsedData.title.includes("@contact")
      ? parsedData.title.replaceAll("@contact", contactName)
      : `${parsedData.title} - ${contactName}`;
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: `Mode demo : ${uniqueContactIds.length} actions ajoutees.`,
      reminders: uniqueContactIds.map((contactId, index) => ({
        id: `demo-group-${Date.now()}-${index}`,
        label: reminderTitle(`contact ${index + 1}`),
        dueDate: parsed.data.dueDate,
        relatedTo: parsed.data.relatedTo ?? "",
        done: false,
        priority: parsed.data.priority,
        showId: parsed.data.showId,
        contactId,
        actionType: parsed.data.actionType ?? "other",
      })),
    };
  }

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };

  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const [{ data: contactRows, error: contactsError }, { data: showRow, error: showError }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id,name")
      .eq("company_id", workspace.companyId)
      .in("id", uniqueContactIds),
    supabase
      .from("shows")
      .select("id,title")
      .eq("company_id", workspace.companyId)
      .eq("id", parsed.data.showId)
      .maybeSingle(),
  ]);

  if (contactsError || showError) {
    return { ok: false, message: contactsError?.message ?? showError?.message ?? "Verification impossible." };
  }

  if (!contactRows || contactRows.length !== uniqueContactIds.length) {
    return { ok: false, message: "Un contact est introuvable ou n'appartient pas a cette compagnie." };
  }

  if (!showRow) {
    return { ok: false, message: "Ce spectacle n'appartient pas a cette compagnie." };
  }

  const { data: createdRows, error } = await supabase
    .from("reminders")
    .insert(contactRows.map((contact) => ({
      company_id: workspace.companyId,
      title: reminderTitle(contact.name),
      due_date: parsed.data.dueDate,
      related_to: showRow.title,
      priority: parsed.data.priority,
      contact_id: contact.id,
      show_id: showRow.id,
      action_type: parsed.data.actionType ?? "other",
    })))
    .select("id,title,due_date,related_to,done,priority,show_id,contact_id,action_type");

  if (error || !createdRows || createdRows.length !== contactRows.length) {
    return { ok: false, message: error?.message ?? "Les actions n'ont pas toutes ete creees." };
  }

  const createdReminders: Reminder[] = createdRows.map((reminder) => ({
    id: reminder.id,
    label: reminder.title,
    dueDate: reminder.due_date,
    relatedTo: reminder.related_to ?? "",
    done: reminder.done,
    priority: reminder.priority,
    showId: reminder.show_id ?? undefined,
    contactId: reminder.contact_id ?? undefined,
    actionType: reminder.action_type,
  }));

  revalidatePath("/reminders");
  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  await logActivity(
    "a cree des actions groupees",
    "action",
    `${createdReminders.length} contact(s) - ${showRow.title}`,
  );

  return {
    ok: true,
    message: `${createdReminders.length} actions creees.`,
    reminders: createdReminders,
  };
}

export async function completeReminder(
  reminderId: string,
  values: ReminderCompletionInput = {},
): Promise<ActionResult> {
  const parsed = reminderCompletionSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Le compte rendu est invalide." };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: "Mode demo : action terminee.",
      reminder: {
        id: reminderId,
        label: "Action terminee",
        dueDate: new Date().toISOString().slice(0, 10),
        relatedTo: "",
        done: true,
        priority: "normal",
        completedAt: new Date().toISOString(),
        completionOutcome: parsed.data.outcome,
        completionNote: parsed.data.note,
      },
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
  const completedAt = new Date().toISOString();
  const { data: completedReminder, error } = await supabase
    .from("reminders")
    .update({
      done: true,
      completed_at: completedAt,
      completion_outcome: parsed.data.outcome ?? null,
      completion_note: parsed.data.note?.trim() || null,
    })
    .eq("id", reminderId)
    .eq("company_id", workspace.companyId)
    .eq("done", false)
    .select("id,title,due_date,related_to,done,priority,show_id,contact_id,action_type,completed_at,completion_outcome,completion_note")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: error.message.includes("completion_") || error.message.includes("reminder_events")
        ? "Appliquez la migration 050_reminder_completion_history.sql avant de terminer une action."
        : error.message,
    };
  }

  if (!completedReminder) {
    return { ok: false, message: "Action introuvable ou deja terminee." };
  }

  revalidatePath("/reminders");
  revalidatePath("/dashboard");

  await logActivity("a termine une action", "action");

  return {
    ok: true,
    message: "Action terminee.",
    reminder: mapReminderRow(completedReminder),
  };
}

export async function reopenReminder(reminderId: string): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : action rouverte." };
  }

  const accessError = await requireWriteAccess();
  if (accessError) return { ok: false, message: accessError };

  const workspace = await getOrCreateWorkspace();
  if (!workspace.companyId) return { ok: false, message: workspace.error ?? "Compagnie introuvable." };

  const supabase = await getSupabaseServerClient();
  const { data: reopenedReminder, error } = await supabase
    .from("reminders")
    .update({
      done: false,
      completed_at: null,
      completion_outcome: null,
      completion_note: null,
    })
    .eq("id", reminderId)
    .eq("company_id", workspace.companyId)
    .eq("done", true)
    .select("id,title,due_date,related_to,done,priority,show_id,contact_id,action_type,completed_at,completion_outcome,completion_note")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!reopenedReminder) return { ok: false, message: "Action introuvable ou deja ouverte." };

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  await logActivity("a rouvert une action", "action", reopenedReminder.title);

  return { ok: true, message: "Action rouverte.", reminder: mapReminderRow(reopenedReminder) };
}

function mapReminderRow(reminder: {
  id: string;
  title: string;
  due_date: string;
  related_to: string | null;
  done: boolean;
  priority: "low" | "normal" | "high";
  show_id: string | null;
  contact_id: string | null;
  action_type: Reminder["actionType"];
  completed_at: string | null;
  completion_outcome: Reminder["completionOutcome"] | null;
  completion_note: string | null;
}): Reminder {
  return {
    id: reminder.id,
    label: reminder.title,
    dueDate: reminder.due_date,
    relatedTo: reminder.related_to ?? "",
    done: reminder.done,
    priority: reminder.priority,
    showId: reminder.show_id ?? undefined,
    contactId: reminder.contact_id ?? undefined,
    actionType: reminder.action_type,
    completedAt: reminder.completed_at ?? undefined,
    completionOutcome: reminder.completion_outcome ?? undefined,
    completionNote: reminder.completion_note ?? undefined,
  };
}
