import { ContactCreateDialog } from "@/components/contacts/contact-create-dialog";
import { ContactImportPanel } from "@/components/contacts/contact-import-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { ContactsTable } from "@/components/tables/contacts-table";
import { getContacts } from "@/lib/supabase/queries";

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <PageTitle href="/contacts">Carnet de diffusion</PageTitle>
          <p className="mt-1 text-sm text-muted">
            Programmateurs, lieux, partenaires et personnes a relancer.
          </p>
        </div>
        <ContactCreateDialog />
      </div>
      <ContactImportPanel />
      {contacts.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="Aucun contact"
            description="Ajoutez vos premiers programmateurs, lieux et partenaires pour commencer le suivi de diffusion."
          />
          <div className="flex justify-center">
            <ContactCreateDialog buttonLabel="Creer le premier contact" />
          </div>
        </div>
      ) : (
        <ContactsTable contacts={contacts} />
      )}
    </div>
  );
}
