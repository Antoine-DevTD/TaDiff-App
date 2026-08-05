"use client";

import { BarChart3, CircleHelp, MessageSquareText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminWilliamQuestionEvent } from "@/lib/supabase/admin";

const topicLabels: Record<string, string> = {
  actions: "Actions",
  spectacles: "Spectacles",
  diffusion: "Diffusion",
  emails: "Emails et contacts",
  documents: "Documents",
  finances: "Finances",
  aides: "Aides et mécénat",
  agenda: "Agenda",
  tadiff: "Utilisation de TaDiff",
  autre: "Autre",
};

export function WilliamAnalyticsPanel({ events }: { events: AdminWilliamQuestionEvent[] }) {
  const [companyId, setCompanyId] = useState("all");
  const [answerState, setAnswerState] = useState("all");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const companies = useMemo(() => Array.from(new Map(events.map((event) => [event.companyId, event.companyName])).entries()).sort((a, b) => a[1].localeCompare(b[1], "fr")), [events]);
  const filteredEvents = useMemo(() => events
    .filter((event) => companyId === "all" || event.companyId === companyId)
    .filter((event) => answerState === "all" || (answerState === "unanswered" ? !event.answered : event.answered))
    .filter((event) => !search.trim() || event.questionExcerpt.toLocaleLowerCase("fr-FR").includes(search.trim().toLocaleLowerCase("fr-FR")))
    .sort((left, right) => sort === "oldest" ? left.createdAt.localeCompare(right.createdAt) : right.createdAt.localeCompare(left.createdAt)), [answerState, companyId, events, search, sort]);
  const topics = Object.entries(filteredEvents.reduce<Record<string, number>>((counts, event) => {
    counts[event.topic] = (counts[event.topic] ?? 0) + 1;
    return counts;
  }, {})).sort((left, right) => right[1] - left[1]);
  const unanswered = filteredEvents.filter((event) => !event.answered).length;
  const uniqueQuestions = Array.from(new Map(filteredEvents.map((event) => [event.questionExcerpt.toLocaleLowerCase("fr-FR"), event])).values()).slice(0, 50);

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 text-accent" />
        <div><h3 className="text-xl font-semibold">Questions posées à William</h3><p className="mt-1 text-sm text-muted">Vue agrégée sur 30 jours, conservation maximale de 90 jours. Les emails et numéros de téléphone sont masqués avant enregistrement.</p></div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_180px_180px]">
        <label className="relative"><span className="sr-only">Rechercher une question</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une question" /></label>
        <label><span className="sr-only">Filtrer par compagnie</span><Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="all">Toutes les compagnies</option>{companies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></label>
        <label><span className="sr-only">Filtrer par réponse</span><Select value={answerState} onChange={(event) => setAnswerState(event.target.value)}><option value="all">Toutes les réponses</option><option value="unanswered">À améliorer</option><option value="answered">Répondues</option></Select></label>
        <label><span className="sr-only">Trier les questions</span><Select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Plus récentes</option><option value="oldest">Plus anciennes</option></Select></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Questions" value={filteredEvents.length} />
        <Metric label="Thèmes actifs" value={topics.length} />
        <Metric label="Sans réponse utile" value={unanswered} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
        <section><h4 className="flex items-center gap-2 font-semibold"><MessageSquareText className="h-4 w-4" />Thèmes demandés</h4><div className="mt-3 space-y-2">{topics.length ? topics.map(([topic, count]) => <div key={topic} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span>{topicLabels[topic] ?? topic}</span><Badge>{count}</Badge></div>) : <Empty />}</div></section>
        <section><h4 className="flex items-center gap-2 font-semibold"><CircleHelp className="h-4 w-4" />Questions récentes</h4><div className="mt-3 max-h-[42rem] space-y-2 overflow-y-auto pr-1">{uniqueQuestions.length ? uniqueQuestions.map((event) => <div key={event.id} className="rounded-md border border-border bg-panel-strong/35 p-3"><p className="text-sm leading-5">{event.questionExcerpt}</p><div className="mt-2 flex flex-wrap gap-2"><Badge>{event.companyName}</Badge><Badge>{topicLabels[event.topic] ?? event.topic}</Badge>{!event.answered ? <Badge tone="warning">À améliorer</Badge> : null}{event.outOfScope ? <Badge tone="neutral">Hors périmètre</Badge> : null}</div></div>) : <Empty />}</div></section>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md bg-panel-strong/45 p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>; }
function Empty() { return <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">Les premières données apparaîtront après application de la migration 043.</p>; }
