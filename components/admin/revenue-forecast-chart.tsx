import { formatCurrency } from "@/lib/finance";
import type { RevenueForecast } from "@/lib/admin-forecast";

// Graphe MRR (reel approxime + prevision) en SVG pur.
export function RevenueForecastChart({ forecast }: { forecast: RevenueForecast }) {
  const { points, currentMrr, projectedMrr, monthlyNet } = forecast;

  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-panel-strong/35 p-6 text-center text-sm text-muted">
        Pas encore assez de compagnies actives pour tracer une courbe.
      </div>
    );
  }

  const width = 640;
  const height = 200;
  const padX = 12;
  const padY = 16;

  const values = points.map((point) => point.mrr);
  const max = Math.max(...values, 1);
  const stepX = (width - padX * 2) / (points.length - 1);
  const coords = points.map((point, index) => ({
    x: padX + index * stepX,
    y: padY + (height - padY * 2) * (1 - point.mrr / max),
    point,
  }));

  const splitIndex = points.reduce(
    (last, point, index) => (point.projected ? last : index),
    0,
  );

  const solid = coords
    .slice(0, splitIndex + 1)
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const dashed = coords
    .slice(splitIndex)
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-3 text-accent">
      <div className="flex flex-wrap items-end justify-between gap-3 text-foreground">
        <div>
          <p className="text-2xl font-semibold">{formatCurrency(currentMrr)}</p>
          <p className="text-xs text-muted">MRR estime aujourd&apos;hui</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{formatCurrency(projectedMrr)}</p>
          <p className="text-xs text-muted">
            Projection a 6 mois (+{monthlyNet.toFixed(1)} abonnement(s)/mois)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full min-w-[32rem]"
          preserveAspectRatio="none"
          role="img"
          aria-label="Courbe de revenu recurrent et projection"
        >
          <path d={solid} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <path
            d={dashed}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5 4"
            opacity="0.55"
          />
          {coords.map((c) => (
            <circle
              key={c.point.monthKey}
              cx={c.x}
              cy={c.y}
              r="3"
              fill="currentColor"
              opacity={c.point.projected ? 0.4 : 1}
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>{points[0].label}</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent" /> Reel estime
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent/50" style={{ backgroundImage: "none" }} /> Projection
          </span>
        </div>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
