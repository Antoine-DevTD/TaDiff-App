import "server-only";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ShowDate = { id: string; date: string; time: string; endTime: string; title: string; location: string; kind: string; status: string; href: string };

export async function getShowDates(showId: string): Promise<{ dates: ShowDate[]; error: string | null }> {
  if (!hasSupabaseEnv()) return { dates: [], error: null };
  const supabase = await getSupabaseServerClient();
  // Both queries use the signed-in client: company RLS remains authoritative.
  const [exploitationResult, calendarResult] = await Promise.all([
    supabase.from("exploitations").select("id,title,venue,city").eq("show_id", showId),
    supabase.from("calendar_events").select("id,title,event_date,start_time,end_time,location,kind").eq("related_show_id", showId),
  ]);
  const error = exploitationResult.error ?? calendarResult.error;
  if (error) return { dates: [], error: "Impossible de charger les dates du spectacle. Réessayez en actualisant la page." };
  const exploitations = exploitationResult.data ?? [];
  const performances = exploitations.length
    ? await supabase.from("exploitation_performances").select("id,exploitation_id,performance_date,performance_time,status").in("exploitation_id", exploitations.map((item) => item.id))
    : { data: [], error: null };
  if (performances.error) return { dates: [], error: "Impossible de charger les représentations. Réessayez en actualisant la page." };
  const byId = new Map(exploitations.map((item) => [item.id, item]));
  const dates: ShowDate[] = (performances.data ?? []).map((performance) => {
    const exploitation = byId.get(performance.exploitation_id)!;
    return { id: `performance-${performance.id}`, date: performance.performance_date, time: performance.performance_time ?? "", endTime: "", title: exploitation.title, location: [exploitation.venue, exploitation.city].filter(Boolean).join(" — "), kind: "Représentation", status: performance.status === "annulee" ? "Annulée" : "Programmée", href: "/pipeline" };
  });
  for (const event of calendarResult.data ?? []) dates.push({ id: `event-${event.id}`, date: event.event_date, time: event.start_time ?? "", endTime: event.end_time ?? "", title: event.title, location: event.location ?? "", kind: event.kind === "rehearsal" ? "Répétition" : event.kind === "show" ? "Représentation (agenda)" : event.kind === "deadline" ? "Échéance" : "Événement", status: event.kind === "rehearsal" ? "Confirmée" : "", href: "/calendar" });
  dates.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  return { dates, error: null };
}
