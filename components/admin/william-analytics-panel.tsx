import { BarChart3, CircleHelp, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminWilliamQuestionEvent } from "@/lib/supabase/admin";

const topicLabels: Record<string, string> = {
  actions: "Actions",
  spectacles: "Spectacles",
  diffusion: "Diffusion",
  emails: "Emails et contacts",
  documents: "Documents",
  finances: "Finances",
  aides: "Aides et mecenat",
  agenda: "Agenda",
  tadiff: "Utilisation de TaDiff",
  autre: "Autre",
};

export function WilliamAnalyticsPanel({ events }: { events: AdminWilliamQuestionEvent[] }) {
  const topics = Object.entries(events.reduce<Record<string, number>>((counts, event) => {
    counts[event.topic] = (counts[event.topic] ?? 0) + 1;
    return counts;
  }, {})).sort((left, right) => right[1] - left[1]);
  const unanswered = events.filter((event) => !event.answered).length;
  const uniqueQuestions = Array.from(new Map(events.map((event) => [event.questionExcerpt.toLocaleLowerCase("fr-FR"), event])).values()).slice(0, 12);

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 text-accent" />
        <div><h3 className="text-xl font-semibold">Questions posees a William</h3><p className="mt-1 text-sm text-muted">Vue agregee sur 30 jours, conservation maximale de 90 jours. Les emails et numeros de telephone sont masques avant enregistrement.</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Questions" value={events.length} />
        <Metric label="Themes actifs" value={topics.length} />
        <Metric label="Sans reponse utile" value={unanswered} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
        <section><h4 className="flex items-center gap-2 font-semibold"><MessageSquareText className="h-4 w-4" />Themes demandes</h4><div className="mt-3 space-y-2">{topics.length ? topics.map(([topic, count]) => <div key={topic} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span>{topicLabels[topic] ?? topic}</span><Badge>{count}</Badge></div>) : <Empty />}</div></section>
        <section><h4 className="flex items-center gap-2 font-semibold"><CircleHelp className="h-4 w-4" />Questions recentes</h4><div className="mt-3 space-y-2">{uniqueQuestions.length ? uniqueQuestions.map((event) => <div key={event.id} className="rounded-md border border-border bg-panel-strong/35 p-3"><p className="text-sm leading-5">{event.questionExcerpt}</p><div className="mt-2 flex flex-wrap gap-2"><Badge>{topicLabels[event.topic] ?? event.topic}</Badge>{!event.answered ? <Badge tone="warning">A ameliorer</Badge> : null}{event.outOfScope ? <Badge tone="neutral">Hors perimetre</Badge> : null}</div></div>) : <Empty />}</div></section>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md bg-panel-strong/45 p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>; }
function Empty() { return <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">Les premieres donnees apparaitront apres application de la migration 043.</p>; }
