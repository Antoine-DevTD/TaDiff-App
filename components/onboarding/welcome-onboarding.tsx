"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  ContactRound,
  Gauge,
  Sparkles,
  Theater,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  completeWelcomeOnboarding,
  type WelcomeOnboardingValues,
} from "@/app/welcome/actions";
import { WilliamStage } from "@/components/onboarding/william-stage";
import { PosterUploadField } from "@/components/shows/poster-upload-field";
import { tourStorageKey } from "@/components/tour/guided-tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoSignupProfileStorageKey } from "@/lib/demo-webinar";
import { cn } from "@/lib/utils";

type WelcomeStep = "hello" | "identity" | "first-action";
type FirstAction = WelcomeOnboardingValues["firstAction"];

const steps: WelcomeStep[] = ["hello", "identity", "first-action"];

const firstActions: Array<{
  value: FirstAction;
  label: string;
  detail: string;
  icon: typeof Theater;
  keywords: string[];
}> = [
  {
    value: "show",
    label: "Créer un spectacle",
    detail: "Poser le dossier central : titre, discipline, équipe et documents.",
    icon: Theater,
    keywords: ["spectacle", "production", "création", "creation"],
  },
  {
    value: "contacts",
    label: "Ajouter un premier contact",
    detail: "Créer la fiche d’un lieu, d’un programmateur ou d’un partenaire.",
    icon: ContactRound,
    keywords: ["contact", "diffusion", "relance", "programmateur"],
  },
  {
    value: "calendar",
    label: "Noter une date importante",
    detail: "Ajouter une représentation, une échéance ou un rendez-vous.",
    icon: CalendarDays,
    keywords: ["date", "agenda", "échéance", "echeance", "calendrier"],
  },
  {
    value: "tour",
    label: "Découvrir le cockpit",
    detail: "Faire d'abord une visite guidée de trois minutes avec William.",
    icon: Gauge,
    keywords: ["trésorerie", "tresorerie", "finance", "budget", "argent", "document", "dossier", "subvention", "financement"],
  },
];

function suggestedFirstAction(mainNeed: string): FirstAction {
  const normalizedNeed = mainNeed.toLocaleLowerCase("fr");
  return firstActions.find((action) =>
    action.keywords.some((keyword) => normalizedNeed.includes(keyword)),
  )?.value ?? "show";
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "vous";
}

