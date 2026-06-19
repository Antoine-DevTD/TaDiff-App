import { contacts, dashboardStats, pipelineDeals, reminders, shows } from "@/data/mock-data";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Contact, Show } from "@/types";

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

export async function getDashboardData() {
  const [resolvedShows, resolvedContacts] = await Promise.all([getShows(), getContacts()]);

  return {
    contacts: resolvedContacts,
    dashboardStats,
    pipelineDeals,
    reminders,
    shows: resolvedShows,
  };
}
