import { OpportunityForm } from "@/components/pipeline/opportunity-form";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PipelineInsights } from "@/components/pipeline/pipeline-insights";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div>
        <h2 className="text-2xl font-semibold">Pipeline diffusion</h2>
        <p className="mt-1 text-sm text-muted">
          Suivez les opportunites, priorisez les relances et estimez le CA probable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle opportunite</CardTitle>
          <CardDescription>
            Associez un contact, un spectacle, une prochaine action et une date de relance.
          </CardDescription>
        </CardHeader>
        <OpportunityForm contacts={contacts} shows={shows} />
      </Card>

      {deals.length === 0 ? (
        <EmptyState
          title="Aucune opportunite"
          description="Creez une premiere opportunite pour commencer le suivi de diffusion."
        />
      ) : (
        <>
          <PipelineInsights deals={deals} />
          <PipelineBoard contacts={contacts} deals={deals} shows={shows} />
        </>
      )}
    </div>
  );
}
