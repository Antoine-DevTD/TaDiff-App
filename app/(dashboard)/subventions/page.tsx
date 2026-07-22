import { deleteGrantOpportunity } from "@/app/(dashboard)/actions";
import { GrantCreateDialog } from "@/components/grants/grant-create-dialog";
import { GrantDossierZipButton } from "@/components/grants/grant-dossier-zip-button";
import { GrantRequirementSlot } from "@/components/grants/grant-requirement-slot";
import { GrantImportButton } from "@/components/grants/grant-import-button";
import { GrantStatusSelect } from "@/components/grants/grant-status-select";
import { GrantShowSelect } from "@/components/grants/grant-show-select";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineDeleteButton } from "@/components/ui/inline-delete-button";
import { PlannedFeatureNotice } from "@/components/ui/planned-feature";
import { hasSupabaseEnv } from "@/lib/env";
import { formatCurrency } from "@/lib/finance";
import {
  buildGrantDossierState,
  getDossierReadinessPercent,
  getDossierTone,
  type GrantDossierState,
} from "@/lib/grants";
import {
  getCompanyDocuments,
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

export default async function SubventionsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus = "" } = await searchParams;
  const [grants, shows, documents, companyDocuments] = await Promise.all([
    getGrantOpportunities(),
    getShows(),
    getShowDocuments(),
    getCompanyDocuments(),
  ]);
  const showMap = new Map(shows.map((show) => [show.id, show]));
  const dossierStates = grants.map((grant) => {
    const show = grant.relatedShowId ? showMap.get(grant.relatedShowId) ?? null : null;
    const showDocuments = show
      ? documents.filter((document) => document.showId === show.id)
      : [];

    return buildGrantDossierState({ companyDocuments, documents: showDocuments, grant, show });
  });
  const totalExpected = grants.reduce((total, grant) => total + grant.amount, 0);
  const urgent = dossierStates.filter(
    (state) => getGrantTone(state.grant) === "warning" || getGrantTone(state.grant) === "danger",
  );
  const mounted = dossierStates.filter((state) => state.grant.status === "En montage");
  const priorityStates = Array.from(
    new Map([...urgent, ...mounted].map((state) => [state.grant.id, state])).values(),
  );
  const missingPieces = dossierStates.reduce((total, state) => total + state.missingCount, 0);
  const readyDossiers = dossierStates.filter(
    (state) => state.missingCount === 0 && state.updateCount === 0,
  );
  const statesByShow = shows
    .map((show) => ({ show, states: dossierStates.filter((state) => state.show?.id === show.id) }))
    .filter((group) => group.states.length > 0);
  const companyStates = dossierStates.filter((state) => !state.show);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
          <GrantCreateDialog shows={shows} />
          <GrantImportButton />
          <ButtonLink href="/calendar" variant="secondary">
            Voir les echeances
          </ButtonLink>
      </div>

      {hasSupabaseEnv() ? null : (
        <PlannedFeatureNotice
          detail="Sans base Supabase connectee, le radar affiche un jeu de dispositifs de demonstration."
          kind="demo-data"
        />
      )}

      {grants.length === 0 ? (
        <EmptyState
          title="Aucune aide suivie"
          description="Importez les 10 dispositifs de reference ou ajoutez un dispositif DRAC, Region, Fondation ou SACD ci-dessous."
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Aides suivies" value={grants.length.toString()} detail="Dispositifs actifs" />
            <MetricCard label="Dossiers prets" value={readyDossiers.length.toString()} detail="Pieces disponibles" />
            <MetricCard label="Pieces manquantes" value={missingPieces.toString()} detail="Avant depot" />
            <MetricCard label="Montant cible" value={formatCurrency(totalExpected)} detail="Total attendu" />
          </section>

          {priorityStates.length > 0 ? (
            <Card className="space-y-3 p-5" data-tour="radar-subventions">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">A traiter en priorite</p>
                <Badge tone="warning">{priorityStates.length}</Badge>
              </div>
              <div className="grid gap-2">
                {priorityStates.slice(0, 4).map((state) => (
                  <PriorityRow key={state.grant.id} state={state} />
                ))}
              </div>
            </Card>
          ) : null}

          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Dossiers en cours</p>
              <h2 className="mt-1 text-xl font-semibold">Les aides, spectacle par spectacle</h2>
              <p className="mt-1 text-sm text-muted">Chaque aide reprend automatiquement les pièces du spectacle auquel elle est rattachée.</p>
            </div>
            {statesByShow.map(({ show, states }) => (
              <GrantShowGroup key={show.id} title={show.title} states={states} shows={shows} focus={focus} />
            ))}
            {companyStates.length > 0 ? (
              <GrantShowGroup
                title="Aides générales de la compagnie"
                description="Ces aides ne sont pas encore rattachées à un spectacle. Vous pouvez le faire directement dans chaque dossier."
                states={companyStates}
                shows={shows}
                focus={focus}
                unassigned
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

function PriorityRow({ state }: { state: GrantDossierState }) {
  const grant = state.grant;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-panel-strong/40 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{grant.funder}</p>
        <p className="truncate text-sm text-muted">{state.show?.title ?? grant.title}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{formatCurrency(grant.amount)}</span>
        <Badge tone={getDossierTone(state)}>
          {state.readyCount}/{state.totalCount}
        </Badge>
        <Badge tone={getGrantTone(grant)}>{getDeadlineLabel(grant.deadline)}</Badge>
      </div>
    </div>
  );
}

function GrantShowGroup({
  description,
  focus,
  shows,
  states,
  title,
  unassigned = false,
}: {
  description?: string;
  focus: string;
  shows: Awaited<ReturnType<typeof getShows>>;
  states: GrantDossierState[];
  title: string;
  unassigned?: boolean;
}) {
  return (
    <Card className={unassigned ? "space-y-4 border-warning/30 bg-warning/[0.035] p-5" : "space-y-4 p-5"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{title}</p>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <Badge>{states.length}</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {states.map((state) => (
          <GrantRow key={state.grant.id} state={state} shows={shows} focused={focus === state.grant.id} />
        ))}
      </div>
    </Card>
  );
}

function GrantRow({
  focused,
  shows,
  state,
}: {
  focused: boolean;
  shows: Awaited<ReturnType<typeof getShows>>;
  state: GrantDossierState;
}) {
  const readiness = getDossierReadinessPercent(state);
  const grant = state.grant;

  return (
    <div
      id={`grant-${grant.id}`}
      className={focused
        ? "scroll-mt-28 rounded-lg border border-accent/40 bg-accent/[0.06] p-4 shadow-md ring-2 ring-accent/35"
        : "scroll-mt-28 rounded-lg border border-border bg-panel-strong/35 p-4"}
    >
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
      <details className="mt-3 rounded-md border border-border bg-panel/55">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          Voir les {state.totalCount} pieces demandees
        </summary>
        <div className="grid gap-2 border-t border-border p-3">
          {state.requirements.map((requirement) => (
            <GrantRequirementSlot
              key={requirement.type}
              requirement={requirement}
              showId={state.show?.id}
              showTitle={state.show?.title}
            />
          ))}
        </div>
      </details>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <GrantStatusSelect grantId={grant.id} status={grant.status} />
        <GrantShowSelect
          grantId={grant.id}
          initialShowId={state.show?.id ?? ""}
          shows={shows.map((show) => ({ id: show.id, title: show.title }))}
        />
        {state.show ? <ButtonLink href={`/shows/${state.show.id}`} variant="secondary">Voir le spectacle</ButtonLink> : null}
        <GrantDossierZipButton state={state} />
        {grant.sourceUrl ? (
          <a
            className="inline-flex items-center gap-1 text-sm font-medium text-accent underline underline-offset-2 hover:text-accent-strong"
            href={grant.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Source officielle ↗
          </a>
        ) : null}
        <InlineDeleteButton action={deleteGrantOpportunity.bind(null, grant.id)} label="Retirer" />
      </div>
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
