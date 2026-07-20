import { ContactImportPanel } from "@/components/contacts/contact-import-panel";
import { ContactCreateDialog } from "@/components/contacts/contact-create-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactsTable } from "@/components/tables/contacts-table";
import { getContacts, getEmailTemplates, getShows } from "@/lib/supabase/queries";

export default async function ContactsPage() {
  const [contacts, shows, templates] = await Promise.all([getContacts(), getShows(), getEmailTemplates()]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end" data-tour="contacts-creation">
        <div className="flex flex-wrap justify-end gap-2">
          <ContactImportPanel />
        </div>
      </div>
      {contacts.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="Aucun contact"
            description="Ajoutez les personnes utiles a la compagnie : artistes, techniciens, lieux, partenaires ou programmation."
          />
          <div className="flex justify-center">
            <ContactCreateDialog buttonLabel="Creer le premier contact" />
          </div>
        </div>
      ) : (
        <div data-tour="contacts-carnet">
          <ContactsTable contacts={contacts} shows={shows} templates={templates} />
        </div>
      )}
    </div>
  );
}
