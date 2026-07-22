"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createContact, updateContact } from "@/app/(dashboard)/actions";
import { AddressAutocomplete } from "@/components/contacts/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import type { Contact } from "@/types";

const defaultValues: ContactFormValues = {
  contactType: "person",
  venueId: "",
  name: "",
  organization: "",
  role: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  postalCode: "",
  department: "",
  region: "",
  website: "",
  capacity: "",
  latitude: "",
  longitude: "",
  status: "Prospect",
  tags: [],
  directorName: "",
  directorEmail: "",
  directorPhone: "",
};

export function ContactForm({
  contact,
  onSuccess,
}: {
  contact?: Contact;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitMode, setSubmitMode] = useState<"close" | "another">("close");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact
      ? {
          name: contact.name,
          contactType: contact.contactType,
          venueId: contact.venueId,
          organization: contact.organization,
          role: contact.role || "",
          email: contact.email || "",
          phone: contact.phone || "",
          city: contact.city || "",
          address: contact.address || "",
          postalCode: contact.postalCode || "",
          department: contact.department || "",
          region: contact.region || "",
          website: contact.website || "",
          capacity: contact.capacity?.toString() ?? "",
          latitude: contact.latitude?.toString() ?? "",
          longitude: contact.longitude?.toString() ?? "",
          status: contact.status,
          tags: contact.tags ?? [],
          directorName: "",
          directorEmail: "",
          directorPhone: "",
        }
      : defaultValues,
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const tags = watch("tags") ?? [];
  const contactType = watch("contactType");
  const address = watch("address") ?? "";
  const latitude = watch("latitude") ?? "";
  const longitude = watch("longitude") ?? "";

  function onSubmit(values: ContactFormValues) {
    startTransition(async () => {
      const result = contact
        ? await updateContact(contact.id, values)
        : await createContact(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        if (!contact && submitMode === "another") {
          reset(defaultValues);
          router.refresh();
          return;
        }

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(contact ? `/contacts/${contact.id}` : "/contacts");
        }
        router.refresh();
      }
    });
  }

  function setTags(nextTags: string[]) {
    setValue("tags", nextTags, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 rounded-md border border-border bg-panel-strong p-1" aria-label="Type de fiche">
        <button
          className={`min-h-10 rounded px-3 text-sm font-medium transition ${contactType === "person" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}
          type="button"
          onClick={() => setValue("contactType", "person", { shouldDirty: true })}
        >
          Une personne
        </button>
        <button
          className={`min-h-10 rounded px-3 text-sm font-medium transition ${contactType === "venue" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}
          type="button"
          onClick={() => setValue("contactType", "venue", { shouldDirty: true })}
        >
          Un lieu
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={contactType === "venue" ? "Nom du lieu" : "Nom"} error={errors.name?.message}>
          <Input placeholder={contactType === "venue" ? "Théâtre municipal" : "Mina Laurent"} {...register("name")} />
        </Field>
        {contactType === "person" ? <Field label="Structure" error={errors.organization?.message}><Input placeholder="Scène nationale" {...register("organization")} /></Field> : null}
      </div>

      {contactType === "venue" ? (
        <section className="rounded-md border border-border bg-panel-strong/45 p-4">
          <h4 className="font-semibold">Adresse et carte</h4>
          <p className="mt-1 text-xs leading-5 text-muted">
            Recherchez l&apos;adresse puis choisissez une proposition. La carte sera positionnée automatiquement.
          </p>
          <div className="mt-4">
            <Field label="Adresse" error={errors.address?.message}>
              <AddressAutocomplete
                hasCoordinates={Boolean(latitude && longitude)}
                value={address}
                onChange={(nextAddress) => {
                  setValue("address", nextAddress, { shouldDirty: true, shouldValidate: true });
                  setValue("latitude", "", { shouldDirty: true });
                  setValue("longitude", "", { shouldDirty: true });
                }}
                onSelect={(suggestion) => {
                  setValue("address", suggestion.address, { shouldDirty: true, shouldValidate: true });
                  setValue("postalCode", suggestion.postalCode, { shouldDirty: true });
                  setValue("city", suggestion.city, { shouldDirty: true });
                  setValue("department", suggestion.department, { shouldDirty: true });
                  setValue("region", suggestion.region, { shouldDirty: true });
                  setValue("latitude", String(suggestion.latitude), { shouldDirty: true });
                  setValue("longitude", String(suggestion.longitude), { shouldDirty: true });
                }}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Code postal" error={errors.postalCode?.message}><Input placeholder="44000" {...register("postalCode")} /></Field>
            <Field label="Ville" error={errors.city?.message}><Input placeholder="Nantes" {...register("city")} /></Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Département" error={errors.department?.message}><Input placeholder="Loire-Atlantique" {...register("department")} /></Field>
            <Field label="Région" error={errors.region?.message}><Input placeholder="Pays de la Loire" {...register("region")} /></Field>
          </div>
          <input type="hidden" {...register("latitude")} />
          <input type="hidden" {...register("longitude")} />
          {latitude && longitude ? (
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-success">
              <MapPin className="h-4 w-4" aria-hidden />
              Adresse localisée sur la carte
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Site web" error={errors.website?.message}><Input type="url" placeholder="https://..." {...register("website")} /></Field>
            <Field label="Jauge" error={errors.capacity?.message}><Input min="0" type="number" placeholder="450" {...register("capacity")} /></Field>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {contactType === "person" ? <Field label="Rôle" error={errors.role?.message}><Input placeholder="Programmatrice" {...register("role")} /></Field> : null}
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" placeholder="contact@scene.fr" {...register("email")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Téléphone" error={errors.phone?.message}>
          <Input type="tel" placeholder="06 12 34 56 78" {...register("phone")} />
        </Field>
        {contactType === "person" ? <Field label="Ville" error={errors.city?.message}>
          <Input placeholder="La Rochelle" {...register("city")} />
        </Field> : null}
      </div>

      {contactType === "venue" && !contact ? (
        <section className="rounded-md border border-border bg-panel-strong/45 p-4">
          <h4 className="font-semibold">Direction du lieu <span className="font-normal text-muted">(facultatif)</span></h4>
          <p className="mt-1 text-xs leading-5 text-muted">Si vous la renseignez, cette personne sera aussi créée dans l&apos;onglet Personnes et reliée à ce lieu.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nom de la direction" error={errors.directorName?.message}><Input placeholder="Camille Martin" {...register("directorName")} /></Field>
            <Field label="Email" error={errors.directorEmail?.message}><Input type="email" placeholder="direction@theatre.fr" {...register("directorEmail")} /></Field>
          </div>
          <div className="mt-4 max-w-sm"><Field label="Téléphone" error={errors.directorPhone?.message}><Input type="tel" {...register("directorPhone")} /></Field></div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="Prospect">Prospect</option>
            <option value="En discussion">En discussion</option>
            <option value="Partenaire">Partenaire</option>
          </Select>
        </Field>
      </div>

      <Field label="Tags" error={errors.tags?.message}>
        <TagInput
          tags={tags}
          onChange={setTags}
          suggestions={["Theatre", "Festival", "Scene nationale", "Municipal", "Mecenat"]}
        />
      </Field>

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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          disabled={isSubmitting || isPending}
          onClick={() => setSubmitMode("close")}
        >
          {contact ? "Enregistrer les modifications" : contactType === "venue" ? "Créer le lieu" : "Créer le contact"}
        </Button>
        {!contact ? (
          <Button
            type="submit"
            variant="secondary"
            disabled={isSubmitting || isPending}
            onClick={() => setSubmitMode("another")}
          >
            Creer et ajouter un autre
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function TagInput({
  onChange,
  suggestions,
  tags,
}: {
  onChange: (tags: string[]) => void;
  suggestions: string[];
  tags: string[];
}) {
  const [draft, setDraft] = useState("");

  function addTag(value: string) {
    const normalized = value.trim();
    if (!normalized || tags.some((tag) => tag.toLowerCase() === normalized.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, normalized].slice(0, 12));
    setDraft("");
  }

  function removeTag(value: string) {
    onChange(tags.filter((tag) => tag !== value));
  }

  return (
    <div className="rounded-md border border-border bg-panel p-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex min-h-8 items-center gap-1 rounded-full bg-accent/10 px-3 text-xs font-medium text-accent"
          >
            {tag}
            <button
              type="button"
              className="rounded-full p-0.5 text-accent/75 transition hover:bg-accent/10 hover:text-accent"
              onClick={() => removeTag(tag)}
              aria-label={`Retirer le tag ${tag}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <div className="flex min-w-[180px] flex-1 items-center gap-2">
          <Input
            className="min-h-8 border-0 bg-transparent px-1 focus:ring-0"
            placeholder="Ajouter un tag..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(draft);
              }
            }}
          />
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-panel-strong hover:text-accent"
            onClick={() => addTag(draft)}
            aria-label="Ajouter le tag"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
        {suggestions
          .filter((suggestion) => !tags.includes(suggestion))
          .map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
              onClick={() => addTag(suggestion)}
            >
              + {suggestion}
            </button>
          ))}
      </div>
    </div>
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
