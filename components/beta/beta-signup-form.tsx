"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { registerBetaSignup } from "@/app/(public)/beta/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  betaSignupSchema,
  type BetaSignupFormInput,
  type BetaSignupFormValues,
} from "@/lib/validation/beta";
import type { BetaSignupStatus } from "@/types";

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

  function onSubmit(values: BetaSignupFormValues) {
    startTransition(async () => {
      const result = await registerBetaSignup(values);
      setState(result);

      if (result.ok) {
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
        <Field label="Telephone" error={errors.phone?.message}>
          <Input placeholder="Optionnel" type="tel" {...register("phone")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ville" error={errors.city?.message}>
          <Input placeholder="Avignon" {...register("city")} />
        </Field>
        <Field label="Discipline" error={errors.discipline?.message}>
          <Select {...register("discipline")}>
            <option value="Theatre">Theatre</option>
            <option value="Danse">Danse</option>
            <option value="Musique">Musique</option>
            <option value="Cirque">Cirque</option>
            <option value="Jeune public">Jeune public</option>
            <option value="Pluridisciplinaire">Pluridisciplinaire</option>
          </Select>
        </Field>
      </div>

      <Field label="Besoin principal" error={errors.mainNeed?.message}>
        <Textarea
          placeholder="Exemple : ne plus rater les subventions, mieux suivre la tresorerie, relancer les programmateurs..."
          {...register("mainNeed")}
        />
      </Field>

      {state ? (
        <div
          className={
            state.ok
              ? "rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success"
              : "rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger"
          }
        >
          <p className="font-medium">{state.message}</p>
          {state.ok && state.position ? (
            <p className="mt-1">
              Position {state.position} -{" "}
              {state.status === "reserved" ? "place beta reservee" : "liste d'attente"}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button className="w-full" type="submit" disabled={isSubmitting || isPending}>
        Reserver ma place beta
      </Button>
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
