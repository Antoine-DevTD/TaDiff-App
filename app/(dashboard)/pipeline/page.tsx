import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PipelineCreatePanel } from "@/components/pipeline/pipeline-create-panel";
import { PipelineInsights } from "@/components/pipeline/pipeline-insights";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { getContacts, getPipelineDeals, getShows } from "@/lib/supabase/queries";

export default async function PipelinePage() {
  const [deals, contacts, shows] = await Promise.all([
    getPipelineDeals(),
    getContacts(),
    getShows(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <PageTitle href="/pipeline">Dates a vendre</PageTitle>
        <p className="mt-1 text-sm text-muted">
          Ajoutez les dates possibles, voyez ou ca en est et ce qu&apos;il faut faire pour les transformer en dates confirmees.
        </p>
      </div>

      <div data-tour="diffusion-creation">
        <PipelineCreatePanel contacts={contacts} shows={shows} />
      </div>

      {deals.length === 0 ? (
        <EmptyState
          title="Aucune date possible"
          description="Creez une premiere date possible pour commencer le suivi."
        />
      ) : (
        <>
          <PipelineBoard contacts={contacts} deals={deals} shows={shows} />
          <details className="group rounded-lg border border-border bg-panel p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
              Pilotage avance
              <span className="ml-2 text-xs font-normal text-muted group-open:hidden">
                Voir les alertes et indicateurs
              </span>
            </summary>
            <div className="mt-4">
              <PipelineInsights deals={deals} />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
