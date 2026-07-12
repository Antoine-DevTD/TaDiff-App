"use client";

import { ArrowLeft, ArrowRight, Building2, ImageIcon, Sparkles, Theater, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  completeWelcomeOnboarding,
  type WelcomeOnboardingValues,
} from "@/app/welcome/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WelcomeStep = "hello" | "person" | "company" | "logo" | "show";

const steps: WelcomeStep[] = ["hello", "person", "company", "logo", "show"];
const tourStorageKey = "tadiff-visite-guidee";

export function WelcomeOnboarding({
  initialCompanyName,
  initialFullName,
  initialLogoUrl,
}: {
  initialCompanyName: string;
  initialFullName: string;
  initialLogoUrl: string;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<WelcomeOnboardingValues>({
    fullName: initialFullName,
    companyName: initialCompanyName,
    logoUrl: initialLogoUrl,
    showReadiness: "ready",
  });

  const currentStep = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const canGoNext = useMemo(() => {
    if (currentStep === "person") return values.fullName.trim().length >= 2;
    if (currentStep === "company") return values.companyName.trim().length >= 2;
    return true;
  }, [currentStep, values.companyName, values.fullName]);

  function updateField<K extends keyof WelcomeOnboardingValues>(
    key: K,
    value: WelcomeOnboardingValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function goNext() {
    if (!canGoNext) {
      setMessage("William a besoin de cette information pour preparer l'espace.");
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    setMessage(null);
  }

  function submit() {
    if (!canGoNext) return;

    startTransition(async () => {
      setMessage("William prepare votre espace...");
      const result = await completeWelcomeOnboarding(values);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      window.localStorage.setItem(tourStorageKey, JSON.stringify({ active: true, step: 0 }));
      router.push(result.nextPath);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.10),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef4ff_45%,#f7f2ea_100%)] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <section className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel/80 px-3 py-2 text-sm text-muted shadow-sm shadow-ink/5 backdrop-blur">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden />
              Accueil cockpit compagnie
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">TaDiff</p>
              <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
                Bienvenue, je suis William.
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted">
                Ravi d&apos;etre en votre compagnie. Je vais preparer votre espace, puis vous guider
                dans les premieres actions utiles.
              </p>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-panel-strong">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel/92 p-5 shadow-2xl shadow-ink/10 backdrop-blur sm:p-8">
            <div className="mb-7 flex items-center justify-between gap-4">
              <WilliamMark active={isPending} />
              <p className="text-sm text-muted">
                Etape {stepIndex + 1}/{steps.length}
              </p>
            </div>

            <div className="min-h-[300px]">
              <StepContent
                step={currentStep}
                values={values}
                onChange={updateField}
                pending={isPending}
              />
            </div>

            {message ? (
              <p className="mt-4 rounded-md bg-panel-strong px-3 py-2 text-sm text-muted">{message}</p>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={stepIndex === 0 || isPending}
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              >
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                Retour
              </Button>

              {stepIndex < steps.length - 1 ? (
                <Button type="button" onClick={goNext} disabled={isPending}>
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button type="button" onClick={submit} disabled={isPending}>
                  {isPending ? "Preparation..." : "Entrer dans le cockpit"}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StepContent({
  onChange,
  pending,
  step,
  values,
}: {
  onChange: <K extends keyof WelcomeOnboardingValues>(
    key: K,
    value: WelcomeOnboardingValues[K],
  ) => void;
  pending: boolean;
  step: WelcomeStep;
  values: WelcomeOnboardingValues;
}) {
  if (step === "person") {
    return (
      <WelcomePane
        icon={UserRound}
        title="Comment dois-je vous appeler ?"
        body="Ce nom servira dans l'espace equipe et dans les traces d'activite."
      >
        <Input
          autoFocus
          disabled={pending}
          placeholder="Prenom Nom"
          value={values.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
        />
      </WelcomePane>
    );
  }

  if (step === "company") {
    return (
      <WelcomePane
        icon={Building2}
        title="Quelle compagnie pilotez-vous ?"
        body="William utilise ce nom pour creer le bon espace et libeller le cockpit."
      >
        <Input
          autoFocus
          disabled={pending}
          placeholder="Compagnie de l'Estran"
          value={values.companyName}
          onChange={(event) => onChange("companyName", event.target.value)}
        />
      </WelcomePane>
    );
  }

  if (step === "logo") {
    return (
      <WelcomePane
        icon={ImageIcon}
        title="Avez-vous deja un logo ?"
        body="Optionnel pour la demo. Vous pourrez aussi l'ajouter plus tard dans les reglages."
      >
        <Input
          disabled={pending}
          placeholder="https://..."
          value={values.logoUrl ?? ""}
          onChange={(event) => onChange("logoUrl", event.target.value)}
        />
      </WelcomePane>
    );
  }

  if (step === "show") {
    return (
      <WelcomePane
        icon={Theater}
        title="Avez-vous un spectacle a ajouter ?"
        body="La premiere action conseillee sera de creer ou completer votre premier dossier spectacle."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceButton
            active={values.showReadiness === "ready"}
            label="Oui, on commence"
            onClick={() => onChange("showReadiness", "ready")}
          />
          <ChoiceButton
            active={values.showReadiness === "later"}
            label="Pas encore"
            onClick={() => onChange("showReadiness", "later")}
          />
        </div>
      </WelcomePane>
    );
  }

  return (
    <WelcomePane
      icon={Sparkles}
      title="Je m'occupe de la mise en place."
      body="Quelques informations suffisent pour que le cockpit soit comprehensible des le premier ecran."
    >
      <div className="rounded-lg border border-border bg-panel-strong/65 p-4 text-sm text-muted">
        On va rester simple : votre nom, votre compagnie, puis la visite guidee.
      </div>
    </WelcomePane>
  );
}

function WelcomePane({
  body,
  children,
  icon: Icon,
  title,
}: {
  body: string;
  children: React.ReactNode;
  icon: typeof Sparkles;
  title: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{body}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function ChoiceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-14 rounded-lg border px-4 text-left text-sm font-semibold transition",
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-panel hover:border-accent/40 hover:bg-panel-strong",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function WilliamMark({ active }: { active: boolean }) {
  return (
    <div className="relative h-16 w-16">
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-accent/18 transition-transform duration-700",
          active ? "scale-110 animate-pulse" : "scale-100",
        )}
      />
      <span className="absolute inset-2 grid place-items-center rounded-full bg-accent text-sm font-semibold text-white shadow-lg shadow-accent/25">
        W
      </span>
    </div>
  );
}
