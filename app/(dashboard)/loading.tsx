export default function DashboardLoading() {
  return (
    <div aria-label="Chargement de la rubrique" aria-live="polite" className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-panel-strong" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg border border-border bg-panel" />
        <div className="h-28 animate-pulse rounded-lg border border-border bg-panel" />
        <div className="h-28 animate-pulse rounded-lg border border-border bg-panel" />
      </div>
      <div className="h-72 animate-pulse rounded-lg border border-border bg-panel" />
      <span className="sr-only">Chargement en cours</span>
    </div>
  );
}
