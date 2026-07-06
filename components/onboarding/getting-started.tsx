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
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Commencer
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {nextStep
              ? `Prochaine étape : ${nextStep.label.toLowerCase()}`
              : "Votre compagnie est en place."}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {doneCount}/{steps.length} étapes faites. Du premier spectacle jusqu&apos;à la
            première relance, chaque étape alimente le cockpit.
          </p>
        </div>
        <TourLauncher label="Visite guidée (3 min)" />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <Link
            key={step.id}
            className={[
              "rounded-lg border p-4 transition",
              step.done
                ? "border-border bg-panel-strong/30 opacity-70"
                : "border-border bg-panel-strong/45 hover:border-accent/40 hover:bg-panel-strong/70",
            ].join(" ")}
            href={step.href}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-panel text-xs font-semibold">
                {step.done ? "✓" : index + 1}
              </span>
              <Badge tone={step.done ? "success" : "neutral"}>
                {step.done ? "Fait" : "À faire"}
              </Badge>
            </div>
            <p className="mt-3 font-medium">{step.label}</p>
            <p className="mt-1 text-sm text-muted">{step.detail}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
