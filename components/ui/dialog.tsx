"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const animationFrame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
      <button
        aria-label="Fermer la fenetre"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "relative max-h-[88vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-lg border border-border bg-panel shadow-xl",
          className,
        )}
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow ? (
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
              ) : null}
              <h3 id={titleId} className="mt-1 text-xl font-semibold">
                {title}
              </h3>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <Button
              aria-label="Fermer la fenetre"
              className="h-11 w-11 shrink-0 p-0"
              title="Fermer"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