export function WelcomeOnboarding({
  initialCompanyName,
  initialFullName,
  initialLogoUrl,
  initialMainNeed,
  fromSignup = false,
  replay = false,
}: {
  fromSignup?: boolean;
  initialCompanyName: string;
  initialFullName: string;
  initialLogoUrl: string;
  initialMainNeed: string;
  replay?: boolean;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const stepPanelRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<WelcomeOnboardingValues>({
    fullName: initialFullName,
    companyName: initialCompanyName,
    logoUrl: initialLogoUrl,
    replay,
    firstAction: suggestedFirstAction(initialMainNeed),
  });

  useEffect(() => {
    if (!fromSignup) return;
    const storedProfile = window.sessionStorage.getItem(demoSignupProfileStorageKey);
    if (!storedProfile) return;

    try {
      const parsed = JSON.parse(storedProfile) as {
        companyName?: unknown;
        fullName?: unknown;
      };
      const synchronization = window.setTimeout(() => {
        setValues((current) => ({
          ...current,
          companyName:
            typeof parsed.companyName === "string" && parsed.companyName.trim()
              ? parsed.companyName.trim()
              : current.companyName,
          fullName:
            typeof parsed.fullName === "string" && parsed.fullName.trim()
              ? parsed.fullName.trim()
              : current.fullName,
        }));
      }, 0);
      window.sessionStorage.removeItem(demoSignupProfileStorageKey);
      return () => window.clearTimeout(synchronization);
    } catch {
      window.sessionStorage.removeItem(demoSignupProfileStorageKey);
    }
  }, [fromSignup]);

  useEffect(() => {
    if (stepIndex > 0) stepPanelRef.current?.focus();
  }, [stepIndex]);

  const currentStep = steps[stepIndex];
  const recommendedAction = initialMainNeed.trim() ? suggestedFirstAction(initialMainNeed) : null;
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const canGoNext = useMemo(
    () => currentStep !== "identity" || (
      values.fullName.trim().length >= 2 && values.companyName.trim().length >= 2
    ),
    [currentStep, values.companyName, values.fullName],
  );
  const displayFirstName = firstName(values.fullName);

  function updateField<K extends keyof WelcomeOnboardingValues>(
    key: K,
    value: WelcomeOnboardingValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function goNext() {
    if (!canGoNext) {
      setMessage("Vérifiez votre prénom, votre nom et celui de votre compagnie.");
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    setMessage(null);
  }

  function submit() {
    startTransition(async () => {
      setMessage(`Nous préparons l’espace de ${values.companyName}…`);
      const result = await completeWelcomeOnboarding(values);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (values.firstAction === "tour" || replay) {
        window.localStorage.setItem(tourStorageKey, JSON.stringify({ active: true, step: 0 }));
      }
      router.push(result.nextPath);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_18%,rgba(29,78,216,0.10),transparent_30%),linear-gradient(135deg,#f8fafc_0%,#e8eef7_52%,#f8fafc_100%)] px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <section className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          <div className="space-y-5">
            <WilliamStage activeStep={stepIndex} busy={isPending} />
            <div>
              <p className="text-sm font-semibold text-accent">Bienvenue dans TaDiff</p>
              <h1 className="mt-2 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
                {values.fullName ? `Bonjour ${displayFirstName}.` : "Bonjour."}
                <span className="block text-muted">Préparons votre cockpit.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                Nous vérifions vos informations, puis vous choisissez la première action utile pour votre compagnie.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-panel p-5 shadow-xl shadow-ink/10 sm:p-8">
            <div className="mb-7 flex items-center gap-4">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-strong">
                <div
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progress}
                  aria-label="Progression de la préparation du cockpit"
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  role="progressbar"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="shrink-0 text-sm text-muted">{stepIndex + 1} sur {steps.length}</p>
            </div>

            <div
              ref={stepPanelRef}
              aria-live="polite"
              className="min-h-[360px] focus:outline-none"
              tabIndex={-1}
            >
              <StepContent
                firstName={displayFirstName}
                onChange={updateField}
                pending={isPending}
                recommendedAction={recommendedAction}
                step={currentStep}
                values={values}
              />
            </div>

            {message ? (
              <p aria-live="polite" className="mt-4 rounded-md bg-panel-strong px-3 py-2 text-sm text-muted">
                {message}
              </p>
            ) : null}

            <div className="mt-7 flex items-center justify-between gap-3">
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
                  {isPending ? "Préparation…" : "Commencer cette action"}
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
  firstName: displayFirstName,
  onChange,
  pending,
  recommendedAction,
  step,
  values,
}: {
  firstName: string;
  onChange: <K extends keyof WelcomeOnboardingValues>(key: K, value: WelcomeOnboardingValues[K]) => void;
  pending: boolean;
  recommendedAction: FirstAction | null;
  step: WelcomeStep;
  values: WelcomeOnboardingValues;
}) {
  if (step === "identity") {
    return (
      <WelcomePane
        icon={Building2}
        title="Est-ce que tout est juste ?"
        body="Nous avons repris les informations de votre inscription. Corrigez-les maintenant si nécessaire."
      >
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-medium">
            Votre prénom et votre nom
            <Input
              autoComplete="name"
              autoFocus
              disabled={pending}
              value={values.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nom de la compagnie
            <Input
              autoComplete="organization"
              disabled={pending}
              value={values.companyName}
              onChange={(event) => onChange("companyName", event.target.value)}
            />
          </label>
          <details className="rounded-lg bg-panel-strong/65 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Ajouter le logo maintenant (facultatif)
            </summary>
            <div className="pt-4">
              <PosterUploadField
                showId="logo-compagnie"
                value={values.logoUrl ?? ""}
                maxDimension={512}
                chooseLabel="Choisir le logo"
                emptyHint="Vous pourrez aussi l’ajouter plus tard dans les paramètres."
                onChange={(url) => onChange("logoUrl", url)}
              />
            </div>
          </details>
        </div>
      </WelcomePane>
    );
  }

  if (step === "first-action") {
    return (
      <WelcomePane
        icon={Sparkles}
        title={`Par quoi voulez-vous commencer, ${displayFirstName} ?`}
        body="Votre choix ouvre directement le bon outil. La checklist du cockpit gardera les autres étapes pour plus tard. La sélection indiquée comme recommandée reprend le besoin donné lors de votre inscription."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {firstActions.map((action) => (
            <ActionChoice
              key={action.value}
              active={values.firstAction === action.value}
              detail={action.detail}
              icon={action.icon}
              label={action.label}
              recommended={recommendedAction === action.value}
              onClick={() => onChange("firstAction", action.value)}
            />
          ))}
        </div>
      </WelcomePane>
    );
  }

  return (
    <WelcomePane
      icon={Sparkles}
      title={values.companyName ? `${values.companyName} a déjà sa place ici.` : "Votre compagnie a déjà sa place ici."}
      body="Nous allons créer un espace privé pour votre compagnie. Vous pourrez modifier ces informations à tout moment."
    >
      <div className="rounded-lg bg-panel-strong/65 p-4 text-sm leading-6 text-muted">
        <p className="font-medium text-foreground">En deux étapes :</p>
        <p className="mt-1">confirmez votre identité et choisissez ce que vous voulez avancer aujourd&apos;hui.</p>
      </div>
    </WelcomePane>
  );
}

function WelcomePane({ body, children, icon: Icon, title }: {
  body: string;
  children: React.ReactNode;
  icon: typeof Sparkles;
  title: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{body}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ActionChoice({ active, detail, icon: Icon, label, onClick, recommended }: {
  active: boolean;
  detail: string;
  icon: typeof Theater;
  label: string;
  onClick: () => void;
  recommended: boolean;
}) {
  return (
    <button
      aria-pressed={active}
      type="button"
      className={cn(
        "min-h-24 rounded-lg px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "bg-accent text-white shadow-sm shadow-accent/20"
          : "bg-panel-strong/65 text-foreground hover:bg-panel-strong",
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </span>
      <span className={cn("mt-1.5 block text-xs leading-5", active ? "text-white/85" : "text-muted")}>
        {detail}
      </span>
      {recommended ? (
        <span className={cn("mt-2 block text-xs font-semibold", active ? "text-white" : "text-accent")}>
          Recommandé d’après votre inscription
        </span>
      ) : null}
    </button>
  );
}
