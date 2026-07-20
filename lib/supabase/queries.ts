import {
  betaSignups,
  billingPlans,
  commercialPacks,
  contacts,
  dashboardStats,
  emailCampaigns,
  fixedCosts,
  grantOpportunities,
  patronageDeals,
  pipelineDeals,
  quoteItems,
  reminders,
  showBudgetItems,
  showDocuments,
  shows,
  treasurySnapshot,
} from "@/data/mock-data";
import { hasSupabaseEnv } from "@/lib/env";
import { buildDownloadFileName } from "@/lib/documents-upload";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActivityEntry,
  BillingPlan,
  CalendarEvent,
  CommercialPack,
  CompanyDocument,
  CompanyMember,
  CompanyProfile,
  Contact,
  EmailCampaign,
  EmailTemplate,
  FixedCost,
  GrantOpportunity,
  PatronageDeal,
  PipelineDeal,
  QuoteItem,
  Reminder,
  Show,
  ShowBudgetItem,
  ShowDocument,
  TreasurySnapshot,
} from "@/types";

const betaReservedSeatLimit = 30;

type DashboardStat = {
  detail: string;
  label: string;
  value: string;
};

export async function getShows(): Promise<Show[]> {
  if (!hasSupabaseEnv()) {
    return shows;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((show) => ({
    id: show.id,
    title: show.title,
    discipline: show.discipline,
    status: show.status,
    nextDate: show.next_date ?? "",
    budget: show.budget ?? 0,
    detailedBudgetEnabled:
      "detailed_budget_enabled" in show ? Boolean(show.detailed_budget_enabled) : false,
    logline: "logline" in show ? show.logline ?? "" : "",
    themes: "themes" in show ? show.themes ?? [] : [],
    targetAudience: "target_audience" in show ? show.target_audience ?? "" : "",
    emailPitch: "email_pitch" in show ? show.email_pitch ?? "" : "",
    notes: show.notes ?? "",
    posterUrl: show.poster_url ?? "",
  }));
}

export async function getShowById(showId: string): Promise<{
  budgetItems: ShowBudgetItem[];
  documents: ShowDocument[];
  opportunities: PipelineDeal[];
  reminders: Reminder[];
  show: Show | null;
}> {
  if (!hasSupabaseEnv()) {
    const show = shows.find((item) => item.id === showId) ?? null;
    const opportunities = pipelineDeals.filter((deal) => deal.showId === showId);
    const relatedTitles = new Set(opportunities.map((deal) => deal.title));
    const filteredReminders = reminders.filter(
      (reminder) => reminder.relatedTo === show?.title || relatedTitles.has(reminder.relatedTo),
    );

    return {
      documents: showDocuments.filter((document) => document.showId === showId),
      budgetItems: showBudgetItems.filter((item) => item.showId === showId),
      show,
      opportunities,
      reminders: filteredReminders,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data: show, error: showError } = await supabase
    .from("shows")
    .select("*")
    .eq("id", showId)
    .maybeSingle();

  if (showError || !show) {
    return { budgetItems: [], documents: [], show: null, opportunities: [], reminders: [] };
  }

  const [
    { data: opportunities, error: opportunitiesError },
    { data: documents, error: documentsError },
    { data: budgetRows, error: budgetError },
  ] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select(
          "id,title,contact_id,show_id,stage,value,probability,exploitation_mode,cession_fee,estimated_box_office,company_share_percent,minimum_guarantee,venue_rental,performance_date,next_action,next_follow_up_at,lost_reason,created_at,contacts(name,organization,email),shows(title)",
        )
        .eq("show_id", showId)
        .order("created_at", { ascending: false }),
      supabase
        .from("show_documents")
        .select("id,show_id,title,document_type,status,file_url,storage_path,notes,updated_at")
        .eq("show_id", showId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("show_budget_items")
        .select("id,show_id,kind,category,label,amount,sort_order")
        .eq("show_id", showId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  const resolvedShow: Show = {
    id: show.id,
    title: show.title,
    discipline: show.discipline,
    status: show.status,
    nextDate: show.next_date ?? "",
    budget: show.budget ?? 0,
    detailedBudgetEnabled:
      "detailed_budget_enabled" in show ? Boolean(show.detailed_budget_enabled) : false,
    logline: "logline" in show ? show.logline ?? "" : "",
    themes: "themes" in show ? show.themes ?? [] : [],
    targetAudience: "target_audience" in show ? show.target_audience ?? "" : "",
    emailPitch: "email_pitch" in show ? show.email_pitch ?? "" : "",
    notes: show.notes ?? "",
    posterUrl: show.poster_url ?? "",
  };

  const resolvedDocuments: ShowDocument[] =
    documentsError || !documents ? [] : await mapShowDocumentRows(documents);
  const resolvedBudgetItems: ShowBudgetItem[] =
    budgetError || !budgetRows
      ? []
      : budgetRows.map((item) => ({
          id: item.id,
          showId: item.show_id,
          kind: item.kind,
          category: item.category,
          label: item.label,
          amount: item.amount ?? 0,
          sortOrder: item.sort_order,
        }));

  const resolvedOpportunities: PipelineDeal[] =
    opportunitiesError || !opportunities
      ? []
      : opportunities.map((deal) => ({
          id: deal.id,
          title: deal.title,
          contactId: deal.contact_id ?? "",
          showId: deal.show_id ?? "",
          venue: deal.contacts?.organization ?? "Structure a renseigner",
          stage: deal.stage as PipelineDeal["stage"],
          value: deal.value ?? 0,
          probability: deal.probability ?? 0,
          exploitationMode: (deal.exploitation_mode ?? "cession") as PipelineDeal["exploitationMode"],
          cessionFee: deal.cession_fee ?? 0,
          estimatedBoxOffice: deal.estimated_box_office ?? 0,
          companySharePercent: deal.company_share_percent ?? 50,
          minimumGuarantee: deal.minimum_guarantee ?? 0,
          venueRental: deal.venue_rental ?? 0,
          performanceDate: deal.performance_date ?? "",
          nextAction: deal.next_action ?? "Prochaine action a definir",
          nextFollowUpAt: deal.next_follow_up_at ?? "",
          lostReason: deal.lost_reason ?? "",
          contactName: deal.contacts?.name ?? "Contact a renseigner",
          contactOrganization: deal.contacts?.organization ?? "",
          contactEmail: deal.contacts?.email ?? "",
          showTitle: deal.shows?.title ?? resolvedShow.title,
          createdAt: deal.created_at,
        }));

  const opportunityIds = resolvedOpportunities.map((deal) => deal.id);
  const reminderQuery = supabase
    .from("reminders")
    .select("id,title,due_date,related_to,done,priority,opportunity_id")
    .eq("done", false)
    .order("due_date", { ascending: true });

  const { data: reminderRows, error: remindersError } =
    opportunityIds.length > 0
      ? await reminderQuery.in("opportunity_id", opportunityIds)
      : { data: [], error: null };

  if (remindersError || !reminderRows) {
    return {
      documents: resolvedDocuments,
      budgetItems: resolvedBudgetItems,
      show: resolvedShow,
      opportunities: resolvedOpportunities,
      reminders: [],
    };
  }

  return {
    documents: resolvedDocuments,
    budgetItems: resolvedBudgetItems,
    show: resolvedShow,
    opportunities: resolvedOpportunities,
    reminders: reminderRows.map((reminder) => ({
      id: reminder.id,
      label: reminder.title,
      dueDate: reminder.due_date,
      relatedTo: reminder.related_to ?? "",
      done: reminder.done,
      priority: reminder.priority,
    })),
  };
}

function isContactOptionalColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("tags") || error?.message?.includes("phone"));
}

export async function getContacts(): Promise<Contact[]> {
  if (!hasSupabaseEnv()) {
    return contacts;
  }

  const supabase = await getSupabaseServerClient();
  const query = supabase
    .from("contacts")
    .select("id,name,organization,role,email,phone,city,status,tags")
    .order("created_at", { ascending: false });

  let { data, error } = await query;

  if (isContactOptionalColumnError(error)) {
    const fallback = await supabase
      .from("contacts")
      .select("id,name,organization,role,email,city,status")
      .order("created_at", { ascending: false });
    data = fallback.data?.map((contact) => ({ ...contact, phone: "", tags: [] })) ?? null;
    error = fallback.error;
  }

  if (error || !data) {
    return [];
  }

  return data.map((contact) => ({
    id: contact.id,
    name: contact.name,
    organization: contact.organization,
    role: contact.role ?? "",
    email: contact.email ?? "",
    phone: "phone" in contact ? contact.phone ?? "" : "",
    city: contact.city ?? "",
    status: contact.status,
    tags: "tags" in contact && Array.isArray(contact.tags) ? contact.tags : [],
  }));
}

export async function getContactById(contactId: string): Promise<{
  contact: Contact | null;
  opportunities: PipelineDeal[];
  reminders: Reminder[];
  shows: Show[];
}> {
  if (!hasSupabaseEnv()) {
    const contact = contacts.find((item) => item.id === contactId) ?? null;
    const opportunities = pipelineDeals.filter((deal) => deal.contactId === contactId);
    const relatedShowIds = new Set(opportunities.map((deal) => deal.showId));
    const relatedShows = shows.filter((show) => relatedShowIds.has(show.id));
    const relatedLabels = new Set([
      ...opportunities.map((deal) => deal.title),
      ...relatedShows.map((show) => show.title),
      contact?.name ?? "",
      contact?.organization ?? "",
    ]);
    const filteredReminders = reminders.filter((reminder) => relatedLabels.has(reminder.relatedTo));

    return {
      contact,
      opportunities,
      reminders: filteredReminders,
      shows: relatedShows,
    };
  }

  const supabase = await getSupabaseServerClient();
  const [contactResult, opportunityResult] = await Promise.all([
    supabase
      .from("contacts")
      .select("id,name,organization,role,email,phone,city,status,tags")
      .eq("id", contactId)
      .maybeSingle(),
    supabase
      .from("opportunities")
      .select(
        "id,title,contact_id,show_id,stage,value,probability,exploitation_mode,cession_fee,estimated_box_office,company_share_percent,minimum_guarantee,venue_rental,performance_date,next_action,next_follow_up_at,lost_reason,created_at,contacts(name,organization,email),shows(title,discipline,status,next_date,budget,notes,poster_url,id)",
      )
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
  ]);
  let { data: contact, error: contactError } = contactResult;
  const { data: opportunities, error: opportunitiesError } = opportunityResult;

  if (isContactOptionalColumnError(contactError)) {
    const fallback = await supabase
      .from("contacts")
      .select("id,name,organization,role,email,city,status")
      .eq("id", contactId)
      .maybeSingle();
    contact = fallback.data ? { ...fallback.data, phone: "", tags: [] } : null;
    contactError = fallback.error;
  }

  if (contactError || !contact || opportunitiesError || !opportunities) {
    return { contact: null, opportunities: [], reminders: [], shows: [] };
  }

  const resolvedContact: Contact = {
    id: contact.id,
    name: contact.name,
    organization: contact.organization,
    role: contact.role ?? "",
    email: contact.email ?? "",
    phone: "phone" in contact ? contact.phone ?? "" : "",
    city: contact.city ?? "",
    status: contact.status,
    tags: "tags" in contact && Array.isArray(contact.tags) ? contact.tags : [],
  };

  const resolvedOpportunities: PipelineDeal[] = opportunities.map((deal) => ({
    id: deal.id,
    title: deal.title,
    contactId: deal.contact_id ?? "",
    showId: deal.show_id ?? "",
    venue: deal.contacts?.organization ?? "Structure a renseigner",
    stage: deal.stage as PipelineDeal["stage"],
    value: deal.value ?? 0,
    probability: deal.probability ?? 0,
    exploitationMode: (deal.exploitation_mode ?? "cession") as PipelineDeal["exploitationMode"],
    cessionFee: deal.cession_fee ?? 0,
    estimatedBoxOffice: deal.estimated_box_office ?? 0,
    companySharePercent: deal.company_share_percent ?? 50,
    minimumGuarantee: deal.minimum_guarantee ?? 0,
    venueRental: deal.venue_rental ?? 0,
    performanceDate: deal.performance_date ?? "",
    nextAction: deal.next_action ?? "Prochaine action a definir",
    nextFollowUpAt: deal.next_follow_up_at ?? "",
    lostReason: deal.lost_reason ?? "",
    contactName: deal.contacts?.name ?? resolvedContact.name,
    contactOrganization: deal.contacts?.organization ?? resolvedContact.organization,
    contactEmail: deal.contacts?.email ?? resolvedContact.email,
    showTitle: deal.shows?.title ?? "Spectacle a associer",
    createdAt: deal.created_at,
  }));

  const relatedShowsMap = new Map<string, Show>();
  for (const opportunity of opportunities) {
    const show = opportunity.shows;
    if (show?.id) {
      relatedShowsMap.set(show.id, {
        id: show.id,
        title: show.title,
        discipline: show.discipline,
        status: show.status,
        nextDate: show.next_date ?? "",
        budget: show.budget ?? 0,
        notes: show.notes ?? "",
        posterUrl: show.poster_url ?? "",
      });
    }
  }

  const reminderQuery = supabase
    .from("reminders")
    .select("id,title,due_date,related_to,done,priority,contact_id,opportunity_id")
    .eq("done", false)
    .order("due_date", { ascending: true });

  const opportunityIds = resolvedOpportunities.map((deal) => deal.id);
  const reminderResponse =
    opportunityIds.length > 0
      ? await reminderQuery.or(
          `contact_id.eq.${contactId},opportunity_id.in.(${opportunityIds.join(",")})`,
        )
      : await reminderQuery.eq("contact_id", contactId);

  if (reminderResponse.error || !reminderResponse.data) {
    return {
      contact: resolvedContact,
      opportunities: resolvedOpportunities,
      reminders: [],
      shows: Array.from(relatedShowsMap.values()),
    };
  }

  return {
    contact: resolvedContact,
    opportunities: resolvedOpportunities,
    reminders: reminderResponse.data.map((reminder) => ({
      id: reminder.id,
      label: reminder.title,
      dueDate: reminder.due_date,
      relatedTo: reminder.related_to ?? "",
      done: reminder.done,
      priority: reminder.priority,
    })),
    shows: Array.from(relatedShowsMap.values()),
  };
}

export async function getPipelineDeals(): Promise<PipelineDeal[]> {
  if (!hasSupabaseEnv()) {
    return pipelineDeals;
  }

  const supabase = await getSupabaseServerClient();
  const [{ data, error }, invitationResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select(
        "id,title,contact_id,show_id,stage,value,probability,exploitation_mode,cession_fee,estimated_box_office,company_share_percent,minimum_guarantee,venue_rental,performance_date,next_action,next_follow_up_at,lost_reason,created_at,contacts(name,organization,email),shows(title)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("performance_invitations")
      .select(
        "id,opportunity_id,performance_opportunity_id,recipient_name,recipient_email,subject,performance_date,venue,sent_at,delivered_at,email_opened_at,email_clicked_at,bounced_at,link_opened_at,responded_at,response,created_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (error || !data) {
    return [];
  }

  const invitations = invitationResult.error ? [] : invitationResult.data ?? [];

  return data.map((deal) => ({
    id: deal.id,
    title: deal.title,
    contactId: deal.contact_id ?? "",
    showId: deal.show_id ?? "",
    venue: deal.contacts?.organization ?? "Structure a renseigner",
    stage: deal.stage as PipelineDeal["stage"],
    value: deal.value ?? 0,
    probability: deal.probability ?? 0,
    exploitationMode: (deal.exploitation_mode ?? "cession") as PipelineDeal["exploitationMode"],
    cessionFee: deal.cession_fee ?? 0,
    estimatedBoxOffice: deal.estimated_box_office ?? 0,
    companySharePercent: deal.company_share_percent ?? 50,
    minimumGuarantee: deal.minimum_guarantee ?? 0,
    venueRental: deal.venue_rental ?? 0,
    performanceDate: deal.performance_date ?? "",
    nextAction: deal.next_action ?? "Prochaine action a definir",
    nextFollowUpAt: deal.next_follow_up_at ?? "",
    lostReason: deal.lost_reason ?? "",
    contactName: deal.contacts?.name ?? "Contact a renseigner",
    contactOrganization: deal.contacts?.organization ?? "",
    contactEmail: deal.contacts?.email ?? "",
    showTitle: deal.shows?.title ?? "Spectacle a associer",
    createdAt: deal.created_at,
    invitations: invitations
      .filter((invitation) => invitation.opportunity_id === deal.id)
      .map((invitation) => ({
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
      })),
  }));
}

export async function getReminders(): Promise<Reminder[]> {
  if (!hasSupabaseEnv()) {
    return reminders;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("id,title,due_date,related_to,done,priority")
    .eq("done", false)
    .order("due_date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((reminder) => ({
    id: reminder.id,
    label: reminder.title,
    dueDate: reminder.due_date,
    relatedTo: reminder.related_to ?? "",
    done: reminder.done,
    priority: reminder.priority,
  }));
}

type ShowDocumentRow = {
  id: string;
  show_id: string;
  title: string;
  document_type: string;
  status: string;
  file_url: string | null;
  storage_path: string | null;
  notes: string | null;
  updated_at: string;
};

// Les fichiers stockes dans TaDiff (bucket prive "documents") sont exposes
// via des URLs signees d'une heure ; file_url reste utilise pour les liens externes.
// Chaque URL porte l'option "download" pour que le fichier telecharge reprenne
// le titre lisible (NOM_DU_SPECTACLE_TYPE_DATE) plutot que le nom stocke (uuid-slug).
async function mapShowDocumentRows(rows: ShowDocumentRow[]): Promise<ShowDocument[]> {
  const rowsWithPath = rows.filter(
    (row): row is ShowDocumentRow & { storage_path: string } => Boolean(row.storage_path),
  );
  const downloadUrlByPath = new Map<string, string>();
  const previewUrlByPath = new Map<string, string>();

  if (rowsWithPath.length > 0) {
    const supabase = await getSupabaseServerClient();
    const signed = await Promise.all(rowsWithPath.map(async (row) => {
      const [preview, download] = await Promise.all([
        supabase.storage.from("documents").createSignedUrl(row.storage_path, 3600),
        supabase.storage.from("documents").createSignedUrl(row.storage_path, 3600, {
          download: buildDownloadFileName(row.title, row.storage_path),
        }),
      ]);
      return { download: download.data?.signedUrl, preview: preview.data?.signedUrl, row };
    }));

    signed.forEach(({ download, preview, row }) => {
      if (download) downloadUrlByPath.set(row.storage_path, download);
      if (preview) previewUrlByPath.set(row.storage_path, preview);
    });
  }

  return rows.map((document) => ({
    id: document.id,
    showId: document.show_id,
    title: document.title,
    documentType: document.document_type as ShowDocument["documentType"],
    status: document.status as ShowDocument["status"],
    fileUrl:
      (document.storage_path ? downloadUrlByPath.get(document.storage_path) : undefined) ??
      document.file_url ??
      "",
    previewUrl:
      (document.storage_path ? previewUrlByPath.get(document.storage_path) : undefined) ??
      document.file_url ??
      "",
    storagePath: document.storage_path ?? "",
    notes: document.notes ?? "",
    updatedAt: document.updated_at,
  }));
}

export async function getShowDocuments(showId?: string): Promise<ShowDocument[]> {
  if (!hasSupabaseEnv()) {
    return showId
      ? showDocuments.filter((document) => document.showId === showId)
      : showDocuments;
  }

  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("show_documents")
    .select("id,show_id,title,document_type,status,file_url,storage_path,notes,updated_at")
    .order("updated_at", { ascending: false });

  if (showId) {
    query = query.eq("show_id", showId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return mapShowDocumentRows(data);
}

export async function getBetaSignupStats(): Promise<{
  remainingReservedSeats: number;
  reservedCount: number;
  waitlistCount: number;
}> {
  if (!hasSupabaseEnv()) {
    const reservedCount = betaSignups.filter((signup) => signup.status === "reserved").length;
    const waitlistCount = betaSignups.filter((signup) => signup.status === "waitlist").length;

    return {
      remainingReservedSeats: Math.max(0, betaReservedSeatLimit - reservedCount),
      reservedCount,
      waitlistCount,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_beta_signup_stats");
  const stats = Array.isArray(data) ? data[0] : data;

  if (error || !stats) {
    return {
      remainingReservedSeats: betaReservedSeatLimit,
      reservedCount: 0,
      waitlistCount: 0,
    };
  }

  return {
    remainingReservedSeats: Math.max(0, betaReservedSeatLimit - Number(stats.reserved_count ?? 0)),
    reservedCount: Number(stats.reserved_count ?? 0),
    waitlistCount: Number(stats.waitlist_count ?? 0),
  };
}

export async function getDashboardData() {
  const [resolvedShows, resolvedContacts, resolvedDeals, resolvedReminders] =
    await Promise.all([getShows(), getContacts(), getPipelineDeals(), getReminders()]);

  return {
    contacts: resolvedContacts,
    dashboardStats: hasSupabaseEnv()
      ? buildDashboardStats({
          contacts: resolvedContacts,
          deals: resolvedDeals,
          reminders: resolvedReminders,
          shows: resolvedShows,
        })
      : dashboardStats,
    pipelineDeals: resolvedDeals,
    reminders: resolvedReminders,
    shows: resolvedShows,
  };
}

export async function getCommercialPacks(): Promise<CommercialPack[]> {
  return commercialPacks;
}

export async function getGrantOpportunities(): Promise<GrantOpportunity[]> {
  if (!hasSupabaseEnv()) {
    return grantOpportunities;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("grant_opportunities")
    .select(
      "id,show_id,title,funder,territory,discipline,deadline,amount,status,requirements,eligibility,source_url,themes",
    )
    .order("deadline", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((grant) => ({
    id: grant.id,
    title: grant.title,
    funder: grant.funder,
    territory: grant.territory ?? "",
    discipline: grant.discipline ?? "",
    deadline: grant.deadline,
    amount: grant.amount,
    status: grant.status,
    relatedShowId: grant.show_id ?? undefined,
    requirements: (grant.requirements ?? []) as GrantOpportunity["requirements"],
    eligibility: grant.eligibility ?? undefined,
    sourceUrl: grant.source_url ?? undefined,
    themes: grant.themes ?? [],
  }));
}

export async function getPatronageDeals(): Promise<PatronageDeal[]> {
  if (!hasSupabaseEnv()) {
    return patronageDeals;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("patronage_deals")
    .select("id,company_name,contact_name,amount,status,next_action,next_follow_up_at,pack_id")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((deal) => ({
    id: deal.id,
    companyName: deal.company_name,
    contactName: deal.contact_name ?? "",
    amount: deal.amount,
    status: deal.status,
    nextAction: deal.next_action ?? "",
    nextFollowUpAt: deal.next_follow_up_at ?? "",
    packId: deal.pack_id ?? "",
  }));
}

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  return emailCampaigns;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await getSupabaseServerClient();
  const [companyResult, platformResult] = await Promise.all([
    supabase
      .from("email_templates")
      .select("id,name,message_type,subject_template,body_json,updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("platform_email_templates")
      .select("id,name,message_type,subject_template,body_json,updated_at")
      .eq("active", true)
      .order("updated_at", { ascending: false }),
  ]);

  const companyTemplates = (companyResult.data ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    messageType: template.message_type,
    subjectTemplate: template.subject_template,
    bodyJson: template.body_json,
    updatedAt: template.updated_at,
    scope: "company" as const,
  }));
  const platformTemplates = (platformResult.data ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    messageType: template.message_type,
    subjectTemplate: template.subject_template,
    bodyJson: template.body_json,
    updatedAt: template.updated_at,
    scope: "platform" as const,
  }));

  return [...platformTemplates, ...companyTemplates];
}

export async function getBillingPlans(): Promise<BillingPlan[]> {
  return billingPlans;
}

export async function getQuoteItems(): Promise<QuoteItem[]> {
  if (!hasSupabaseEnv()) {
    return quoteItems;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("id,opportunity_id,number,title,organization,amount,deposit_due,balance_due,status,due_date")
    .order("due_date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((quote) => ({
    id: quote.id,
    number: quote.number,
    dealId: quote.opportunity_id ?? "",
    title: quote.title,
    organization: quote.organization ?? "Structure a renseigner",
    amount: quote.amount,
    depositDue: quote.deposit_due,
    balanceDue: quote.balance_due,
    status: quote.status,
    dueDate: quote.due_date ?? "",
  }));
}

export async function getQuoteItemById(quoteId: string): Promise<QuoteItem | null> {
  if (!hasSupabaseEnv()) {
    return quoteItems.find((quote) => quote.id === quoteId) ?? null;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("id,opportunity_id,number,title,organization,amount,deposit_due,balance_due,status,due_date")
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    number: data.number,
    dealId: data.opportunity_id ?? "",
    title: data.title,
    organization: data.organization ?? "Structure a renseigner",
    amount: data.amount,
    depositDue: data.deposit_due,
    balanceDue: data.balance_due,
    status: data.status,
    dueDate: data.due_date ?? "",
  };
}

export async function getFixedCosts(): Promise<FixedCost[]> {
  if (!hasSupabaseEnv()) {
    return fixedCosts;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("fixed_costs")
    .select("id,label,category,amount,frequency,next_due_date,notes")
    .order("next_due_date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((cost) => ({
    id: cost.id,
    label: cost.label,
    category: cost.category,
    amount: cost.amount,
    frequency: cost.frequency,
    nextDueDate: cost.next_due_date,
    notes: cost.notes ?? "",
  }));
}

export async function getActivityLog(limit = 15): Promise<ActivityEntry[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id,actor_name,action,entity_type,entity_label,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    id: entry.id,
    actorName: entry.actor_name,
    action: entry.action,
    entityType: entry.entity_type,
    entityLabel: entry.entity_label ?? "",
    createdAt: entry.created_at,
  }));
}

export async function getLatestTreasurySnapshot(): Promise<TreasurySnapshot | null> {
  if (!hasSupabaseEnv()) {
    return treasurySnapshot;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treasury_snapshots")
    .select("id,balance,recorded_on,note")
    .order("recorded_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    balance: data.balance,
    recordedOn: data.recorded_on,
    note: data.note ?? "",
  };
}

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  if (!hasSupabaseEnv()) {
    return {
      id: "company-demo",
      name: "Compagnie de demonstration",
      city: "",
      discipline: "",
      email: "",
      phone: "",
      website: "",
      siret: "",
      licenseNumber: "",
      logoUrl: "",
      description: "",
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) return null;

  const { data, error } = await supabase
    .from("companies")
    .select("id,name,city,discipline,email,phone,website,siret,license_number,logo_url,description")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name ?? "",
    city: data.city ?? "",
    discipline: data.discipline ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    website: data.website ?? "",
    siret: data.siret ?? "",
    licenseNumber: data.license_number ?? "",
    logoUrl: data.logo_url ?? "",
    description: data.description ?? "",
  };
}

export async function getCompanyDocuments(): Promise<CompanyDocument[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_documents")
    .select("id,title,doc_type,storage_path,file_url,note,created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rowsWithPath = data.filter(
    (row): row is typeof row & { storage_path: string } => Boolean(row.storage_path),
  );
  const urlByPath = new Map<string, string>();

  if (rowsWithPath.length > 0) {
    const signed = await Promise.all(
      rowsWithPath.map((row) =>
        supabase.storage
          .from("documents")
          .createSignedUrl(row.storage_path, 3600, {
            download: buildDownloadFileName(row.title, row.storage_path),
          }),
      ),
    );

    signed.forEach(({ data: signedData }, index) => {
      if (signedData?.signedUrl) {
        urlByPath.set(rowsWithPath[index].storage_path, signedData.signedUrl);
      }
    });
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    docType: row.doc_type,
    storagePath: row.storage_path ?? "",
    fileUrl:
      (row.storage_path ? urlByPath.get(row.storage_path) : undefined) ?? row.file_url ?? "",
    note: row.note ?? "",
    createdAt: row.created_at,
  }));
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id,title,event_date,kind,related_show_id,note")
    .order("event_date", { ascending: true });

  if (error || !data) return [];

  return data.map((event) => ({
    id: event.id,
    title: event.title,
    eventDate: event.event_date,
    kind: event.kind,
    relatedShowId: event.related_show_id,
    note: event.note ?? "",
  }));
}

