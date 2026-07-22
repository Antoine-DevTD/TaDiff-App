"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const GuidedTour = dynamic(
  () => import("@/components/tour/guided-tour").then((module) => module.GuidedTour),
  { ssr: false },
);

const FeedbackWidget = dynamic(
  () => import("@/components/feedback/feedback-widget").then((module) => module.FeedbackWidget),
  { ssr: false },
);

export function DeferredDashboardTools() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setReady(true), { timeout: 800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(() => setReady(true), 200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  if (!ready) return null;

  return (
    <>
      <GuidedTour />
      <FeedbackWidget triggerClassName="fixed bottom-7 right-24 z-40 hidden items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-sm font-medium shadow-lg shadow-ink/10 transition hover:bg-panel-strong sm:inline-flex print:hidden" />
    </>
  );
}
