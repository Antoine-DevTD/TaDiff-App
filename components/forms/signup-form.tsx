"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ensureClientWorkspace } from "@/lib/supabase/client-workspace";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signupSchema, type SignupFormValues } from "@/lib/validation/auth";

export function SignupForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: "",
      email: "",
      password: "",
      profile: "company",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setMessage("Mode demo actif : ajoutez les variables Supabase pour creer un compte.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          company_name: values.companyName,
          profile: values.profile,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      const workspace = await ensureClientWorkspace(values.companyName);

      if (!workspace.ok) {
        setMessage(workspace.message);
        return;
      }

      await fetch("/api/audit/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventType: "signup",
          path: "/dashboard",
        }),
      }).catch(() => null);

      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage("Compte cree. Verifiez votre email avant de vous connecter.");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Nom de la structure" error={errors.companyName?.message}>
        <Input placeholder="Compagnie Horizon" {...register("companyName")} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="vous@compagnie.fr" {...register("email")} />
      </Field>
      <Field label="Mot de passe" error={errors.password?.message}>
        <Input type="password" placeholder="8 caracteres minimum" {...register("password")} />
      </Field>
      <Field label="Profil" error={errors.profile?.message}>
        <Select {...register("profile")}>
          <option value="company">Compagnie</option>
          <option value="producer">Bureau de production</option>
          <option value="artist">Artiste independant</option>
        </Select>
      </Field>
      {message ? (
        <p className="rounded-md bg-panel-strong px-3 py-2 text-sm text-muted">{message}</p>
      ) : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        Creer espace demo
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
