"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  isPublicAnalyticsEnabled,
  setPublicAnalyticsEnabled,
} from "@/lib/public-analytics";

export function AnalyticsPreference() {
  const enabled = useSyncExternalStore(subscribe, isPublicAnalyticsEnabled, () => false);

  function update(nextValue: boolean) {
    setPublicAnalyticsEnabled(nextValue);
    window.dispatchEvent(new Event("tadiff-analytics-preference"));
  }

  return (
    <div className="rounded-md border border-border bg-panel-strong/40 p-4">
      <p className="font-medium text-foreground">
        Mesure d&apos;audience : {enabled ? "autorisee" : "refusee"}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">
        Ce choix reste enregistre dans ce navigateur. Le refus supprime immediatement
        l&apos;identifiant de session local.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" disabled={enabled} onClick={() => update(true)}>
          Autoriser
        </Button>
        <Button type="button" variant="secondary" disabled={!enabled} onClick={() => update(false)}>
          Refuser
        </Button>
      </div>
    </div>
  );
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("tadiff-analytics-preference", onStoreChange);
  return () => window.removeEventListener("tadiff-analytics-preference", onStoreChange);
}
