"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passwordResetRequestMessage } from "@/lib/password-reset-validation";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const lock = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    if (lock.current) return;
    lock.current = true;
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request", email: values.email }) });
      if (!response.ok) throw new Error("Unavailable");
      setMessage({ ok: true, text: passwordResetRequestMessage });
    } catch { setMessage({ ok: false, text: "Le lien n’a pas pu être envoyé. Votre email est conservé ; réessayez dans un instant." }); }
    finally { lock.current = false; }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => handleSubmit(onSubmit)(event)}>
      <Field label="Email du compte" error={errors.email?.message}>
        <Input type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className="!text-base sm:!text-sm" placeholder="vous@compagnie.fr" {...register("email")} />
      </Field>
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          }
        >
          {message.text}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Envoi du lien…" : "Envoyer le lien de réinitialisation"}
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
