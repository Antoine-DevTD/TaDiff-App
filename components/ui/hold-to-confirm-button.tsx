"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_DURATION = 3_000;

export function HoldToConfirmButton({
  disabled = false,
  duration = DEFAULT_DURATION,
  label = "Maintenir 3 secondes pour supprimer",
  pending = false,
  onConfirm,
}: {
  disabled?: boolean;
  duration?: number;
  label?: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  const animationFrame = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const completed = useRef(false);
  const confirmationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bursting, setBursting] = useState(false);

  useEffect(() => () => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    if (confirmationTimeout.current) clearTimeout(confirmationTimeout.current);
  }, []);

  useEffect(() => {
    if (pending || !completed.current) return;
    const timeout = setTimeout(() => {
      completed.current = false;
      setBursting(false);
      setProgress(0);
    }, 450);
    return () => clearTimeout(timeout);
  }, [pending]);

  function reset() {
    if (completed.current) return;
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    startedAt.current = null;
    setHolding(false);
    setProgress(0);
  }

  function finish() {
    completed.current = true;
    setHolding(false);
    setProgress(100);
    setBursting(true);
    confirmationTimeout.current = setTimeout(onConfirm, 240);
  }

  function tick(now: number) {
    if (startedAt.current === null || completed.current) return;
    const nextProgress = Math.min(100, ((now - startedAt.current) / duration) * 100);
    setProgress(nextProgress);
    if (nextProgress >= 100) {
      finish();
      return;
    }
    animationFrame.current = requestAnimationFrame(tick);
  }

  function startHolding() {
    if (disabled || pending || holding || completed.current) return;
    startedAt.current = performance.now();
    setHolding(true);
    animationFrame.current = requestAnimationFrame(tick);
  }

  const visibleLabel = pending
    ? "Suppression en cours..."
    : holding
      ? `Maintenez... ${Math.ceil((duration * (1 - progress / 100)) / 1000)} s`
      : label;

  return (
    <button
      aria-label={label}
      className={cn(
        "relative isolate grid min-h-12 w-full select-none grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 overflow-visible rounded-md border border-danger/45 bg-danger/8 px-5 py-3 text-sm font-semibold text-danger outline-none transition-[color,background-color,border-color,transform] focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        holding && "border-danger bg-danger/12",
        bursting && "scale-95 border-transparent bg-danger text-white",
      )}
      disabled={disabled || pending}
      type="button"
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        startHolding();
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") reset();
      }}
      onPointerCancel={reset}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        startHolding();
      }}
      onPointerUp={reset}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-left rounded-[inherit] bg-danger/18"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
      <Trash2 aria-hidden="true" className={cn("h-4 w-4", holding && "animate-pulse")} />
      <span className="relative block min-w-0 text-center">
        <span className="invisible block" aria-hidden="true">{label}</span>
        <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap">{visibleLabel}</span>
      </span>
      {bursting ? (
        <span aria-hidden="true" className="destructive-burst">
          {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
        </span>
      ) : null}
    </button>
  );
}
