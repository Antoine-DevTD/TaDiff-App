import {
  betaSignups,
  billingPlans,
  commercialPacks,
  contacts,
  dashboardStats,
  emailCampaigns,
  grantOpportunities,
  patronageDeals,
  pipelineDeals,
  quoteItems,
  reminders,
  showDocuments,
  shows,
} from "@/data/mock-data";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BillingPlan,
  CommercialPack,
  Contact,
  EmailCampaign,
  GrantOpportunity,
  PatronageDeal,
  PipelineDeal,
  QuoteItem,
  Reminder,
  Show,
  ShowDocument,
} from "@/types";

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
    .select("id,title,discipline,status,next_date,budget,notes,poster_url")
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
    notes: show.notes ?? "",
    posterUrl: show.poster_url ?? "",
  }));
}

export async function getShowById(showId: string): Promise<{
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
      show,
      opportunities,
      reminders: filteredReminders,
    };
  }

  const supabase = await getSupabaseServerClient();
  const [
    { data: show, error: showError },
    { data: opportunities, error: opportunitiesError },
    { data: documents, error: documentsError },
  ] = await Promise.all([
      supabase
        .from("shows")
        .select("id,title,discipline,status,next_date,budget,notes,poster_url")
        .eq("id", showId)
        .maybeSingle(),
      supabase
        .from("opportunities")
        .select(
          "id,title,contact_id,show_id,stage,value,probability,next_action,next_follow_up_at,lost_reason,created_at,contacts(name,organization,email),shows(title)",
        )
        .eq("show_id", showId)
        .order("created_at", { ascending: false }),
      supabase
        .from("show_documents")
        .select("id,show_id,title,document_type,status,file_url,notes,updated_at")
        .eq("show_id", showId)
        .order("updated_at", { ascending: false }),
    ]);

  if (showError || !show || opportunitiesError || !opportunities) {
    return { documents: [], show: null, opportunities: [], reminders: [] };
  }

  const resolvedShow: Show = {
    id: show.id,
    title: show.title,
    discipline: show.discipline,
    status: show.status,
    nextDate: show.next_date ?? "",
    budget: show.budget ?? 0,
    notes: show.notes ?? "",
    posterUrl: show.poster_url ?? "",
  };

  const resolvedDocuments: ShowDocument[] =
    documentsError || !documents
      ? []
      : documents.map((document) => ({
          id: document.id,
          showId: document.show_id,
          title: document.title,
          documentType: document.document_type as ShowDocument["documentType"],
          status: document.status as ShowDocument["status"],
          fileUrl: document.file_url ?? "",
          notes: document.notes ?? "",
          updatedAt: document.updated_at,
        }));

  const resolvedOpportunities: PipelineDeal[] = opportunities.map((deal) => ({
    id: deal.id,
    title: deal.title,
    contactId: deal.contact_id ?? "",
    showId: deal.show_id ?? "",
    venue: deal.contacts?.organization ?? "Structure a renseigner",
    stage: deal.stage as PipelineDeal["stage"],
    value: deal.value ?? 0,
    probability: deal.probability ?? 0,
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
      show: resolvedShow,
      opportunities: resolvedOpportunities,
      reminders: [],
    };
  }

  return {
    documents: resolvedDocuments,
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

export async function getContacts(): Promise<Contact[]> {
  if (!hasSupabaseEnv()) {
    return contacts;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id,name,organization,role,email,city,status")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((contact) => ({
    id: contact.id,
    name: contact.name,
    organization: contact.organization,
    role: contact.role ?? "",
    email: contact.email ?? "",
    city: contact.city ?? "",
    status: contact.status,
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
  const [{ data: contact, error: contactError }, { data: opportunities, error: opportunitiesError }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id,name,organization,role,email,city,status")
        .eq("id", contactId)
        .maybeSingle(),
      supabase
        .from("opportunities")
        .select(
          "id,title,contact_id,show_id,stage,value,probability,next_action,next_follow_up_at,lost_reason,created_at,contacts(name,organization,email),shows(title,discipline,status,next_date,budget,notes,poster_url,id)",
        )
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false }),
    ]);

  if (contactError || !contact || opportunitiesError || !opportunities) {
    return { contact: null, opportunities: [], reminders: [], shows: [] };
  }

  const resolvedContact: Contact = {
    id: contact.id,
    name: contact.name,
    organization: contact.organization,
    role: contact.role ?? "",
    email: contact.email ?? "",
    city: contact.city ?? "",
    status: contact.status,
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
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id,title,contact_id,show_id,stage,value,probability,next_action,next_follow_up_at,lost_reason,created_at,contacts(name,organization,email),shows(title)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((deal) => ({
    id: deal.id,
    title: deal.title,
    contactId: deal.contact_id ?? "",
    showId: deal.show_id ?? "",
    venue: deal.contacts?.organization ?? "Structure a renseigner",
    stage: deal.stage as PipelineDeal["stage"],
    value: deal.value ?? 0,
    probability: deal.probability ?? 0,
    nextAction: deal.next_action ?? "Prochaine action a definir",
    nextFollowUpAt: deal.next_follow_up_at ?? "",
    lostReason: deal.lost_reason ?? "",
    contactName: deal.contacts?.name ?? "Contact a renseigner",
    contactOrganization: deal.contacts?.organization ?? "",
    contactEmail: deal.contacts?.email ?? "",
    showTitle: deal.shows?.title ?? "Spectacle a associer",
    createdAt: deal.created_at,
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

export async function getShowDocuments(showId?: string): Promise<ShowDocument[]> {
  if (!hasSupabaseEnv()) {
    return showId
      ? showDocuments.filter((document) => document.showId === showId)
      : showDocuments;
  }

  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("show_documents")
    .select("id,show_id,title,document_type,status,file_url,notes,updated_at")
    .order("updated_at", { ascending: false });

  if (showId) {
    query = query.eq("show_id", showId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((document) => ({
    id: document.id,
    showId: document.show_id,
    title: document.title,
    documentType: document.document_type as ShowDocument["documentType"],
    status: document.status as ShowDocument["status"],
    fileUrl: document.file_url ?? "",
    notes: document.notes ?? "",
    updatedAt: document.updated_at,
  }));
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
      remainingReservedSeats: Math.max(0, 10 - reservedCount),
      reservedCount,
      waitlistCount,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_beta_signup_stats");
  const stats = Array.isArray(data) ? data[0] : data;

  if (error || !stats) {
    return {
      remainingReservedSeats: 10,
      reservedCount: 0,
      waitlistCount: 0,
    };
  }

  return {
    remainingReservedSeats: Math.max(0, 10 - Number(stats.reserved_count ?? 0)),
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
  return grantOpportunities;
}

export async function getPatronageDeals(): Promise<PatronageDeal[]> {
  return patronageDeals;
}

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  return emailCampaigns;
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
