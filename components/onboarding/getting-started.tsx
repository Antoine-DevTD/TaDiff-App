import Link from "next/link";
import { TourLauncher } from "@/components/tour/tour-launcher";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type OnboardingStep = {
  id: string;
  label: string;
  detail: string;
  href: string;
  done: boolean;
};

export function GettingStarted({ steps }: { steps: OnboardingStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done);
  const percent = steps.length === 0 ? 100 : Math.round((doneCount / steps.length) * 100);

  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-4 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Mise en route compagnie
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {nextStep
                ? `Prochaine etape : ${nextStep.label.toLowerCase()}`
                : "Votre cockpit est prêt."}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {doneCount}/{steps.length} étapes terminées. Une seule action suffit pour continuer.
            </p>
          </div>
          <TourLauncher label="Visite guidée (3 min)" />
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            aria-label={`Mise en route terminee a ${percent} %`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percent}
            className="h-full rounded-full bg-accent transition-[width]"
            role="progressbar"
            style={{ width: `${percent}%` }}
          />
        </div>

        {nextStep ? (
          <Link
            className="group flex flex-col justify-between gap-4 rounded-lg border border-accent/30 bg-accent-soft/40 p-4 transition hover:border-accent/60 hover:bg-accent-soft/70 sm:flex-row sm:items-center"
            href={nextStep.href}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">À faire maintenant</Badge>
                <p className="font-semibold">{nextStep.label}</p>
              </div>
              <p className="mt-2 text-sm text-muted">{nextStep.detail}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-accent transition group-hover:translate-x-1">
              Commencer <span aria-hidden="true">→</span>
            </span>
          </Link>
        ) : (
          <div className="rounded-lg border border-success/30 bg-success/10 p-4">
            <Badge tone="success">Cockpit prêt</Badge>
            <p className="mt-2 text-sm text-muted">
              Les bases de votre espace sont renseignees. Vous pouvez les modifier a tout moment.
            </p>
          </div>
        )}
      </div>

      <details className="group border-t border-border">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium transition hover:bg-panel-strong/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
          <span className="flex items-center justify-between gap-3">
            Voir toutes les étapes
            <span aria-hidden="true" className="text-muted transition group-open:rotate-180">
              ↓
            </span>
          </span>
        </summary>
        <div className="divide-y divide-border border-t border-border">
          {steps.map((step, index) => (
            <Link
              key={step.id}
              className="flex items-start gap-3 px-5 py-3 transition hover:bg-panel-strong/50"
              href={step.href}
            >
              <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border border-border bg-panel px-2 text-xs font-semibold">
                {step.done ? "OK" : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{step.label}</p>
                  <Badge tone={step.done ? "success" : "neutral"}>
                    {step.done ? "Fait" : "À faire"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">{step.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </details>
    </Card>
  );
}
