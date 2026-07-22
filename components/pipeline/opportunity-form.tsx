"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Handshake, KeyRound, Percent, Shapes } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { createOpportunity, createOpportunityWithNewContact } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  calculateCompanyRevenue,
  exploitationModes,
  getDefaultProbability,
  getWilliamOpportunityAction,
} from "@/lib/pipeline";
import {
  opportunitySchema,
  type OpportunityFormInput,
  type OpportunityFormValues,
} from "@/lib/validation/pipeline";
import { cn } from "@/lib/utils";
import type { Contact, ExploitationMode, PipelineStage, Show } from "@/types";

const modeIcons = {
  cession: Handshake,
  corealisation: Percent,
  location: KeyRound,
  other: Shapes,
} satisfies Record<ExploitationMode, typeof Handshake>;

const discussionStages: Array<{ id: PipelineStage; label: string }> = [
  { id: "A qualifier", label: "Premiers échanges" },
  { id: "Contacte", label: "Contact pris" },
  { id: "Negociation", label: "Conditions en discussion" },
  { id: "Confirme", label: "Accord conclu" },
  { id: "Perdu", label: "Sans suite" },
];

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
  const [hasMinimumGuarantee, setHasMinimumGuarantee] = useState(false);
  const [newContact, setNewContact] = useState({
    contactType: "person" as const,
    city: "",
    email: "",
    name: "",
    organization: "",
    role: "",
    status: "Prospect" as const,
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityFormInput, unknown, OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "Nouvelle diffusion",
      contactId: "",
      showId: "",
      stage: "A qualifier",
      value: 0,
      probability: 15,
      exploitationMode: "cession",
      cessionFee: 0,
      estimatedBoxOffice: 0,
      companySharePercent: 50,
      minimumGuarantee: 0,
      venueRental: 0,
      performanceDate: "",
      nextAction: "",
      nextFollowUpAt: "",
      lostReason: "",
    },
  });
  const exploitationMode = useWatch({ control, name: "exploitationMode" }) ?? "cession";
  const stage = useWatch({ control, name: "stage" }) ?? "A qualifier";
  const selectedShowId = useWatch({ control, name: "showId" });
  const cessionFee = Number(useWatch({ control, name: "cessionFee" })) || 0;
  const estimatedBoxOffice = Number(useWatch({ control, name: "estimatedBoxOffice" })) || 0;
  const companySharePercent = Number(useWatch({ control, name: "companySharePercent" })) || 0;
  const minimumGuarantee = Number(useWatch({ control, name: "minimumGuarantee" })) || 0;
  const venueRental = Number(useWatch({ control, name: "venueRental" })) || 0;
  const estimatedRevenue = calculateCompanyRevenue({
    exploitationMode,
    cessionFee,
    estimatedBoxOffice,
    companySharePercent,
    minimumGuarantee,
    venueRental,
  });
  const williamAction = getWilliamOpportunityAction(stage, exploitationMode);

  function onSubmit(values: OpportunityFormValues) {
    const selectedShow = shows.find((show) => show.id === values.showId);
    const selectedContact = contacts.find((contact) => contact.id === values.contactId);

    if (!selectedShow) {
      setMessage({ ok: false, text: "Choisissez le spectacle concerné." });
      return;
    }

    if (contactMode === "existing" && !selectedContact) {
      setMessage({ ok: false, text: "Choisissez un contact." });
      return;
    }

    if (contactMode === "new" && (!newContact.name.trim() || !newContact.organization.trim())) {
      setMessage({ ok: false, text: "Renseignez le nom et la structure du nouveau contact." });
      return;
    }

    const organization = selectedContact?.organization || newContact.organization;
    const payload = {
      ...values,
      title: `${selectedShow.title} - ${organization}`,
      value: estimatedRevenue,
      probability: getDefaultProbability(values.stage),
      nextAction: williamAction.action,
      nextFollowUpAt: williamAction.dueDate,
    };

    startTransition(async () => {
      const result = contactMode === "new"
        ? await createOpportunityWithNewContact(payload, newContact)
        : await createOpportunity(payload);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        reset();
        router.refresh();
        onSuccess?.();
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("title")} />
      <input type="hidden" {...register("value")} />
      <input type="hidden" {...register("probability")} />
      <input type="hidden" {...register("nextAction")} />
      <input type="hidden" {...register("nextFollowUpAt")} />

      <section aria-labelledby="diffusion-project-title" className="space-y-4">
        <div>
          <h4 id="diffusion-project-title" className="font-semibold">Le projet</h4>
          <p className="mt-1 text-sm text-muted">Reliez simplement un spectacle au bon interlocuteur.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Spectacle" error={errors.showId?.message}>
            <Select {...register("showId")}>
              <option value="">Choisir un spectacle</option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>{show.title}</option>
              ))}
            </Select>
          </Field>
          <Field label="Où en êtes-vous ?" error={errors.stage?.message}>
            <Select
              {...register("stage")}
              onChange={(event) => {
                const nextStage = event.target.value as PipelineStage;
                setValue("stage", nextStage);
                setValue("probability", getDefaultProbability(nextStage));
              }}
            >
              {discussionStages.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-md border border-border bg-panel-strong/45 p-3">
          <div className="grid grid-cols-2 rounded-md border border-border bg-panel p-1 text-xs">
            <ModeButton active={contactMode === "existing"} onClick={() => setContactMode("existing")}>Choisir un contact</ModeButton>
            <ModeButton
              active={contactMode === "new"}
              onClick={() => {
                setContactMode("new");
                setValue("contactId", "");
              }}
            >
              Créer un contact
            </ModeButton>
          </div>

          {contactMode === "existing" ? (
            <div className="mt-3">
              <Field label="Contact" error={errors.contactId?.message}>
                <Select {...register("contactId")}>
                  <option value="">Choisir un contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>{contact.name} - {contact.organization}</option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Nom du contact">
                <Input required value={newContact.name} onChange={(event) => setNewContact((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label="Structure">
                <Input required value={newContact.organization} onChange={(event) => setNewContact((current) => ({ ...current, organization: event.target.value }))} />
              </Field>
              <Field label="Rôle">
                <Input value={newContact.role} onChange={(event) => setNewContact((current) => ({ ...current, role: event.target.value }))} />
              </Field>
              <Field label="Email">
                <Input type="email" autoComplete="email" spellCheck={false} value={newContact.email} onChange={(event) => setNewContact((current) => ({ ...current, email: event.target.value }))} />
              </Field>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="exploitation-title" className="space-y-4 border-t border-border pt-6">
        <div>
          <h4 id="exploitation-title" className="font-semibold">Quel accord envisagez-vous ?</h4>
          <p className="mt-1 text-sm text-muted">TaDiff adapte les chiffres demandés au montage choisi.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {exploitationModes.map((mode) => {
            const Icon = modeIcons[mode.id];
            const active = exploitationMode === mode.id;
            return (
              <label key={mode.id} className={cn(
                "cursor-pointer rounded-md border p-3 transition",
                active ? "border-accent bg-accent/5" : "border-border bg-panel hover:border-accent/35",
              )}>
                <input className="sr-only" type="radio" value={mode.id} {...register("exploitationMode")} />
                <Icon aria-hidden="true" className={cn("pointer-events-none h-5 w-5", active ? "text-accent" : "text-muted")} />
                <span className="mt-3 block text-sm font-semibold">{mode.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{mode.description}</span>
              </label>
            );
          })}
        </div>

        <div className="rounded-md border border-border bg-panel-strong/45 p-4">
          {exploitationMode === "cession" ? (
            <div className="max-w-sm">
              <Field label="Prix de cession envisagé" error={errors.cessionFee?.message} suffix="EUR">
                <Input type="number" min="0" step="0.01" inputMode="decimal" {...register("cessionFee")} />
              </Field>
            </div>
          ) : null}

          {exploitationMode === "corealisation" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Billetterie totale estimée" error={errors.estimatedBoxOffice?.message} suffix="EUR">
                <Input type="number" min="0" step="0.01" inputMode="decimal" {...register("estimatedBoxOffice")} />
              </Field>
              <Field label="Part revenant à la compagnie" error={errors.companySharePercent?.message} suffix="%">
                <Input type="number" min="0" max="100" step="5" inputMode="numeric" {...register("companySharePercent")} />
              </Field>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium sm:col-span-2">
                <input
                  className="h-4 w-4 accent-[var(--accent)]"
                  type="checkbox"
                  checked={hasMinimumGuarantee}
                  onChange={(event) => {
                    setHasMinimumGuarantee(event.target.checked);
                    if (!event.target.checked) setValue("minimumGuarantee", 0);
                  }}
                />
                Un minimum garanti est prévu
              </label>
              {hasMinimumGuarantee ? (
                <Field label="Montant du minimum garanti" error={errors.minimumGuarantee?.message} suffix="EUR">
                  <Input type="number" min="0" step="0.01" inputMode="decimal" {...register("minimumGuarantee")} />
                </Field>
              ) : null}
            </div>
          ) : null}

          {exploitationMode === "location" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Billetterie totale estimée" error={errors.estimatedBoxOffice?.message} suffix="EUR">
                <Input type="number" min="0" step="0.01" inputMode="decimal" {...register("estimatedBoxOffice")} />
              </Field>
              <Field label="Coût de location du lieu" error={errors.venueRental?.message} suffix="EUR">
                <Input type="number" min="0" step="0.01" inputMode="decimal" {...register("venueRental")} />
              </Field>
            </div>
          ) : null}

          {exploitationMode === "other" ? (
            <div className="max-w-sm">
              <Field label="Recette estimée pour la compagnie" error={errors.cessionFee?.message} suffix="EUR">
                <Input type="number" min="0" step="0.01" inputMode="decimal" {...register("cessionFee")} />
              </Field>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Recette estimée pour la compagnie</p>
              <p className="mt-1 text-2xl font-semibold">{estimatedRevenue.toLocaleString("fr-FR")} EUR</p>
            </div>
            <Field label="Date de représentation (si connue)" error={errors.performanceDate?.message}>
              <Input type="date" {...register("performanceDate")} />
            </Field>
          </div>
        </div>
      </section>

      {williamAction.action ? (
        <section aria-label="Action proposée par William" className="flex gap-3 rounded-md border border-accent/25 bg-accent/5 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">T</span>
          <div>
            <p className="text-sm font-semibold">William prépare la suite</p>
            <p className="mt-1 text-sm text-foreground">{williamAction.action}</p>
            <p className="mt-1 text-xs text-muted">Action ajoutée automatiquement pour le {new Date(`${williamAction.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}.</p>
          </div>
        </section>
      ) : null}

      {selectedShowId ? null : (
        <p className="text-xs text-muted">Commencez par choisir un spectacle : le reste du formulaire s&apos;adaptera.</p>
      )}

      {message ? (
        <p className={message.ok ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success" : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"}>
          {message.text}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || isPending}>
          {isPending ? "Création..." : "Ajouter cette diffusion"}
        </Button>
      </div>
    </form>
  );
}

function ModeButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button className={active ? "rounded bg-accent px-3 py-2 font-medium text-white" : "rounded px-3 py-2 text-muted hover:bg-panel-strong hover:text-foreground"} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function Field({
  children,
  error,
  label,
  suffix,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  suffix?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center justify-between gap-2">
        {label}
        {suffix ? <span className="text-xs font-normal text-muted">{suffix}</span> : null}
      </span>
      <span className="mt-2 block">{children}</span>
      {error ? <span className="mt-2 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}
