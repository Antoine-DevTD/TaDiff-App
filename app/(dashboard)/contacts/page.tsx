import { ButtonLink } from "@/components/ui/button";
import { ContactImportPanel } from "@/components/contacts/contact-import-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactsTable } from "@/components/tables/contacts-table";
import { getContacts } from "@/lib/supabase/queries";

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Contacts CRM</h2>
          <p className="mt-1 text-sm text-muted">
            Premier tableau TanStack, pret pour filtres et actions.
          </p>
        </div>
        <ButtonLink href="/contacts/new">Ajouter un contact</ButtonLink>
      </div>
      <ContactImportPanel />
      {contacts.length === 0 ? (
        <EmptyState
          title="Aucun contact"
          description="Ajoutez vos premiers programmateurs, lieux et partenaires pour commencer le suivi de diffusion."
          actionLabel="Ajouter un contact"
          actionHref="/contacts/new"
        />
      ) : (
        <ContactsTable contacts={contacts} />
      )}
    </div>
  );
}
