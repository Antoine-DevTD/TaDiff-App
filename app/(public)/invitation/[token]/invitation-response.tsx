"use client";

import { CalendarCheck, CalendarX } from "lucide-react";
import { useState, useTransition } from "react";
import { respondToInvitation } from "./actions";

export function InvitationResponse({
  initialResponse,
  token,
}: {
  initialResponse: "yes" | "no" | null;
  token: string;
}) {
  const [response, setResponse] = useState(initialResponse);
  const [message, setMessage] = useState(
    initialResponse ? "Votre reponse a deja ete enregistree. Vous pouvez la modifier." : "",
  );
  const [isPending, startTransition] = useTransition();

  function submit(nextResponse: "yes" | "no") {
    startTransition(async () => {
      const result = await respondToInvitation(token, nextResponse);
      setMessage(result.message);
      if (result.ok) setResponse(nextResponse);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className={
            response === "yes"
              ? "flex min-h-14 items-center justify-center gap-2 rounded-md bg-success px-4 font-medium text-white"
              : "flex min-h-14 items-center justify-center gap-2 rounded-md border border-border bg-panel font-medium hover:border-success hover:text-success"
          }
          disabled={isPending}
          type="button"
          onClick={() => submit("yes")}
        >
          <CalendarCheck className="h-5 w-5" aria-hidden />
          Oui, je viendrai
        </button>
        <button
          className={
            response === "no"
              ? "flex min-h-14 items-center justify-center gap-2 rounded-md bg-ink px-4 font-medium text-white"
              : "flex min-h-14 items-center justify-center gap-2 rounded-md border border-border bg-panel font-medium hover:border-ink"
          }
          disabled={isPending}
          type="button"
          onClick={() => submit("no")}
        >
          <CalendarX className="h-5 w-5" aria-hidden />
          Non, pas cette fois
        </button>
      </div>
      {message ? (
        <p aria-live="polite" className="rounded-md bg-panel-strong px-4 py-3 text-sm text-muted">
          {isPending ? "Enregistrement..." : message}
        </p>
      ) : null}
    </div>
  );
}
