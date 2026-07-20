"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { updateShowEmailProfile } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Show } from "@/types";

export function ShowEmailProfileForm({ show }: { show: Show }) {
  const [logline, setLogline] = useState(show.logline ?? "");
  const [themes, setThemes] = useState((show.themes ?? []).join(", "));
  const [targetAudience, setTargetAudience] = useState(show.targetAudience ?? "");
  const [emailPitch, setEmailPitch] = useState(show.emailPitch ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateShowEmailProfile(show.id, {
        logline,
        themes: themes.split(",").map((theme) => theme.trim()).filter(Boolean),
        targetAudience,
        emailPitch,
      });
      setMessage(result.message);
    });
  }

  return (
    <section aria-labelledby="show-presentation-title" className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Presentation diffusion</p>
        <h3 id="show-presentation-title" className="mt-2 text-2xl font-semibold">Donner de la matiere aux emails</h3>
        <p className="mt-3 text-sm leading-6 text-muted">
          Ces informations servent a preparer des messages plus personnels. Elles restent modifiables avant chaque envoi.
        </p>
        <div className="mt-6 border-l-2 border-accent/35 pl-4 text-sm leading-6 text-muted">
          Commencez par la logline et trois thematiques. Le reste peut etre complete plus tard.
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
          Public et contexte de programmation
          <span className="mt-1 block text-xs font-normal text-muted">Age conseille, type de lieu, scolaire, plein air ou autre contexte utile.</span>
          <Textarea className="mt-2 min-h-24" maxLength={400} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} />
        </label>

        <label className="block text-sm font-medium">
          Ce qui rend le projet singulier
          <span className="mt-1 block text-xs font-normal text-muted">Deux ou trois phrases sur la forme, l&apos;equipe ou la rencontre avec le public.</span>
          <Textarea className="mt-2 min-h-32" maxLength={1200} value={emailPitch} onChange={(event) => setEmailPitch(event.target.value)} />
        </label>

        {message ? <p className="text-sm text-muted" role="status">{message}</p> : null}

        <Button disabled={isPending} type="button" onClick={submit}>
          <Save aria-hidden="true" className="mr-2 h-4 w-4" />
          {isPending ? "Enregistrement..." : "Enregistrer la presentation"}
        </Button>
      </div>
    </section>
  );
}
