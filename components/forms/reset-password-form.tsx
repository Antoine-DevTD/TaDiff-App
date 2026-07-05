"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validation/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setMessage("Mode demo actif : ajoutez les variables Supabase pour activer la recuperation.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage(
        "Session expiree : repassez par le lien recu par email, ou redemandez un lien depuis Mot de passe oublie.",
      );
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Nouveau mot de passe" error={errors.password?.message}>
        <Input type="password" placeholder="********" {...register("password")} />
      </Field>
      <Field label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
        <Input type="password" placeholder="********" {...register("confirmPassword")} />
      </Field>
      {message ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p>
      ) : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        Enregistrer le nouveau mot de passe
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
