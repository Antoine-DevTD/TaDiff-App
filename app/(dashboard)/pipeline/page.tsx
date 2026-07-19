import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PipelineCreatePanel } from "@/components/pipeline/pipeline-create-panel";
import { PipelineInsights } from "@/components/pipeline/pipeline-insights";
import { EmptyState } from "@/components/ui/empty-state";
import { getContacts, getPipelineDeals, getShows } from "@/lib/supabase/queries";

export default async function PipelinePage() {
  const [deals, contacts, shows] = await Promise.all([
    getPipelineDeals(),
    getContacts(),
    getShows(),
  ]);

  return (
    <div className="space-y-6">
      <PipelineCreatePanel contacts={contacts} shows={shows} />

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
