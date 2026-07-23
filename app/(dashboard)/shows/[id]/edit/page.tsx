import { notFound } from "next/navigation";
import { deleteShow } from "@/app/(dashboard)/actions";
import { ShowForm } from "@/components/forms/show-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { getShowById } from "@/lib/supabase/queries";

type EditShowPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditShowPage({ params }: EditShowPageProps) {
  const { id } = await params;
  const { show } = await getShowById(id);

  if (!show) {
    notFound();
  }

  const deleteAction = deleteShow.bind(null, show.id);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modifier le spectacle</CardTitle>
          <CardDescription>{show.title}</CardDescription>
        </CardHeader>
        <ShowForm show={show} />
      </Card>

      <Card className="border-danger/25">
        <CardHeader>
          <CardTitle>Supprimer le spectacle</CardTitle>
          <CardDescription>
            Les documents liés et leurs fichiers stockes seront supprimes. Les dates possibles
            et devis existants seront detaches mais conserves.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmDeleteButton
            action={deleteAction}
            label="Supprimer ce spectacle"
            redirectTo="/shows"
          />
          <ButtonLink href={`/shows/${show.id}`} variant="secondary">
            Annuler
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
