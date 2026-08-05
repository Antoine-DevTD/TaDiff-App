import { ContactsTable } from "@/components/tables/contacts-table";
import { getContactCustomization, getContacts, getEmailTemplates, getShowDocuments, getShows } from "@/lib/supabase/queries";

export default async function ContactsPage() {
  const [contacts, shows, templates, documents, customization] = await Promise.all([
    getContacts(),
    getShows(),
    getEmailTemplates(),
    getShowDocuments(),
    getContactCustomization(),
  ]);

  return (
    <div data-tour="contacts-carnet">
      <ContactsTable contacts={contacts} customization={customization} documents={documents} shows={shows} templates={templates} />
    </div>
  );
}
