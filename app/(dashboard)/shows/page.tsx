import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getShows, getShowDocuments } from "@/lib/supabase/queries";
import { getShowDocumentReadiness, resolveShowPosterUrl } from "@/lib/show-documents";
import type { Show } from "@/types";

export default async function ShowsPage() {
  const [shows, documents] = await Promise.all([getShows(), getShowDocuments()]);

  return (
    <div className="space-y-6">
      {shows.length === 0 ? (
        <EmptyState
          title="Aucun spectacle"
          description="Creez votre premier spectacle pour suivre son dossier, son budget et ses prochaines dates."
          actionLabel="Nouveau spectacle"
          actionHref="/shows/new"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3" data-tour="shows-catalogue">
          {shows.map((show) => {
            const showDocuments = documents.filter((document) => document.showId === show.id);
            const posterUrl = resolveShowPosterUrl(show, showDocuments);
            const readiness = getShowDocumentReadiness(showDocuments, {
              hasPoster: Boolean(posterUrl),
            });

            return (
            <Link key={show.id} href={`/shows/${show.id}`}>
              <Card className="overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-accent/[0.45] hover:bg-panel-strong/70">
                <PosterBlock posterUrl={posterUrl} show={show} />
                <div className="p-5">
                  <CardHeader>
                    <div className="flex min-h-16 items-start justify-between gap-3">
                      <div>
                        <CardTitle>{show.title}</CardTitle>
                        <CardDescription>{show.discipline}</CardDescription>
                      </div>
                      <Badge tone={show.status === "En diffusion" ? "success" : "neutral"}>
                        {show.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-panel-strong/45 p-3 text-sm">
                    <div>
                      <p className="text-muted">Prochaine date</p>
                      <p className="mt-1 font-medium">
                        {show.nextDate
                          ? new Date(show.nextDate).toLocaleDateString("fr-FR")
                          : "À planifier"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted">Budget</p>
                      <p className="mt-1 font-medium">
                        {show.budget.toLocaleString("fr-FR")} EUR
                      </p>
                    </div>
                  </div>
                  <DocumentState
                    readyPercent={readiness.percent}
                    missingCount={readiness.missingCount}
                  />
                </div>
              </Card>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PosterBlock({ posterUrl, show }: { posterUrl: string; show: Show }) {
  const style = posterUrl
    ? { backgroundImage: `url(${posterUrl})` }
    : undefined;

  return (
    <div
      className="flex aspect-[4/3] items-end bg-ink bg-cover bg-center p-4 text-white"
      style={style}
    >
      <div className="w-full rounded-md bg-ink/76 p-3 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.14em] text-white/55">Affiche</p>
        <p className="mt-1 line-clamp-2 font-semibold">{show.title}</p>
      </div>
    </div>
  );
}

function DocumentState({
  missingCount,
  readyPercent,
}: {
  missingCount: number;
  readyPercent: number;
}) {
  return (
    <div className="mt-4 rounded-md border border-border bg-panel-strong/35 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium">Dossier</p>
        <Badge tone={missingCount === 0 ? "success" : "warning"}>
          {missingCount === 0 ? "Prêt" : `${missingCount} manquant(s)`}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${readyPercent}%` }} />
      </div>
    </div>
  );
}
