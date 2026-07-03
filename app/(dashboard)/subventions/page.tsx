import { GrantDossierZipButton } from "@/components/grants/grant-dossier-zip-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/finance";
import {
  buildGrantDossierState,
  getDossierReadinessPercent,
  getDossierTone,
  getRequirementLabel,
  getRequirementTone,
  type GrantDossierState,
} from "@/lib/grants";
import {
  getGrantOpportunities,
  getShowDocuments,
  getShows,
} from "@/lib/supabase/queries";
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
  const [grants, shows, documents] = await Promise.all([
    getGrantOpportunities(),
    getShows(),
    getShowDocuments(),
  ]);
  const showMap = new Map(shows.map((show) => [show.id, show]));
  const dossierStates = grants.map((grant) => {
    const show = grant.relatedShowId ? showMap.get(grant.relatedShowId) ?? null : null;
    const showDocuments = show
      ? documents.filter((document) => document.showId === show.id)
      : [];

    return buildGrantDossierState({ documents: showDocuments, grant, show });
  });
  const totalExpected = grants.reduce((total, grant) => total + grant.amount, 0);
  const urgent = dossierStates.filter(
    (state) => getGrantTone(state.grant) === "warning" || getGrantTone(state.grant) === "danger",
  );
  const mounted = dossierStates.filter((state) => state.grant.status === "En montage");
  const deposited = dossierStates.filter(
    (state) => state.grant.status === "Depose" || state.grant.status === "Attribue",
  );
  const missingPieces = dossierStates.reduce((total, state) => total + state.missingCount, 0);
  const readyDossiers = dossierStates.filter(
    (state) => state.missingCount === 0 && state.updateCount === 0,
  );

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
            <MetricCard label="Dossiers prets" value={readyDossiers.length.toString()} detail="Pieces disponibles" />
            <MetricCard label="Pieces manquantes" value={missingPieces.toString()} detail="Avant depot" />
            <MetricCard label="Montant cible" value={formatCurrency(totalExpected)} detail="Total attendu" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="space-y-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Priorites</p>
                <p className="mt-2 text-xl font-semibold">
                  {urgent[0]?.grant.title ?? mounted[0]?.grant.title ?? grants[0]?.title}
                </p>
              </div>
              <div className="space-y-3">
                {[...urgent, ...mounted].slice(0, 4).map((grant) => {
                  return (
                    <GrantRow
                      key={grant.grant.id}
                      state={grant}
                    />
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Depot simplifie</p>
                <p className="mt-1 text-sm text-muted">
                  TaDiff rapproche chaque subvention des pieces du spectacle et prepare un zip de depot.
                </p>
              </div>
              <div className="grid gap-3">
                {dossierStates.slice(0, 3).map((state) => (
                  <DossierSummary key={state.grant.id} state={state} />
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <GrantColumn
              title="A surveiller"
              states={dossierStates.filter((state) => state.grant.status === "A surveiller")}
            />
            <GrantColumn title="En montage" states={mounted} />
            <GrantColumn title="Depose / attribue" states={deposited} />
          </section>
        </>
      )}
    </div>
  );
}

function GrantColumn({ states, title }: { states: GrantDossierState[]; title: string }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold">{title}</p>
        <Badge>{states.length}</Badge>
      </div>
      {states.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
          Aucun dossier dans cette colonne.
        </p>
      ) : (
        <div className="space-y-3">
          {states.map((state) => (
            <GrantRow key={state.grant.id} state={state} />
          ))}
        </div>
      )}
    </Card>
  );
}

function GrantRow({ state }: { state: GrantDossierState }) {
  const readiness = getDossierReadinessPercent(state);
  const grant = state.grant;

  return (
    <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{grant.funder}</p>
          <p className="mt-1 text-sm text-muted">{state.show?.title ?? grant.title}</p>
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
      <div className="mt-3 rounded-md border border-border bg-panel/70 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium">Dossier</p>
          <Badge tone={getDossierTone(state)}>
            {state.readyCount}/{state.totalCount} pieces
          </Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent" style={{ width: `${readiness}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {state.missingCount === 0
            ? "Toutes les pieces demandees sont disponibles."
            : `${state.missingCount} piece(s) manquante(s), ${state.updateCount} a revoir.`}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state.requirements.slice(0, 5).map((requirement) => (
          <Badge key={requirement.type} tone={getRequirementTone(requirement.status)}>
            {requirement.type}
          </Badge>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {state.show ? (
          <ButtonLink href={`/shows/${state.show.id}`} variant="secondary">
            Voir le spectacle
          </ButtonLink>
        ) : null}
        <GrantDossierZipButton state={state} />
      </div>
    </div>
  );
}

function DossierSummary({ state }: { state: GrantDossierState }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{state.grant.funder}</p>
          <p className="mt-1 text-sm text-muted">{state.grant.title}</p>
        </div>
        <Badge tone={getDossierTone(state)}>{getDossierReadinessPercent(state)}%</Badge>
      </div>
      {state.grant.eligibility ? (
        <p className="mt-3 text-sm text-muted">{state.grant.eligibility}</p>
      ) : null}
      <div className="mt-3 grid gap-2">
        {state.requirements.slice(0, 4).map((requirement) => (
          <div key={requirement.type} className="flex items-center justify-between gap-3 text-sm">
            <span>{requirement.type}</span>
            <Badge tone={getRequirementTone(requirement.status)}>
              {getRequirementLabel(requirement.status)}
            </Badge>
          </div>
        ))}
      </div>
      {state.grant.sourceUrl ? (
        <a
          className="mt-4 inline-flex text-sm font-medium text-accent hover:text-accent-strong"
          href={state.grant.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          Source officielle
        </a>
      ) : null}
    </div>
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
