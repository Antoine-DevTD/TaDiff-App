import { ContactCreateDialog } from "@/components/contacts/contact-create-dialog";
import { ContactImportPanel } from "@/components/contacts/contact-import-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactsTable } from "@/components/tables/contacts-table";
import { getContacts } from "@/lib/supabase/queries";

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2" data-tour="contacts-creation">
          <ContactImportPanel />
          <ContactCreateDialog />
        </div>
      </div>
      {contacts.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="Aucun contact"
            description="Ajoutez vos premiers programmateurs, lieux et partenaires pour commencer le suivi."
          />
          <div className="flex justify-center">
            <ContactCreateDialog buttonLabel="Creer le premier contact" />
          </div>
        </div>
      ) : (
        <div data-tour="contacts-carnet">
          <ContactsTable contacts={contacts} />
        </div>
      )}
    </div>
  );
}
