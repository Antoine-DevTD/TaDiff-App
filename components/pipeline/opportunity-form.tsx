"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createOpportunity, createOpportunityWithNewContact } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getDefaultProbability, pipelineStages } from "@/lib/pipeline";
import {
  opportunitySchema,
  type OpportunityFormInput,
  type OpportunityFormValues,
} from "@/lib/validation/pipeline";
import type { Contact, Show } from "@/types";

export function OpportunityForm({
  contacts,
  onSuccess,
  shows,
}: {
  contacts: Contact[];
  onSuccess?: () => void;
  shows: Show[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [contactMode, setContactMode] = useState<"existing" | "new">("existing");
  const [newContact, setNewContact] = useState({
    city: "",
    email: "",
    name: "",
    organization: "",
    role: "",
    status: "Prospect" as const,
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityFormInput, unknown, OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      contactId: "",
      showId: "",
      stage: "A qualifier",
      value: 0,
      probability: 15,
      performanceDate: "",
      nextAction: "",
      nextFollowUpAt: "",
      lostReason: "",
    },
  });

  function onSubmit(values: OpportunityFormValues) {
    startTransition(async () => {
      const result =
        contactMode === "new"
          ? await createOpportunityWithNewContact(values, newContact)
          : await createOpportunity(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        reset();
        router.refresh();
        onSuccess?.();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Date possible" error={errors.title?.message}>
        <Input placeholder="Serie scolaire automne" {...register("title")} />
      </Field>

      <div className="rounded-md border border-border bg-panel-strong/60 p-3">
        <div className="grid grid-cols-2 rounded-md border border-border bg-panel p-1 text-xs">
          <button
            className={
              contactMode === "existing"
                ? "rounded bg-accent px-3 py-2 font-medium text-white"
                : "rounded px-3 py-2 text-muted hover:bg-panel-strong hover:text-foreground"
            }
            type="button"
            onClick={() => setContactMode("existing")}
          >
            Contact existant
          </button>
          <button
            className={
              contactMode === "new"
                ? "rounded bg-accent px-3 py-2 font-medium text-white"
                : "rounded px-3 py-2 text-muted hover:bg-panel-strong hover:text-foreground"
            }
            type="button"
            onClick={() => {
              setContactMode("new");
              setValue("contactId", "");
            }}
          >
            Nouveau contact
          </button>
        </div>

        {contactMode === "existing" ? (
          <div className="mt-3">
            <Field label="Contact" error={errors.contactId?.message}>
              <Select {...register("contactId")}>
                <option value="">Aucun contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} - {contact.organization}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Nom du contact">
              <Input
                required
                placeholder="Marie Dupont"
                value={newContact.name}
                onChange={(event) =>
                  setNewContact((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Structure">
              <Input
                required
                placeholder="Scene nationale, mairie..."
                value={newContact.organization}
                onChange={(event) =>
                  setNewContact((current) => ({ ...current, organization: event.target.value }))
                }
              />
            </Field>
            <Field label="Role">
              <Input
                placeholder="Programmation, diffusion..."
                value={newContact.role}
                onChange={(event) =>
                  setNewContact((current) => ({ ...current, role: event.target.value }))
                }
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                placeholder="contact@structure.fr"
                value={newContact.email}
                onChange={(event) =>
                  setNewContact((current) => ({ ...current, email: event.target.value }))
                }
              />
            </Field>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Spectacle" error={errors.showId?.message}>
          <Select {...register("showId")}>
            <option value="">Aucun spectacle</option>
            {shows.map((show) => (
              <option key={show.id} value={show.id}>
                {show.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Etape" error={errors.stage?.message}>
          <Select
            {...register("stage")}
            onChange={(event) => {
              const stage = event.target.value as OpportunityFormValues["stage"];
              setValue("stage", stage);
              setValue("probability", getDefaultProbability(stage));
            }}
          >
            {pipelineStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Montant" error={errors.value?.message}>
          <Input type="number" min="0" step="100" {...register("value")} />
        </Field>
        <Field label="Probabilite" error={errors.probability?.message}>
          <Input type="number" min="0" max="100" step="5" {...register("probability")} />
        </Field>
        <Field label="Date de jeu" error={errors.performanceDate?.message}>
          <Input type="date" {...register("performanceDate")} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <Field label="Prochaine action" error={errors.nextAction?.message}>
          <Textarea
            className="min-h-20"
            placeholder="Appeler, envoyer le dossier, relancer..."
            {...register("nextAction")}
          />
        </Field>
        <Field label="Relance" error={errors.nextFollowUpAt?.message}>
          <Input type="date" {...register("nextFollowUpAt")} />
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
        Creer la date
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
