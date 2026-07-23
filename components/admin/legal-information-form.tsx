"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { adminSaveLegalInformation } from "@/app/(dashboard)/admin/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LegalInformation } from "@/lib/legal";

export function LegalInformationForm({ initialValue }: { initialValue: LegalInformation }) {
  const [value, setValue] = useState(initialValue);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(key: keyof LegalInformation, nextValue: string) {
    setValue((current) => ({ ...current, [key]: nextValue }));
  }

  function save() {
    startTransition(async () => {
      const result = await adminSaveLegalInformation(value);
      setMessage(result.message);
    });
  }

  return (
    <Card className="space-y-6 p-5">
      <div>
        <p className="text-lg font-semibold">Identite publiee</p>
        <p className="mt-1 text-sm text-muted">
          Ces valeurs alimentent immediatement les mentions légales, CGU, CGV et pages RGPD.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom du service"><Input value={value.serviceName} onChange={(event) => update("serviceName", event.target.value)} /></Field>
        <Field label="Exploitant"><Input value={value.operatorName} onChange={(event) => update("operatorName", event.target.value)} /></Field>
        <Field label="Forme juridique"><Input value={value.operatorLegalForm} onChange={(event) => update("operatorLegalForm", event.target.value)} /></Field>
        <Field label="SIREN, RNA ou RCS"><Input value={value.operatorRegistration} onChange={(event) => update("operatorRegistration", event.target.value)} /></Field>
        <Field label="TVA"><Input value={value.operatorVat} onChange={(event) => update("operatorVat", event.target.value)} /></Field>
        <Field label="Directeur de publication"><Input value={value.publicationDirector} onChange={(event) => update("publicationDirector", event.target.value)} /></Field>
        <Field label="Téléphone professionnel"><Input value={value.professionalPhone} onChange={(event) => update("professionalPhone", event.target.value)} /></Field>
        <Field label="Version des textes"><Input value={value.legalVersion} onChange={(event) => update("legalVersion", event.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Adresse du siege"><Textarea className="min-h-20" value={value.operatorAddress} onChange={(event) => update("operatorAddress", event.target.value)} /></Field></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Email juridique"><Input type="email" value={value.legalEmail} onChange={(event) => update("legalEmail", event.target.value)} /></Field>
        <Field label="Email vie privee"><Input type="email" value={value.privacyEmail} onChange={(event) => update("privacyEmail", event.target.value)} /></Field>
        <Field label="Email support"><Input type="email" value={value.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} /></Field>
        <Field label="Email facturation"><Input type="email" value={value.billingEmail} onChange={(event) => update("billingEmail", event.target.value)} /></Field>
      </div>

      <Field label="Prix bêta affiche"><Input value={value.betaPrice} onChange={(event) => update("betaPrice", event.target.value)} /></Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted" role="status">{message}</p>
        <Button disabled={isPending} type="button" onClick={save}>
          <Save className="mr-2 h-4 w-4" />{isPending ? "Publication..." : "Publier les modifications"}
        </Button>
      </div>
    </Card>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="block text-sm font-medium">{label}<span className="mt-2 block">{children}</span></label>;
}
