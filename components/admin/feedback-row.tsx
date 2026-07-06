"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminSetFeedbackStatus } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdminFeedback } from "@/lib/supabase/admin";
import { feedbackStatuses } from "@/lib/validation/feedback";

const kindMeta: Record<AdminFeedback["kind"], { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  bug: { label: "Bug", tone: "danger" },
  idee: { label: "Idee", tone: "success" },
  avis: { label: "Avis", tone: "neutral" },
};

const statusMeta: Record<AdminFeedback["status"], { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  nouveau: { label: "Nouveau", tone: "warning" },
  en_cours: { label: "En cours", tone: "neutral" },
  traite: { label: "Traite", tone: "success" },
};

const statusLabels: Record<(typeof feedbackStatuses)[number], string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  traite: "Traite",
};

export function FeedbackRow({ feedback }: { feedback: AdminFeedback }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AdminFeedback["status"]>(feedback.status);
  const [response, setResponse] = useState(feedback.adminResponse);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const kind = kindMeta[feedback.kind];
  const currentStatus = statusMeta[feedback.status];

  function save() {
    startTransition(async () => {
      const result = await adminSetFeedbackStatus(feedback.id, { status, response });
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={kind.tone}>{kind.label}</Badge>
        <Badge tone={currentStatus.tone}>{currentStatus.label}</Badge>
        <span className="text-sm font-medium">{feedback.companyName}</span>
        <span className="text-xs text-muted">
          {feedback.actorName} · {new Date(feedback.createdAt).toLocaleDateString("fr-FR")}
          {feedback.page ? ` · ${feedback.page}` : ""}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm">{feedback.message}</p>

      {feedback.adminResponse ? (
        <p className="mt-3 rounded-md border border-border bg-panel px-3 py-2 text-sm text-muted">
          <span className="font-medium text-foreground">Reponse : </span>
          {feedback.adminResponse}
        </p>
      ) : null}

      <div className="mt-3">
        <button
          type="button"
          className="text-sm font-medium text-accent transition hover:text-accent-strong"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Fermer" : "Traiter"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 rounded-md border border-border bg-panel p-4">
          <label className="block text-sm font-medium">
            Statut
            <div className="mt-2 flex flex-wrap gap-2">
              {feedbackStatuses.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={[
                    "rounded-md border px-3 py-1.5 text-sm transition",
                    status === value
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-muted hover:border-accent/40",
                  ].join(" ")}
                >
                  {statusLabels[value]}
                </button>
              ))}
            </div>
          </label>

          <label className="block text-sm font-medium">
            Reponse (optionnel, visible par la compagnie)
            <div className="mt-2">
              <Textarea
                rows={3}
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                placeholder="Merci pour le signalement, c'est corrige dans la prochaine version..."
              />
            </div>
          </label>

          {message && !message.ok ? (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{message.text}</p>
          ) : null}

          <Button type="button" disabled={isPending} onClick={save}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
