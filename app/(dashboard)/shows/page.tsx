import { EmptyState } from "@/components/ui/empty-state";
import { ShowCreateDialog } from "@/components/shows/show-create-dialog";
import { ShowsCatalogue } from "@/components/shows/shows-catalogue";
import { getShows, getShowDocuments } from "@/lib/supabase/queries";
import { getShowDocumentReadiness, resolveShowPosterUrl } from "@/lib/show-documents";

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const { create } = await searchParams;
  const [shows, documents] = await Promise.all([getShows(), getShowDocuments()]);

  if (shows.length === 0) {
    return (
      <>
        <EmptyState
          title="Aucun spectacle"
          description="Creez votre premier spectacle pour suivre son dossier, son budget et ses prochaines dates."
          actionLabel="Nouveau spectacle"
          actionHref="/shows?create=1"
        />
        <ShowCreateDialog initialOpen={create === "1"} showTrigger={false} />
      </>
    );
  }

  const catalogueItems = shows.map((show) => {
    const showDocuments = documents.filter((document) => document.showId === show.id);
    const posterUrl = resolveShowPosterUrl(show, showDocuments);
    const readiness = getShowDocumentReadiness(showDocuments, {
      hasPoster: Boolean(posterUrl),
    });

    return {
      show,
      posterUrl,
      missingCount: readiness.missingCount,
    };
  });

  return (
    <>
      <ShowsCatalogue items={catalogueItems} />
      <ShowCreateDialog initialOpen={create === "1"} showTrigger={false} />
    </>
  );
}
