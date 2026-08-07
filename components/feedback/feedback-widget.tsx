"use client";

import { Check, CircleCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { submitFeedback } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { tourStateChangeEvent, tourStorageKey } from "@/components/tour/guided-tour";
import {
  dailyFeedbackAreas,
  getUsageDateLabel,
  type DailyFeedbackArea,
  type DailyFeedbackPrompt,
} from "@/lib/daily-feedback";
import { feedbackKinds, type FeedbackFormValues } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const kindLabels: Record<(typeof feedbackKinds)[number], { label: string; hint: string }> = {
  bug: { label: "Un bug", hint: "Quelque chose ne fonctionne pas" },
  idee: { label: "Une idée", hint: "Une amélioration à suggérer" },
  avis: { label: "Un avis", hint: "Un ressenti à partager" },
};

type FeedbackMode = "manual" | "daily";
type Result = { ok: boolean; text: string } | null;

export function FeedbackWidget({ triggerClassName }: { triggerClassName?: string }) {
  const pathname = usePathname();
  const tourActive = useSyncExternalStore(subscribeToTourState, readTourActive, () => false);
  const promptCheckedRef = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FeedbackMode>("manual");
  const [prompt, setPrompt] = useState<DailyFeedbackPrompt | null>(null);
  const [kind, setKind] = useState<FeedbackFormValues["kind"]>("bug");
  const [message, setMessage] = useState("");
  const [problemAreas, setProblemAreas] = useState<DailyFeedbackArea[]>([]);
  const [noProblem, setNoProblem] = useState(false);
  const [note, setNote] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>(null);

  useEffect(() => {
    if (tourActive || promptCheckedRef.current) return;
    promptCheckedRef.current = true;

    const controller = new AbortController();
    let openTimer: number | undefined;

    function openWhenPageIsReady(nextPrompt: DailyFeedbackPrompt, attempt = 0) {
      openTimer = window.setTimeout(
        () => {
          if (controller.signal.aborted) return;

          const anotherDialogIsOpen = document.querySelector('[role="dialog"]') !== null;
          const pageIsHidden = document.visibilityState !== "visible";
          if (anotherDialogIsOpen || pageIsHidden) {
            openWhenPageIsReady(nextPrompt, attempt + 1);
            return;
          }

          setProblemAreas([]);
          setNoProblem(false);
          setNote("");
          setSuggestion("");
          setResult(null);
          setPrompt(nextPrompt);
          setMode("daily");
          setOpen(true);
        },
        attempt === 0 ? 1_200 : 750,
      );
    }

    void fetch("/api/feedback/daily", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { prompt?: DailyFeedbackPrompt | null };
      })
      .then((payload) => {
        const nextPrompt = payload?.prompt;
        if (!nextPrompt || isDismissedToday(nextPrompt.usageDate)) return;

        openWhenPageIsReady(nextPrompt);
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
      if (openTimer) window.clearTimeout(openTimer);
    };
  }, [tourActive]);

  useEffect(() => {
    if (mode !== "daily" || !result?.ok) return;
    const animationFrame = window.requestAnimationFrame(() => successRef.current?.focus());
    return () => window.cancelAnimationFrame(animationFrame);
  }, [mode, result?.ok]);

  function resetManual() {
    setKind("bug");
    setMessage("");
    setResult(null);
  }

  function closeDialog() {
    if (mode === "daily" && prompt) dismissForToday(prompt.usageDate);
    setOpen(false);
  }

  function onManualSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (message.trim().length < 3) {
      setResult({ ok: false, text: "Dites-nous en un peu plus." });
      return;
    }

    startTransition(async () => {
      const response = await submitFeedback({ kind, message: message.trim(), page: pathname });
      setResult({ ok: response.ok, text: response.message });
      if (response.ok) setMessage("");
    });
  }

  function onDailySubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt) return;

    if (!noProblem && problemAreas.length === 0) {
      setResult({ ok: false, text: "Sélectionnez une zone ou Aucun problème." });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/feedback/daily", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            usageDate: prompt.usageDate,
            problemAreas,
            noProblem,
            note: note.trim(),
            suggestion: noProblem ? suggestion.trim() : "",
            page: pathname,
          }),
        });
        const payload = (await response.json()) as { ok?: boolean; message?: string };
        const ok = response.ok && payload.ok === true;
        setResult({
          ok,
          text: payload.message ?? (ok ? "Merci pour votre retour." : "Le retour n’a pas pu être envoyé."),
        });

        if (ok) dismissForToday(prompt.usageDate);
      } catch {
        setResult({ ok: false, text: "Le retour n’a pas pu être envoyé. Réessayez dans un instant." });
      }
    });
  }

  function toggleProblemArea(area: DailyFeedbackArea) {
    setNoProblem(false);
    setSuggestion("");
    setResult(null);
    setProblemAreas((current) =>
      current.includes(area) ? current.filter((value) => value !== area) : [...current, area],
    );
  }

  if (tourActive) return null;

  const dailyTitle = prompt
    ? `Vous avez utilisé TaDiff ${getUsageDateLabel(prompt.usageDate)}`
    : "Votre retour sur TaDiff";

  return (
    <>
      <button
        type="button"
        className={
          triggerClassName ??
          "inline-flex items-center rounded-md border border-border bg-panel px-3 py-2 text-sm font-medium shadow-sm shadow-ink/5 transition hover:bg-panel-strong"
        }
        onClick={() => {
          resetManual();
          setMode("manual");
          setOpen(true);
        }}
      >
        Donner un retour
      </button>

      <Dialog
        open={open}
        onClose={closeDialog}
        eyebrow={mode === "daily" ? "Votre expérience" : "Bêta TaDiff"}
        title={mode === "daily" ? dailyTitle : "Donner un retour"}
        description={
          mode === "daily"
            ? "Qu’en avez-vous pensé ? Dites-nous où vous avez rencontré une difficulté."
            : "Bug, idée ou avis : votre retour arrive directement à l’équipe TaDiff."
        }
        className={mode === "daily" ? "max-w-2xl" : "max-w-xl"}
      >
        {mode === "daily" ? (
          <form className="space-y-5" onSubmit={onDailySubmit}>
            {result?.ok ? (
              <div
                ref={successRef}
                aria-live="polite"
                className="rounded-lg border border-success/25 bg-success/10 p-5 text-center focus:outline-none"
                role="status"
                tabIndex={-1}
              >
                <CircleCheck aria-hidden="true" className="mx-auto h-8 w-8 text-success" />
                <p className="mt-3 font-medium text-foreground">Merci pour votre retour.</p>
                <p className="mt-1 text-sm text-muted">Il nous aide à améliorer TaDiff au bon endroit.</p>
                <Button className="mt-5" type="button" onClick={closeDialog}>
                  Fermer
                </Button>
              </div>
            ) : (
              <>
                <fieldset>
                  <legend className="text-sm font-medium text-foreground">
                    Avec quoi avez-vous eu un problème ?
                  </legend>
                  <p className="mt-1 text-xs text-muted">Vous pouvez sélectionner plusieurs zones.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {dailyFeedbackAreas.map((area) => {
                      const selected = problemAreas.includes(area.value);
                      return (
                        <button
                          key={area.value}
                          aria-pressed={selected}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                            selected
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border bg-panel hover:border-accent/40 hover:bg-panel-strong",
                          )}
                          type="button"
                          onClick={() => toggleProblemArea(area.value)}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid h-5 w-5 shrink-0 place-items-center rounded border",
                              selected ? "border-accent bg-accent text-white" : "border-border bg-panel",
                            )}
                          >
                            {selected ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                          {area.label}
                        </button>
                      );
                    })}
                    <button
                      aria-pressed={noProblem}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        noProblem
                          ? "border-success/50 bg-success/10 text-foreground"
                          : "border-border bg-panel hover:border-success/35 hover:bg-panel-strong",
                      )}
                      type="button"
                      onClick={() => {
                        setNoProblem(true);
                        setProblemAreas([]);
                        setNote("");
                        setResult(null);
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded border",
                          noProblem ? "border-success bg-success text-white" : "border-border bg-panel",
                        )}
                      >
                        {noProblem ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      Aucun problème
                    </button>
                  </div>
                </fieldset>

                {noProblem ? (
                  <label className="block text-sm font-medium">
                    Une suggestion pour aller plus loin ? <span className="font-normal text-muted">(facultatif)</span>
                    <div className="mt-2">
                      <Textarea
                        rows={4}
                        maxLength={2000}
                        placeholder="Une idée, une amélioration ou quelque chose qui vous ferait gagner du temps…"
                        value={suggestion}
                        onChange={(event) => setSuggestion(event.target.value)}
                      />
                    </div>
                  </label>
                ) : (
                  <label className="block text-sm font-medium">
                    Que s’est-il passé ? <span className="font-normal text-muted">(facultatif)</span>
                    <div className="mt-2">
                      <Textarea
                        rows={4}
                        maxLength={2000}
                        placeholder="Ajoutez un détail pour nous aider à comprendre le problème."
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </div>
                  </label>
                )}

                {result ? (
                  <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                    {result.text}
                  </p>
                ) : null}

                <div className="sticky -bottom-5 -mx-5 flex flex-col-reverse gap-2 border-t border-border bg-panel/95 px-5 py-3 backdrop-blur sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" onClick={closeDialog}>
                    Plus tard
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Envoi…" : "Envoyer mon retour"}
                  </Button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form className="space-y-4" onSubmit={onManualSubmit}>
            <div className="grid gap-2 sm:grid-cols-3">
              {feedbackKinds.map((value) => {
                const meta = kindLabels[value];
                const active = kind === value;
                return (
                  <button
                    key={value}
                    aria-pressed={active}
                    type="button"
                    onClick={() => setKind(value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      active ? "border-accent bg-accent/10" : "border-border bg-panel-strong/35 hover:border-accent/40",
                    )}
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
                  maxLength={2000}
                  placeholder="Décrivez le bug, l’idée ou l’avis. Plus c’est précis, mieux on peut aider."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
            </label>

            {result ? (
              <p
                className={result.ok ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success" : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"}
                role={result.ok ? "status" : "alert"}
              >
                {result.text}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Envoyé depuis <span className="font-medium">{pathname}</span>
              </p>
              {result?.ok ? (
                <Button type="button" onClick={closeDialog}>Fermer</Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Envoi…" : "Envoyer le retour"}
                </Button>
              )}
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

function getLocalDayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dismissalKey(usageDate: string) {
  return `tadiff-daily-feedback-dismissed:${usageDate}:${getLocalDayKey()}`;
}

function isDismissedToday(usageDate: string) {
  try {
    return window.localStorage.getItem(dismissalKey(usageDate)) === "1";
  } catch {
    return false;
  }
}

function dismissForToday(usageDate: string) {
  try {
    window.localStorage.setItem(dismissalKey(usageDate), "1");
  } catch {
    // Le stockage local peut être indisponible ; la réponse reste enregistrée côté serveur.
  }
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
