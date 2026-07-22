import { ContactsTable } from "@/components/tables/contacts-table";
import { getContacts, getEmailTemplates, getShowDocuments, getShows } from "@/lib/supabase/queries";

export default async function ContactsPage() {
  const [contacts, shows, templates, documents] = await Promise.all([
    getContacts(),
    getShows(),
    getEmailTemplates(),
    getShowDocuments(),
  ]);

  return (
    <div data-tour="contacts-carnet">
      <ContactsTable contacts={contacts} documents={documents} shows={shows} templates={templates} />
    </div>
  );
}
