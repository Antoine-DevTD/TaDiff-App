import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPipelineInsights } from "@/lib/pipeline";
import type { PipelineDeal } from "@/types";

export function PipelineInsights({ deals }: { deals: PipelineDeal[] }) {
  const insights = getPipelineInsights(deals);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {insights.map((insight) => (
        <Card key={insight.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">{insight.title}</p>
            <Badge tone={insight.tone}>{insight.value}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground">{insight.detail}</p>
        </Card>
      ))}
    </div>
  );
}
