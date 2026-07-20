import { RemindersWorkspace } from "@/components/reminders/reminders-workspace";
import { resolveShowPosterUrl } from "@/lib/show-documents";
import { getContacts, getReminders, getShowDocuments, getShows } from "@/lib/supabase/queries";

export default async function RemindersPage({ searchParams }: { searchParams: Promise<{ contactId?: string }> }) {
  const { contactId } = await searchParams;
  const [reminders, shows, contacts, documents] = await Promise.all([getReminders(), getShows(), getContacts(), getShowDocuments()]);
  const showsWithPosters = shows.map((show) => ({ ...show, posterUrl: resolveShowPosterUrl(show, documents.filter((document) => document.showId === show.id)) }));

  return (
    <RemindersWorkspace contacts={contacts} initialContactId={contactId} reminders={reminders} shows={showsWithPosters} />
  );
}
