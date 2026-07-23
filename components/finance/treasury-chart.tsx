import { formatCurrency } from "@/lib/finance";
import type { TreasurySnapshot } from "@/types";

// Graphe de suivi de tresorerie : aire + ligne en SVG pur (pas de librairie).
export function TreasuryChart({ snapshots }: { snapshots: TreasurySnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-panel-strong/35 p-6 text-center text-sm text-muted">
        Saisissez au moins deux soldes pour visualiser la courbe de trésorerie.
      </div>
    );
  }

  const width = 640;
  const height = 200;
  const padX = 12;
  const padY = 16;

  const balances = snapshots.map((snapshot) => snapshot.balance);
  const min = Math.min(...balances, 0);
  const max = Math.max(...balances);
  const range = max - min || 1;

  const stepX = (width - padX * 2) / (snapshots.length - 1);
  const points = snapshots.map((snapshot, index) => {
    const x = padX + index * stepX;
    const y = padY + (height - padY * 2) * (1 - (snapshot.balance - min) / range);
    return { x, y, snapshot };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height - padY} L${points[0].x.toFixed(1)},${height - padY} Z`;

  const last = snapshots[snapshots.length - 1];
  const first = snapshots[0];
  const delta = last.balance - first.balance;

  return (
    <div className="space-y-3 text-accent">
      <div className="flex flex-wrap items-end justify-between gap-3 text-foreground">
        <div>
          <p className="text-2xl font-semibold">{formatCurrency(last.balance)}</p>
          <p className="text-xs text-muted">
            Dernier solde - {new Date(last.recordedOn).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            delta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {delta >= 0 ? "+" : ""}
          {formatCurrency(delta)} depuis {new Date(first.recordedOn).toLocaleDateString("fr-FR")}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full min-w-[32rem]"
          preserveAspectRatio="none"
          role="img"
          aria-label="Courbe de trésorerie"
        >
          <defs>
            <linearGradient id="treasury-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#treasury-fill)" />
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          {points.map((point) => (
            <circle key={point.snapshot.id} cx={point.x} cy={point.y} r="3.5" fill="currentColor" />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-xs text-muted">
        <span>{new Date(first.recordedOn).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}</span>
        <span>{new Date(last.recordedOn).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}</span>
      </div>
    </div>
  );
}
