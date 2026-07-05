"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createContact, updateContact } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import type { Contact } from "@/types";

const defaultValues: ContactFormValues = {
  name: "",
  organization: "",
  role: "",
  email: "",
  city: "",
  status: "Prospect",
};

export function ContactForm({ contact }: { contact?: Contact }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact
      ? {
          name: contact.name,
          organization: contact.organization,
          role: contact.role || "",
          email: contact.email || "",
          city: contact.city || "",
          status: contact.status,
        }
      : defaultValues,
  });

  function onSubmit(values: ContactFormValues) {
    startTransition(async () => {
      const result = contact
        ? await updateContact(contact.id, values)
        : await createContact(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        router.push(contact ? `/contacts/${contact.id}` : "/contacts");
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" error={errors.name?.message}>
          <Input placeholder="Mina Laurent" {...register("name")} />
        </Field>
        <Field label="Structure" error={errors.organization?.message}>
          <Input placeholder="Scene nationale" {...register("organization")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" error={errors.role?.message}>
          <Input placeholder="Programmatrice" {...register("role")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" placeholder="contact@scene.fr" {...register("email")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ville" error={errors.city?.message}>
          <Input placeholder="La Rochelle" {...register("city")} />
        </Field>
        <Field label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="Prospect">Prospect</option>
            <option value="En discussion">En discussion</option>
            <option value="Partenaire">Partenaire</option>
          </Select>
        </Field>
      </div>

      {message ? (
        <p
          className={
            message.ok
              ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          }
        >
          {message.text}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting || isPending}>
        {contact ? "Enregistrer les modifications" : "Creer le contact"}
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
