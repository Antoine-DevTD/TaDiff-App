import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData } from "@/lib/supabase/queries";

export default async function DashboardPage() {
  const { contacts, dashboardStats, pipelineDeals, reminders, shows } =
    await getDashboardData();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Spectacles suivis</CardTitle>
            <CardDescription>Etat de production et prochaines dates de diffusion.</CardDescription>
          </CardHeader>
          {shows.length === 0 ? (
            <EmptyBlock text="Aucun spectacle cree pour le moment." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th className="py-3 font-medium">Spectacle</th>
                    <th className="py-3 font-medium">Discipline</th>
                    <th className="py-3 font-medium">Statut</th>
                    <th className="py-3 font-medium">Prochaine date</th>
                    <th className="py-3 text-right font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shows.map((show) => (
                    <tr key={show.id}>
                      <td className="py-4 font-medium">{show.title}</td>
                      <td className="py-4 text-muted">{show.discipline}</td>
                      <td className="py-4">
                        <Badge tone={show.status === "En diffusion" ? "success" : "neutral"}>
                          {show.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-muted">
                        {show.nextDate
                          ? new Date(show.nextDate).toLocaleDateString("fr-FR")
                          : "Non renseignee"}
                      </td>
                      <td className="py-4 text-right font-medium">
                        {show.budget.toLocaleString("fr-FR")} EUR
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relances proches</CardTitle>
              <CardDescription>Priorites de la semaine.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {reminders.length === 0 ? (
                <EmptyBlock text="Aucune relance ouverte." />
              ) : (
                reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-md border border-border bg-background p-3">
                    <p className="text-sm font-medium">{reminder.label}</p>
                    <p className="mt-1 text-xs text-muted">
                      {reminder.relatedTo} -{" "}
                      {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
          <EmptyState
            title="Aucun document urgent"
            description="Les contrats, fiches techniques et dossiers de diffusion seront connectes dans les prochains lots."
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Resume des opportunites commerciales en cours.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {pipelineDeals.length === 0 ? (
              <EmptyBlock text="Aucune opportunite creee." />
            ) : (
              pipelineDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between rounded-md bg-background p-3">
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-sm text-muted">{deal.venue}</p>
                  </div>
                  <Badge>{deal.stage}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contacts actifs</CardTitle>
            <CardDescription>Contacts reels de votre CRM.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {contacts.length === 0 ? (
              <EmptyBlock text="Aucun contact cree." />
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between rounded-md bg-background p-3">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted">
                      {[contact.organization, contact.city].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                  <Badge>{contact.status}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-panel-strong/45 p-4 text-sm text-muted">
      {text}
    </div>
  );
}
