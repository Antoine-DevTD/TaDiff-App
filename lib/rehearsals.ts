import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ShowTeamMember = { id: string; contactId: string; name: string; email: string; jobTitle: string; characterName: string; alternateGroup: string };
export type RehearsalSlot = { id: string; date: string; startTime: string; endTime: string; location: string; confirmed: boolean };
export type RehearsalParticipant = { id: string; name: string; teamMemberId: string | null; respondedAt: string | null };
export type RehearsalResponse = { participantId: string; slotId: string; availability: "yes" | "maybe" | "no" };
export type RehearsalPoll = { id: string; title: string; token: string; deadline: string; status: "draft" | "open" | "closed"; showResponses: boolean; slots: RehearsalSlot[]; participants: RehearsalParticipant[]; responses: RehearsalResponse[] };

export async function getShowRehearsalWorkspace(showId: string): Promise<{ team: ShowTeamMember[]; polls: RehearsalPoll[]; error: string | null }> {
  if (!hasSupabaseEnv()) return { team: [], polls: [], error: null };
  const supabase = await getSupabaseServerClient();
  const [{ data: teamRows, error: teamError }, { data: pollRows, error: pollError }, { data: slotRows }, { data: participantRows }, { data: responseRows }] = await Promise.all([
    supabase.from("show_team_members").select("id,contact_id,job_title,character_name,alternate_group,contact:contacts!show_team_contact_company_fk(name,email)").eq("show_id", showId).order("created_at"),
    supabase.from("rehearsal_polls").select("id,title,public_token,response_deadline,status,show_responses").eq("show_id", showId).order("created_at", { ascending: false }),
    supabase.from("rehearsal_slots").select("id,poll_id,slot_date,start_time,end_time,location,confirmed_at").order("slot_date").order("start_time"),
    supabase.from("rehearsal_participants").select("id,poll_id,team_member_id,display_name,responded_at"),
    supabase.from("rehearsal_responses").select("participant_id,slot_id,availability"),
  ]);
  const error = teamError ?? pollError;
  if (error) return { team: [], polls: [], error: error.message.includes("schema cache") ? "Appliquez la migration 080 pour activer les équipes et répétitions." : error.message };
  return {
    error: null,
    team: (teamRows ?? []).map((row) => {
      const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
      return { id: row.id, contactId: row.contact_id, name: contact?.name ?? "Contact", email: contact?.email ?? "", jobTitle: row.job_title, characterName: row.character_name ?? "", alternateGroup: row.alternate_group ?? "" };
    }),
    polls: (pollRows ?? []).map((poll) => ({
      id: poll.id, title: poll.title, token: poll.public_token, deadline: poll.response_deadline ?? "", status: poll.status, showResponses: poll.show_responses,
      slots: (slotRows ?? []).filter((slot) => slot.poll_id === poll.id).map((slot) => ({ id: slot.id, date: slot.slot_date, startTime: slot.start_time.slice(0, 5), endTime: slot.end_time.slice(0, 5), location: slot.location ?? "", confirmed: Boolean(slot.confirmed_at) })),
      participants: (participantRows ?? []).filter((participant) => participant.poll_id === poll.id).map((participant) => ({ id: participant.id, name: participant.display_name, teamMemberId: participant.team_member_id, respondedAt: participant.responded_at })),
      responses: (responseRows ?? []).filter((response) => (participantRows ?? []).some((participant) => participant.poll_id === poll.id && participant.id === response.participant_id)).map((response) => ({ participantId: response.participant_id, slotId: response.slot_id, availability: response.availability })),
    })),
  };
}
