"use client";

import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { submitFeedback } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { tourStateChangeEvent, tourStorageKey } from "@/components/tour/guided-tour";
import { feedbackKinds, type FeedbackFormValues } from "@/lib/validation/feedback";

const kindLabels: Record<(typeof feedbackKinds)[number], { label: string; hint: string }> = {
  bug: { label: "Un bug", hint: "Quelque chose ne fonctionne pas" },
  idee: { label: "Une idee", hint: "Une amelioration a suggerer" },
  avis: { label: "Un avis", hint: "Un ressenti a partager" },
};

export function FeedbackWidget({ triggerClassName }: { triggerClassName?: string }) {
  const pathname = usePathname();
  const tourActive = useSyncExternalStore(subscribeToTourState, readTourActive, () => false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackFormValues["kind"]>("bug");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function reset() {
    setKind("bug");
    setMessage("");
    setResult(null);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (message.trim().length < 3) {
      setResult({ ok: false, text: "Dites-nous en un peu plus." });
      return;
    }

    startTransition(async () => {
      const response = await submitFeedback({ kind, message: message.trim(), page: pathname });
      setResult({ ok: response.ok, text: response.message });

      if (response.ok) {
        setMessage("");
      }
    });
  }

  if (tourActive) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={
          triggerClassName ??
          "inline-flex items-center rounded-md border border-border bg-panel px-3 py-2 text-sm font-medium shadow-sm shadow-ink/5 transition hover:bg-panel-strong"
        }
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        Donner un retour
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Beta TaDiff"
        title="Donner un retour"
        description="Bug, idee ou avis : votre retour arrive directement a l'equipe TaDiff."
        className="max-w-xl"
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2 sm:grid-cols-3">
            {feedbackKinds.map((value) => {
              const meta = kindLabels[value];
              const active = kind === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={[
                    "rounded-lg border p-3 text-left transition",
                    active
                      ? "border-accent bg-accent/10"
                      : "border-border bg-panel-strong/35 hover:border-accent/40",
                  ].join(" ")}
                >
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="mt-1 text-xs text-muted">{meta.hint}</p>
                </button>
              );
            })}
          </div>

          <label className="block text-sm font-medium">
            Votre message
            <div className="mt-2">
              <Textarea
                rows={5}
                placeholder="Decrivez le bug, l'idee ou l'avis. Plus c'est precis, mieux on peut aider."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
          </label>

          {result ? (
            <p
              className={
                result.ok
                  ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
                  : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              }
            >
              {result.text}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Envoye depuis <span className="font-medium">{pathname}</span>
            </p>
            {result?.ok ? (
              <Button type="button" onClick={() => setOpen(false)}>
                Fermer
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? "Envoi..." : "Envoyer le retour"}
              </Button>
            )}
          </div>
        </form>
      </Dialog>
    </>
  );
}

function subscribeToTourState(onStoreChange: () => void) {
  window.addEventListener(tourStateChangeEvent, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(tourStateChangeEvent, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readTourActive() {
  try {
    const raw = window.localStorage.getItem(tourStorageKey);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as { active?: unknown };
    return parsed.active === true;
  } catch {
    return false;
  }
}
