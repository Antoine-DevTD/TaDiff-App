import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/finance";
import { getGrantOpportunities, getShows } from "@/lib/supabase/queries";
import type { GrantOpportunity } from "@/types";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getGrantTone(grant: GrantOpportunity) {
  if (grant.status === "Attribue") return "success" as const;
  if (grant.status === "Depose") return "neutral" as const;

  const today = startOfDay(new Date());
  const deadline = startOfDay(new Date(grant.deadline));
  const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "danger" as const;
  if (diffDays <= 14) return "warning" as const;
  return "neutral" as const;
}

function getDeadlineLabel(deadline: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(deadline));
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `En retard de ${Math.abs(diffDays)} j`;
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays <= 14) return `Dans ${diffDays} j`;
  return new Date(deadline).toLocaleDateString("fr-FR");
}

export default async function SubventionsPage() {
  const [grants, shows] = await Promise.all([getGrantOpportunities(), getShows()]);
  const showMap = new Map(shows.map((show) => [show.id, show]));
  const totalExpected = grants.reduce((total, grant) => total + grant.amount, 0);
  const urgent = grants.filter((grant) => getGrantTone(grant) === "warning" || getGrantTone(grant) === "danger");
  const mounted = grants.filter((grant) => grant.status === "En montage");
  const deposited = grants.filter((grant) => grant.status === "Depose" || grant.status === "Attribue");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Radar subventions</h2>
          <p className="mt-1 text-sm text-muted">
            Suivez les aides, montants attendus, territoires et deadlines avant qu elles ne sortent du radar.
          </p>
        </div>
        <ButtonLink href="/calendar" variant="secondary">
          Voir les echeances
        </ButtonLink>
      </div>

      {grants.length === 0 ? (
        <EmptyState
          title="Aucune aide suivie"
          description="Ajoutez un dispositif DRAC, Region, Fondation ou SACD pour piloter les depots."
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Aides suivies" value={grants.length.toString()} detail="Dispositifs actifs" />
            <MetricCard label="A monter" value={mounted.length.toString()} detail="Dossiers en cours" />
            <MetricCard label="Urgences" value={urgent.length.toString()} detail="Deadline proche" />
            <MetricCard label="Montant cible" value={formatCurrency(totalExpected)} detail="Total attendu" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="space-y-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Priorites</p>
                <p className="mt-2 text-xl font-semibold">
                  {urgent[0]?.title ?? mounted[0]?.title ?? grants[0]?.title}
                </p>
              </div>
              <div className="space-y-3">
                {[...urgent, ...mounted].slice(0, 4).map((grant) => {
                  const show = grant.relatedShowId ? showMap.get(grant.relatedShowId) : null;

                  return (
                    <GrantRow
                      key={grant.id}
                      grant={grant}
                      showTitle={show?.title}
                    />
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Bilan financier aides</p>
                <p className="mt-1 text-sm text-muted">
                  Le montant attendu se rapproche du budget spectacle et du pipeline.
                </p>
              </div>
              <div className="grid gap-3">
                {deposited.map((grant) => (
                  <div key={grant.id} className="rounded-lg border border-border bg-panel-strong/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{grant.funder}</p>
                        <p className="mt-1 text-sm text-muted">{grant.title}</p>
                      </div>
                      <Badge tone={getGrantTone(grant)}>{grant.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium">{formatCurrency(grant.amount)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <GrantColumn title="A surveiller" grants={grants.filter((grant) => grant.status === "A surveiller")} />
            <GrantColumn title="En montage" grants={mounted} />
            <GrantColumn title="Depose / attribue" grants={deposited} />
          </section>
        </>
      )}
    </div>
  );
}

function GrantColumn({ grants, title }: { grants: GrantOpportunity[]; title: string }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold">{title}</p>
        <Badge>{grants.length}</Badge>
      </div>
      {grants.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
          Aucun dossier dans cette colonne.
        </p>
      ) : (
        <div className="space-y-3">
          {grants.map((grant) => (
            <GrantRow key={grant.id} grant={grant} />
          ))}
        </div>
      )}
    </Card>
  );
}

function GrantRow({ grant, showTitle }: { grant: GrantOpportunity; showTitle?: string }) {
  return (
    <Link
      className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
      href={grant.relatedShowId ? `/shows/${grant.relatedShowId}` : "/subventions"}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{grant.funder}</p>
          <p className="mt-1 text-sm text-muted">{showTitle ?? grant.title}</p>
        </div>
        <Badge tone={getGrantTone(grant)}>{getDeadlineLabel(grant.deadline)}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted">Montant</p>
          <p className="mt-1 font-medium">{formatCurrency(grant.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Territoire</p>
          <p className="mt-1 font-medium">{grant.territory}</p>
        </div>
      </div>
    </Link>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </Card>
  );
}
