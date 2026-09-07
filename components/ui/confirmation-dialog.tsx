"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ConfirmationDialog({ confirmLabel = "Confirmer", description, eyebrow = "Confirmation", open, pending = false, title, tone = "danger", onClose, onConfirm }: { confirmLabel?: string; description: string; eyebrow?: string; open: boolean; pending?: boolean; title: string; tone?: "danger" | "warning"; onClose: () => void; onConfirm: () => void }) {
  return <Dialog className="max-w-lg" open={open} onClose={() => { if (!pending) onClose(); }} eyebrow={eyebrow} title={title} description={description}>
    <div className={`flex gap-3 rounded-md border p-4 text-sm leading-6 ${tone === "danger" ? "border-danger/20 bg-danger/6" : "border-warning/25 bg-warning/10"}`}><AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${tone === "danger" ? "text-danger" : "text-warning"}`} aria-hidden /><p>Vérifiez cette action avant de continuer.</p></div>
    <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" disabled={pending} onClick={onClose}>Annuler</Button><Button type="button" className={tone === "danger" ? "bg-danger text-white hover:bg-danger/90" : undefined} disabled={pending} onClick={onConfirm}>{pending ? "Traitement…" : confirmLabel}</Button></div>
  </Dialog>;
}
