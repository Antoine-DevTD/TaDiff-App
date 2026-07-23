import { GrantCreateDialog } from "@/components/grants/grant-create-dialog";
import { GrantsWorkspace } from "@/components/grants/grants-workspace";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlannedFeatureNotice } from "@/components/ui/planned-feature";
import { hasSupabaseEnv } from "@/lib/env";
import { buildGrantDossierState } from "@/lib/grants";
import {
  getCompanyDocuments,
  getGrantOpportunities,
  getShowDocuments,
  getShows,
} from "@/lib/supabase/queries";

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
    return buildGrantDossierState({
      companyDocuments,
      documents: show ? documents.filter((document) => document.showId === show.id) : [],
      grant,
      show,
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <GrantCreateDialog shows={shows} />
        <ButtonLink href="/calendar" variant="secondary">Voir les échéances</ButtonLink>
      </div>

      {hasSupabaseEnv() ? null : (
        <PlannedFeatureNotice
          detail="Sans base Supabase connectée, le radar affiche un jeu de dispositifs de démonstration."
          kind="demo-data"
        />
      )}

      {grants.length === 0 ? (
        <EmptyState
          title="Aucune aide suivie"
          description="Ajoutez une aide à suivre. Les dispositifs de référence sont préparés automatiquement à la création de l'espace."
        />
      ) : (
        <GrantsWorkspace initialFocusId={focus} shows={shows} states={dossierStates} />
      )}
    </div>
  );
}
