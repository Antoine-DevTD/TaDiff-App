import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminPublicAnalyticsEvent } from "@/lib/supabase/admin";

export function PublicAnalyticsPanel({
  events,
  generatedAt,
}: {
  events: AdminPublicAnalyticsEvent[];
  generatedAt: string;
}) {
  const pageViews = events.filter((event) => event.eventType === "page_view");
  const clicks = events.filter((event) => event.eventType === "cta_click");
  const signups = events.filter((event) => event.eventType === "beta_signup");
  const sessions = new Set(pageViews.map((event) => event.sessionId));
  const convertedSessions = new Set(signups.map((event) => event.sessionId));
  const conversionRate = sessions.size > 0 ? (convertedSessions.size / sessions.size) * 100 : 0;
  const recentThreshold = new Date(generatedAt).getTime() - 24 * 60 * 60 * 1000;
  const sessions24h = new Set(
    pageViews
      .filter((event) => new Date(event.createdAt).getTime() >= recentThreshold)
      .map((event) => event.sessionId),
  ).size;

  const topPages = countBy(pageViews, (event) => event.path);
  const topCtas = countBy(clicks, (event) => event.eventName || "cta_inconnu");
  const topSources = countBy(pageViews, (event) =>
    event.utmSource || event.referrerHost || "Accès direct",
  );
  const devices = countBy(pageViews, (event) => event.deviceType);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Visiteurs" value={sessions.size.toString()} detail="Sessions sur 30 jours" />
        <Metric label="Dernieres 24 h" value={sessions24h.toString()} detail="Sessions recentes" />
        <Metric label="Pages vues" value={pageViews.length.toString()} detail="Toutes pages publiques" />
        <Metric label="Clics CTA" value={clicks.length.toString()} detail="Boutons suivis" />
        <Metric label="Conversion" value={`${formatPercent(conversionRate)} %`} detail={`${signups.length} inscription(s)`} />
      </section>

      {events.length === 0 ? (
        <Card className="border-dashed p-6 text-sm text-muted">
          Aucune donnee publique pour le moment. Appliquez la migration 030, puis ouvrez la
          landing dans un nouvel onglet pour enregistrer la première visite.
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <Ranking title="Pages consultées" rows={topPages} empty="Aucune page vue" />
            <Ranking title="Boutons les plus cliques" rows={topCtas} empty="Aucun clic suivi" />
            <Ranking title="Provenance" rows={topSources} empty="Aucune source" />
            <Ranking title="Appareils" rows={devices} empty="Aucun appareil" />
          </section>

          <Card className="space-y-4 p-5">
            <div>
              <p className="text-base font-semibold">Evenements recents</p>
              <p className="mt-1 text-sm text-muted">
                Identifiants anonymes limités a une session. Aucune IP ni adresse email n&apos;est
                collectee ici.
              </p>
            </div>
            <div className="space-y-2">
              {events.slice(0, 80).map((event) => (
                <AnalyticsEventRow event={event} key={event.id} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function countBy(
  events: AdminPublicAnalyticsEvent[],
  key: (event: AdminPublicAnalyticsEvent) => string,
) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const label = key(event);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

function Ranking({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <Card className="p-5">
      <p className="text-base font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="truncate text-foreground">{formatLabel(row.label)}</p>
                <p className="shrink-0 font-semibold">{row.value}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-strong">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(5, (row.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AnalyticsEventRow({ event }: { event: AdminPublicAnalyticsEvent }) {
  const labels = {
    page_view: "Page vue",
    cta_click: "Clic",
    beta_signup: "Inscription",
  } as const;

  return (
    <div className="grid gap-2 rounded-md border border-border bg-panel-strong/35 px-4 py-3 text-sm md:grid-cols-[130px_1fr_180px] md:items-center">
      <Badge tone={event.eventType === "beta_signup" ? "success" : event.eventType === "cta_click" ? "warning" : "neutral"}>
        {labels[event.eventType]}
      </Badge>
      <div className="min-w-0">
        <p className="truncate font-medium">
          {event.eventName ? formatLabel(event.eventName) : event.path}
        </p>
        <p className="truncate text-xs text-muted">
          {event.path}
          {event.utmSource || event.referrerHost
            ? ` - ${event.utmSource || event.referrerHost}`
            : " - accès direct"}
          {` - ${formatLabel(event.deviceType)}`}
        </p>
      </div>
      <p className="text-xs text-muted md:text-right">
        {new Date(event.createdAt).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </Card>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatPercent(value: number) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}
