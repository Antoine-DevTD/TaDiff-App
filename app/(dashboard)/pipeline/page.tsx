import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PipelineAddCard } from "@/components/pipeline/pipeline-add-card";
import { PipelineCreatePanel } from "@/components/pipeline/pipeline-create-panel";
import { ExploitationWorkspace } from "@/components/pipeline/exploitation-workspace";
import { getContacts, getExploitations, getPipelineDeals, getShows } from "@/lib/supabase/queries";

export default async function PipelinePage() {
  const [deals, contacts, shows, exploitations] = await Promise.all([
    getPipelineDeals(),
    getContacts(),
    getShows(),
    getExploitations(),
  ]);

  return (
    <div className="space-y-6">
      <PipelineCreatePanel contacts={contacts} shows={shows} />

      {deals.length === 0 ? (
        <PipelineAddCard variant="empty" />
      ) : (
        <PipelineBoard contacts={contacts} deals={deals} shows={shows} />
      )}

      <ExploitationWorkspace contacts={contacts} exploitations={exploitations} shows={shows} />
    </div>
  );
}
