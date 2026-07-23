import { notFound } from "next/navigation";
import { deleteContact } from "@/app/(dashboard)/actions";
import { ContactForm } from "@/components/forms/contact-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { getContactById } from "@/lib/supabase/queries";

type EditContactPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditContactPage({ params }: EditContactPageProps) {
  const { id } = await params;
  const { contact } = await getContactById(id);

  if (!contact) {
    notFound();
  }

  const deleteAction = deleteContact.bind(null, contact.id);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modifier le contact</CardTitle>
          <CardDescription>
            {contact.name} - {contact.organization}
          </CardDescription>
        </CardHeader>
        <ContactForm contact={contact} />
      </Card>

      <Card className="border-danger/25">
        <CardHeader>
          <CardTitle>Supprimer le contact</CardTitle>
          <CardDescription>
            Les dates possibles et actions liées seront detachees mais conservées.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmDeleteButton
            action={deleteAction}
            label="Supprimer ce contact"
            redirectTo="/contacts"
          />
          <ButtonLink href={`/contacts/${contact.id}`} variant="secondary">
            Annuler
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
