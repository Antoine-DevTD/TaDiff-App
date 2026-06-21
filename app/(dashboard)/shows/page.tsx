import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getShows } from "@/lib/supabase/queries";

export default async function ShowsPage() {
  const shows = await getShows();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Spectacles</h2>
          <p className="mt-1 text-sm text-muted">
            Catalogue des creations, statuts de diffusion et prochaines dates.
          </p>
        </div>
        <ButtonLink href="/shows/new">Nouveau spectacle</ButtonLink>
      </div>

      {shows.length === 0 ? (
        <EmptyState
          title="Aucun spectacle"
          description="Creez votre premier spectacle pour suivre sa diffusion, son budget et ses prochaines dates."
          actionLabel="Nouveau spectacle"
          actionHref="/shows/new"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {shows.map((show) => (
          <Card key={show.id} className="transition hover:-translate-y-0.5 hover:border-accent/[0.45] hover:bg-panel-strong/70">
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
                    : "A planifier"}
                </p>
              </div>
              <div>
                <p className="text-muted">Budget</p>
                <p className="mt-1 font-medium">
                  {show.budget.toLocaleString("fr-FR")} EUR
                </p>
              </div>
            </div>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
}
