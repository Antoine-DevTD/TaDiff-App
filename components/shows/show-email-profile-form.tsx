"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateShowEmailProfile } from "@/app/(dashboard)/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShowWritingAssistant, type ShowWritingObjective } from "@/components/shows/show-writing-assistant";
import type { Show, ShowDocument } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ShowEmailProfileForm({ documents, show }: { documents: ShowDocument[]; show: Show }) {
  const [logline, setLogline] = useState(show.logline ?? "");
  const [synopsisText, setSynopsisText] = useState(show.synopsisText ?? "");
  const [intentionNoteText, setIntentionNoteText] = useState(show.intentionNoteText ?? "");
  const [themes, setThemes] = useState((show.themes ?? []).join(", "));
  const [targetAudience, setTargetAudience] = useState(show.targetAudience ?? "");
  const [emailPitch, setEmailPitch] = useState(show.emailPitch ?? "");
  const values = useMemo(() => ({
    logline,
    synopsisText,
    intentionNoteText,
    themes: themes.split(",").map((theme) => theme.trim()).filter(Boolean),
    targetAudience,
    emailPitch,
  }), [emailPitch, intentionNoteText, logline, synopsisText, targetAudience, themes]);
  const serializedValues = JSON.stringify(values);
  const savedValuesRef = useRef(serializedValues);
  const requestSequenceRef = useRef(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyWilliamDraft(objective: ShowWritingObjective, value: string) {
    if (objective === "logline") setLogline(value.slice(0, 280));
    if (objective === "synopsis") setSynopsisText(value.slice(0, 4000));
    if (objective === "intention") setIntentionNoteText(value.slice(0, 6000));
    if (objective === "email_pitch") setEmailPitch(value.slice(0, 1200));
  }

  useEffect(() => {
    if (serializedValues === savedValuesRef.current) return;

    const requestId = ++requestSequenceRef.current;
    setSaveState("saving");
    setMessage(null);

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const result = await updateShowEmailProfile(show.id, values);

        if (requestId !== requestSequenceRef.current) return;

        if (result.ok) {
          savedValuesRef.current = serializedValues;
          setSaveState("saved");
          setMessage("Enregistré");
          return;
        }

        setSaveState("error");
        setMessage(result.message);
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [serializedValues, show.id, values]);

  return (
    <section aria-labelledby="show-presentation-title" className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Présentation diffusion</p>
        <h3 id="show-presentation-title" className="mt-2 text-2xl font-semibold">Donner de la matière aux emails</h3>
        <p className="mt-3 text-sm leading-6 text-muted">
          Ces informations servent a préparer des messages plus personnels. Elles restent modifiables avant chaque envoi.
        </p>
        <div className="mt-6 border-l-2 border-accent/35 pl-4 text-sm leading-6 text-muted">
          Commencez par la logline et trois thématiques. Le reste peut être complété plus tard.
        </div>
      </div>

      <div className="space-y-5 border-t border-border pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
        <label className="block text-sm font-medium">
          Logline
          <span className="mt-1 block text-xs font-normal text-muted">Une phrase qui donne envie de comprendre le spectacle.</span>
          <Textarea
            aria-describedby="logline-count"
            className="mt-2 min-h-24"
            maxLength={280}
            placeholder="En une phrase, que vit-on ou que decouvre-t-on dans ce spectacle ?"
            value={logline}
            onChange={(event) => setLogline(event.target.value)}
          />
          <span id="logline-count" className="mt-1 block text-right text-xs text-muted">{logline.length}/280</span>
        </label>

        <label className="block text-sm font-medium">
          Thematiques
          <span className="mt-1 block text-xs font-normal text-muted">Separez-les par des virgules, par exemple : transmission, territoire, jeunesse.</span>
          <Input className="mt-2" value={themes} onChange={(event) => setThemes(event.target.value)} />
        </label>

        <label className="block text-sm font-medium">
          Synopsis
          <span className="mt-1 block text-xs font-normal text-muted">Le parcours du spectacle, dans une version claire et partageable.</span>
          <Textarea className="mt-2 min-h-36" maxLength={4000} value={synopsisText} onChange={(event) => setSynopsisText(event.target.value)} />
        </label>

        <label className="block text-sm font-medium">
          Note d&apos;intention
          <span className="mt-1 block text-xs font-normal text-muted">Pourquoi ce projet existe et pourquoi il doit rencontrer le public aujourd&apos;hui.</span>
          <Textarea className="mt-2 min-h-40" maxLength={6000} value={intentionNoteText} onChange={(event) => setIntentionNoteText(event.target.value)} />
        </label>

        <label className="block text-sm font-medium">
          Public et contexte de programmation
          <span className="mt-1 block text-xs font-normal text-muted">Age conseille, type de lieu, scolaire, plein air ou autre contexte utile.</span>
          <Textarea className="mt-2 min-h-24" maxLength={400} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} />
        </label>

        <label className="block text-sm font-medium">
          Ce qui rend le projet singulier
          <span className="mt-1 block text-xs font-normal text-muted">Deux ou trois phrases sur la forme, l&apos;équipe ou la rencontre avec le public.</span>
          <Textarea className="mt-2 min-h-32" maxLength={1200} value={emailPitch} onChange={(event) => setEmailPitch(event.target.value)} />
        </label>

        <p
          aria-live="polite"
          className={saveState === "error" ? "text-sm text-danger" : "text-sm text-muted"}
          role="status"
        >
          {isPending || saveState === "saving" ? "Enregistrement..." : message}
        </p>

        <ShowWritingAssistant documents={documents} show={show} onApply={applyWilliamDraft} />
      </div>
    </section>
  );
}