export async function getCompanyMembers(): Promise<CompanyMember[]> {
  if (!hasSupabaseEnv()) {
    return [
      { id: "demo-owner", fullName: "Vous (demo)", role: "owner", email: "demo@tadiff.fr", isSelf: true },
    ];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_company_members");

  if (error || !data) return [];

  return data.map((member) => ({
    id: member.id,
    fullName: member.full_name ?? "Sans nom",
    role: member.role,
    email: member.email ?? "",
    isSelf: member.is_self,
  }));
}

export async function getCompanyInviteCode(): Promise<string | null> {
  if (!hasSupabaseEnv()) {
    return "DEMO1234";
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) return null;

  const { data } = await supabase
    .from("companies")
    .select("invite_code")
    .eq("id", profile.company_id)
    .maybeSingle();

  return data?.invite_code ?? null;
}

export async function getTreasurySnapshots(): Promise<TreasurySnapshot[]> {
  if (!hasSupabaseEnv()) {
    // Historique synthetique de demonstration (6 points) autour du solde demo.
    const base = treasurySnapshot.balance;
    const points = [-0.28, -0.12, 0.05, -0.05, 0.14, 0];
    return points.map((delta, index) => {
      const date = new Date(treasurySnapshot.recordedOn);
      date.setMonth(date.getMonth() - (points.length - 1 - index));
      return {
        id: `treasury-demo-${index}`,
        balance: Math.round(base * (1 + delta)),
        recordedOn: date.toISOString().slice(0, 10),
        note: "",
      };
    });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treasury_snapshots")
    .select("id,balance,recorded_on,note")
    .order("recorded_on", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(60);

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    id: entry.id,
    balance: entry.balance,
    recordedOn: entry.recorded_on,
    note: entry.note ?? "",
  }));
}

function buildDashboardStats({
  contacts,
  deals,
  reminders,
  shows,
}: {
  contacts: Contact[];
  deals: PipelineDeal[];
  reminders: Reminder[];
  shows: Show[];
}): DashboardStat[] {
  const activeShows = shows.filter((show) => show.status !== "En pause");
  const activeDeals = deals.filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu");
  const estimatedRevenue = activeDeals.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );

  return [
    {
      label: "Spectacles actifs",
      value: activeShows.length.toString(),
      detail: shows.length === 0 ? "Aucun spectacle cree" : `${shows.length} au total`,
    },
    {
      label: "Contacts CRM",
      value: contacts.length.toString(),
      detail: contacts.length === 0 ? "Aucun contact cree" : "Contacts reels",
    },
    {
      label: "Relances a venir",
      value: reminders.length.toString(),
      detail: reminders.length === 0 ? "Aucune relance ouverte" : "Relances non terminees",
    },
    {
      label: "CA previsionnel",
      value: `${estimatedRevenue.toLocaleString("fr-FR")} EUR`,
      detail: activeDeals.length === 0 ? "Aucun pipeline actif" : "Pipeline pondere",
    },
  ];
}
