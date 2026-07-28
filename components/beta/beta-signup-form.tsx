"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { registerBetaSignup } from "@/app/(public)/beta/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  betaDisciplines,
  betaSignupSchema,
  type BetaSignupFormInput,
  type BetaSignupFormValues,
} from "@/lib/validation/beta";
import type { BetaSignupStatus } from "@/types";
import { trackPublicEvent } from "@/lib/public-analytics";

const defaultValues: BetaSignupFormInput = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  city: "",
  discipline: "Theatre",
  mainNeed: "",
};

type SignupState = {
  message: string;
  ok: boolean;
  position?: number;
  status?: BetaSignupStatus;
};

export function BetaSignupForm() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<SignupState | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BetaSignupFormInput, unknown, BetaSignupFormValues>({
    resolver: zodResolver(betaSignupSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!state?.ok) return;
    const timeout = window.setTimeout(() => setState(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  function onSubmit(values: BetaSignupFormValues) {
    startTransition(async () => {
      const result = await registerBetaSignup(values);
      setState(result);

      if (result.ok) {
        trackPublicEvent({ eventType: "beta_signup", eventName: result.status });
        reset(defaultValues);
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Compagnie" error={errors.companyName?.message}>
          <Input placeholder="Compagnie du plateau" {...register("companyName")} />
        </Field>
        <Field label="Contact" error={errors.contactName?.message}>
          <Input placeholder="Prenom Nom" {...register("contactName")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" error={errors.email?.message}>
          <Input placeholder="vous@compagnie.fr" type="email" {...register("email")} />
        </Field>
        <Field label="Téléphone" error={errors.phone?.message}>
          <Input placeholder="Optionnel" type="tel" {...register("phone")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ville" error={errors.city?.message}>
          <Input placeholder="Avignon" {...register("city")} />
        </Field>
        <Field label="Discipline" error={errors.discipline?.message}>
          <Select {...register("discipline")}>
            {betaDisciplines.map((discipline) => (
              <option key={discipline} value={discipline}>{discipline}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Besoin principal (optionnel)" error={errors.mainNeed?.message}>
        <Textarea
          placeholder="Exemple : ne plus rater les subventions, mieux suivre la trésorerie, relancer les programmateurs…"
          {...register("mainNeed")}
        />
      </Field>

      {state ? (
        <div
          aria-live={state.ok ? "polite" : "assertive"}
          className="animate-in fade-in slide-in-from-bottom-3 fixed inset-x-4 bottom-6 z-[110] mx-auto flex max-w-md items-start gap-3 rounded-xl border border-border bg-panel p-4 text-sm text-foreground shadow-xl shadow-ink/20 duration-300 sm:inset-x-auto sm:right-6 sm:mx-0"
          role={state.ok ? "status" : "alert"}
        >
          <span className={state.ok ? "rounded-full bg-success/10 p-2 text-success" : "rounded-full bg-danger/10 p-2 text-danger"}>
            {state.ok ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <CircleAlert className="h-5 w-5" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {state.ok && state.status === "reserved"
                ? "Votre place est confirmée !"
                : state.ok
                  ? "Votre inscription est bien enregistrée"
                  : "L'inscription n'a pas abouti"}
            </p>
            <p className="mt-1 text-muted">{state.message}</p>
            {state.ok && state.position ? (
              <p className="mt-2 font-medium text-foreground">
                Position {state.position} ·{" "}
                {state.status === "reserved" ? "place bêta réservée" : "liste d'attente"}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Fermer la confirmation"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            type="button"
            onClick={() => setState(null)}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <Button className="w-full" type="submit" disabled={isSubmitting || isPending}>
        Réserver ma place bêta
      </Button>
      <p className="text-xs leading-5 text-muted">
        TaDiff utilise ces informations pour gérer votre demande et vous contacter au sujet
        de la bêta. Vous pouvez exercer vos droits à tout moment. Consultez notre{" "}
        <Link className="text-accent underline" href="/confidentialite">
          politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </label>
  );
}
