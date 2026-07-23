"use client";

import { Check, LoaderCircle, LockKeyhole, Mail, Theater, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoWebinarEmail } from "@/lib/demo-webinar";

const preparationSteps = [
  "Création de votre espace",
  "Préparation du cockpit",
  "William arrive",
] as const;

export function DemoSignupForm() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [preparationStep, setPreparationStep] = useState(0);

  useEffect(() => {
    if (!isCreating) return;

    const secondStep = window.setTimeout(() => setPreparationStep(1), 650);
    const thirdStep = window.setTimeout(() => setPreparationStep(2), 1_300);
    const redirectToWelcome = window.setTimeout(() => {
      router.push("/welcome?replay=1&fromSignup=1");
    }, 2_050);

    return () => {
      window.clearTimeout(secondStep);
      window.clearTimeout(thirdStep);
      window.clearTimeout(redirectToWelcome);
    };
  }, [isCreating, router]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreparationStep(0);
    setIsCreating(true);
  }

  if (isCreating) {
    return (
      <section
        className="w-full max-w-lg rounded-lg border border-border bg-panel p-7 shadow-xl shadow-ink/10"
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-accent">Votre espace prend forme</p>
            <h1 className="mt-1 text-2xl font-semibold">Bienvenue dans TaDiff</h1>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {preparationSteps.map((label, index) => {
            const isDone = index < preparationStep;
            const isActive = index === preparationStep;

            return (
              <div
                key={label}
                className="flex min-h-12 items-center gap-3 border-b border-border/70 py-3 last:border-b-0"
              >
                <span
                  className={
                    isDone
                      ? "grid h-7 w-7 place-items-center rounded-full bg-success/15 text-success"
                      : isActive
                        ? "grid h-7 w-7 place-items-center rounded-full bg-accent/10 text-accent"
                        : "grid h-7 w-7 place-items-center rounded-full bg-panel-strong text-muted"
                  }
                >
                  {isDone ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : isActive ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={isActive || isDone ? "font-medium text-foreground" : "text-muted"}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-7 h-2 overflow-hidden rounded-full bg-panel-strong">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${((preparationStep + 1) / preparationSteps.length) * 100}%` }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-lg">
      <div className="mb-7">
        <p className="text-sm font-medium text-accent">Première connexion</p>
        <h1 className="mt-2 text-3xl font-semibold">Créons votre espace compagnie.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Quelques informations suffisent. William vous guidera ensuite dans le cockpit.
        </p>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <Field icon={UserRound} label="Prénom et nom">
          <Input required defaultValue="Camille Martin" autoComplete="name" />
        </Field>
        <Field icon={Theater} label="Nom de la compagnie">
          <Input required defaultValue="Compagnie de l'Estran" autoComplete="organization" />
        </Field>
        <Field icon={Mail} label="Adresse email">
          <Input required type="email" defaultValue={demoWebinarEmail} autoComplete="email" />
        </Field>
        <Field icon={LockKeyhole} label="Mot de passe">
          <Input
            required
            minLength={8}
            type="password"
            defaultValue="demonstration"
            autoComplete="new-password"
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-muted">
          <input
            required
            type="checkbox"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
          />
          <span>J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité.</span>
        </label>

        <Button type="submit" className="w-full">Créer mon espace</Button>
      </form>
    </section>
  );
}

function Field({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-muted" aria-hidden />
        {label}
      </span>
      {children}
    </label>
  );
}
