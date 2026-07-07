"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { overviewTourSteps } from "@/data/tour-steps";

const storageKey = "tadiff-visite-guidee";
export const tourStartEvent = "tadiff:start-tour";

type TourState = {
  active: boolean;
  step: number;
};

const inactiveState: TourState = { active: false, step: 0 };

function readStoredState(): TourState {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) return inactiveState;

    const parsed = JSON.parse(raw) as Partial<TourState>;

    if (typeof parsed.step !== "number" || parsed.step < 0 || parsed.step >= overviewTourSteps.length) {
      return inactiveState;
    }

    return { active: parsed.active === true, step: parsed.step };
  } catch {
    return inactiveState;
  }
}

function storeState(state: TourState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // stockage indisponible : la visite fonctionne quand meme pour la session.
  }
}

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

const tourEase = "cubic-bezier(0.22, 1, 0.36, 1)";

export function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<TourState>(inactiveState);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1024, height: 768 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setState(readStoredState());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onStart() {
      const next: TourState = { active: true, step: 0 };
      setState(next);
      storeState(next);

      const first = overviewTourSteps[0];

      if (first && window.location.pathname !== first.path) {
        router.push(first.path);
      }
    }

    window.addEventListener(tourStartEvent, onStart);
    return () => window.removeEventListener(tourStartEvent, onStart);
  }, [router]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncPreferences() {
      setPrefersReducedMotion(media.matches);
    }

    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    syncPreferences();
    syncViewport();

    media.addEventListener("change", syncPreferences);
    window.addEventListener("resize", syncViewport);

    return () => {
      media.removeEventListener("change", syncPreferences);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const step = state.active ? overviewTourSteps[state.step] : undefined;
  const onStepPage = step ? pathname === step.path : false;
  const targetName = step?.target ?? null;

  useEffect(() => {
    let frame = 0;

    if (!step || !onStepPage || !targetName) {
      frame = window.requestAnimationFrame(() => {
        setRect(null);
        setTargetMissing(false);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    function measure() {
      const element = document.querySelector(`[data-tour="${targetName}"]`);

      if (!element) {
        setTargetMissing(true);
        return;
      }

      const box = element.getBoundingClientRect();
      setTargetMissing(false);
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        bottom: box.bottom,
      });
    }

    function scheduleMeasure() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    }

    const element = document.querySelector(`[data-tour="${targetName}"]`);
    element?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    const timer = window.setTimeout(measure, prefersReducedMotion ? 40 : 180);

    function onViewportChange() {
      scheduleMeasure();
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    scheduleMeasure();

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [step, onStepPage, targetName, state.step, prefersReducedMotion]);

  if (!state.active || !step) {
    return null;
  }

  const total = overviewTourSteps.length;

  function goTo(index: number) {
    if (index < 0) return;

    if (index >= total) {
      finish();
      return;
    }

    const next: TourState = { active: true, step: index };
    setState(next);
    storeState(next);

    const target = overviewTourSteps[index];

    if (target.path !== pathname) {
      router.push(target.path);
    }
  }

  function finish() {
    setState(inactiveState);
    storeState(inactiveState);
  }

  if (!onStepPage) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-panel p-4 shadow-lg shadow-ink/20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          William - visite guidee
        </p>
        <p className="mt-2 text-sm">La visite est en pause sur une autre page.</p>
        <div className="mt-3 flex items-center gap-3">
          <button
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            type="button"
            onClick={() => router.push(step.path)}
          >
            Reprendre ({state.step + 1}/{total})
          </button>
          <button
            className="text-sm text-muted transition hover:text-foreground"
            type="button"
            onClick={finish}
          >
            Quitter
          </button>
        </div>
      </div>
    );
  }

  const showSpotlight = Boolean(targetName && rect && !targetMissing);
  const cardWidth = Math.min(380, viewport.width - 32);
  const motionStyle = prefersReducedMotion
    ? undefined
    : { transitionTimingFunction: tourEase };
  const cardStyle = (() => {
    if (!showSpotlight || !rect) return undefined;

    const cardHeightEstimate = 252;
    const top = rect.bottom + cardHeightEstimate + 20 < viewport.height
      ? rect.bottom + 16
      : Math.max(16, rect.top - cardHeightEstimate - 16);

    return {
      width: cardWidth,
      left: Math.min(
        Math.max(16, rect.left + rect.width / 2 - cardWidth / 2),
        viewport.width - cardWidth - 16,
      ),
      top,
      ...motionStyle,
    };
  })();

  const card = (
    <div
      className="fixed z-50 rounded-lg border border-border bg-panel p-5 opacity-100 shadow-xl shadow-ink/25 transition-[top,left,transform,opacity] duration-500 motion-reduce:transition-none"
      style={cardStyle ?? {
        width: cardWidth,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        ...motionStyle,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        William - visite guidee - {state.step + 1}/{total}
      </p>
      <p className="mt-2 text-lg font-semibold">{step.title}</p>
      <p className="mt-2 text-sm text-muted">{step.body}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          className="text-sm text-muted transition hover:text-foreground"
          type="button"
          onClick={finish}
        >
          Quitter
        </button>
        <div className="flex items-center gap-2">
          {state.step > 0 ? (
            <button
              className="rounded-md border border-border px-3 py-2 text-sm transition hover:bg-panel-strong"
              type="button"
              onClick={() => goTo(state.step - 1)}
            >
              Precedent
            </button>
          ) : null}
          <button
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            type="button"
            onClick={() => goTo(state.step + 1)}
          >
            {state.step + 1 === total ? "Terminer" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showSpotlight && rect ? (
        <div
          className="pointer-events-none fixed z-40 rounded-xl border-2 border-accent transition-[top,left,width,height,box-shadow,opacity] duration-500 motion-reduce:transition-none"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(8, 8, 14, 0.62)",
            ...motionStyle,
          }}
        />
      ) : (
        <div className="fixed inset-0 z-40 bg-ink/60 transition-opacity duration-500 motion-reduce:transition-none" style={motionStyle} />
      )}
      {card}
    </>
  );
}
