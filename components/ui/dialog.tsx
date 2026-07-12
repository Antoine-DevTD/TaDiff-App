"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portal sur document.body : evite qu'un ancetre avec backdrop-filter
  // (ex. le header sticky) ne pige la modale en position: fixed.
  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <button
        aria-label="Fermer la fenetre"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={onClose}
      />
      <Card className={cn("relative max-h-[88vh] w-full max-w-3xl overflow-y-auto p-0", className)}>
        <div className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow ? (
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
              ) : null}
              <h3 className="mt-1 text-xl font-semibold">{title}</h3>
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            <Button variant="ghost" type="button" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </Card>
    </div>,
    document.body,
  );
}
