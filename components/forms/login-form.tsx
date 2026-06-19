"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureClientWorkspace } from "@/lib/supabase/client-workspace";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setMessage("Mode demo actif : ajoutez les variables Supabase pour connecter auth.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setMessage(error.message);
      return;
    }

    const workspace = await ensureClientWorkspace();

    if (!workspace.ok) {
      setMessage(workspace.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="vous@compagnie.fr" {...register("email")} />
      </Field>
      <Field label="Mot de passe" error={errors.password?.message}>
        <Input type="password" placeholder="********" {...register("password")} />
      </Field>
      {message ? (
        <p className="rounded-md bg-panel-strong px-3 py-2 text-sm text-muted">{message}</p>
      ) : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        Se connecter
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
