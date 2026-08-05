import { formatCurrency } from "@/lib/finance";

export type TreasuryProjectionPoint = {
  label: string;
  central: number;
  prudent: number;
  optimistic: number;
  income: number;
  expense: number;
};

export function TreasuryChart({ points }: { points: TreasuryProjectionPoint[] }) {
  if (points.length < 2) return null;

  const width = 920;
  const height = 310;
  const pad = { x: 48, top: 20, bottom: 52 };
  const values = points.flatMap((point) => [point.prudent, point.optimistic, point.central, 0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartHeight = height - pad.top - pad.bottom;
  const x = (index: number) => pad.x + (index * (width - pad.x * 2)) / (points.length - 1);
  const y = (value: number) => pad.top + chartHeight * (1 - (value - min) / range);
  const line = (key: "central" | "prudent" | "optimistic") =>
    points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");
  const band = `${line("optimistic")} ${[...points].reverse().map((point, reverseIndex) => `L${x(points.length - 1 - reverseIndex).toFixed(1)},${y(point.prudent).toFixed(1)}`).join(" ")} Z`;
  const zeroY = y(0);

  return (
    <div className="overflow-x-auto">
      <svg className="h-[19rem] min-w-[46rem] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Projection de trésorerie sur treize semaines, avec scénarios prudent, central et optimiste">
        <defs>
          <linearGradient id="treasury-range" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = min + range * ratio;
          return <g key={ratio}><line x1={pad.x} x2={width - pad.x} y1={y(value)} y2={y(value)} stroke="currentColor" className="text-border" strokeDasharray="3 5" /><text x={pad.x - 8} y={y(value) + 4} textAnchor="end" className="fill-muted text-[10px]">{formatCurrency(value)}</text></g>;
        })}
        {min < 0 && max > 0 ? <line x1={pad.x} x2={width - pad.x} y1={zeroY} y2={zeroY} stroke="currentColor" className="text-danger" strokeDasharray="5 5" /> : null}
        <path d={band} fill="url(#treasury-range)" />
        <path d={line("prudent")} fill="none" stroke="currentColor" className="text-warning" strokeDasharray="6 5" strokeWidth="1.5" />
        <path d={line("optimistic")} fill="none" stroke="currentColor" className="text-success" strokeDasharray="6 5" strokeWidth="1.5" />
        <path d={line("central")} fill="none" stroke="currentColor" className="text-accent" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point, index) => <g key={`${point.label}-${index}`}><circle cx={x(index)} cy={y(point.central)} r="3.5" className="fill-accent" /><text x={x(index)} y={height - 18} textAnchor="middle" className="fill-muted text-[10px]">{point.label}</text></g>)}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted" aria-hidden>
        <Legend className="bg-accent" label="Scénario central" /><Legend className="bg-warning" label="Prudent" dashed /><Legend className="bg-success" label="Optimiste" dashed />
      </div>
    </div>
  );
}

function Legend({ className, label, dashed = false }: { className: string; label: string; dashed?: boolean }) {
  return <span className="flex items-center gap-2"><span className={`h-0.5 w-5 ${className} ${dashed ? "opacity-70" : ""}`} />{label}</span>;
}
