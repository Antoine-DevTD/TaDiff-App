import { contacts, dashboardStats, pipelineDeals, reminders, shows } from "@/data/mock-data";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Contact, PipelineDeal, Reminder, Show } from "@/types";

export async function getShows(): Promise<Show[]> {
  if (!hasSupabaseEnv()) {
    return shows;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("shows")
    .select("id,title,discipline,status,next_date,budget")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return shows;
  }

  return data.map((show) => ({
    id: show.id,
    title: show.title,
    discipline: show.discipline,
    status: show.status,
    nextDate: show.next_date ?? "",
    budget: show.budget ?? 0,
  }));
}

export async function getContacts(): Promise<Contact[]> {
  if (!hasSupabaseEnv()) {
    return contacts;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id,name,organization,role,city,status")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return contacts;
  }

  return data.map((contact) => ({
    id: contact.id,
    name: contact.name,
    organization: contact.organization,
    role: contact.role ?? "",
    city: contact.city ?? "",
    status: contact.status,
  }));
}

export async function getPipelineDeals(): Promise<PipelineDeal[]> {
  if (!hasSupabaseEnv()) {
    return pipelineDeals;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id,title,contact_id,show_id,stage,value,probability,next_action,next_follow_up_at,lost_reason,created_at,contacts(name,organization),shows(title)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return pipelineDeals;
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
    .order("due_date", { ascending: true });

  if (error || !data) {
    return reminders;
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

export async function getDashboardData() {
  const [resolvedShows, resolvedContacts, resolvedDeals, resolvedReminders] =
    await Promise.all([getShows(), getContacts(), getPipelineDeals(), getReminders()]);

  return {
    contacts: resolvedContacts,
    dashboardStats,
    pipelineDeals: resolvedDeals,
    reminders: resolvedReminders,
    shows: resolvedShows,
  };
}
