"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarClock, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { createTreasuryMovement } from "@/app/(dashboard)/actions";
import { FixedCostForm } from "@/components/finance/fixed-cost-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Show, TreasuryMovement } from "@/types";

export function TreasuryMovementDialog({ onCreated, shows }: { onCreated: (movement: TreasuryMovement) => void; shows: Show[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"movement" | "fixed">("movement");
  const [direction, setDirection] = useState<"income" | "expense">("income");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [reliability, setReliability] = useState<"secured" | "probable" | "uncertain">("secured");
  const [status, setStatus] = useState<"planned" | "paid">("planned");
  const [showId, setShowId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createTreasuryMovement({ label, direction, amount, movementDate, reliability, status, showId, notes });
      setMessage(result.message);
      if (result.ok && result.treasuryMovement) {
        onCreated({ ...result.treasuryMovement, showTitle: shows.find((show) => show.id === showId)?.title ?? "" });
        setOpen(false); setLabel(""); setAmount(""); setNotes("");
      }
    });
  }

  return <>
    <Button type="button" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" aria-hidden />Ajouter un mouvement</Button>
    <Dialog open={open} onClose={() => setOpen(false)} eyebrow="Trésorerie" title="Ajouter un mouvement" description="Enregistrez une entrée, une sortie ponctuelle ou un frais qui revient régulièrement.">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-panel-strong p-1" role="tablist" aria-label="Type de mouvement">
        <Button role="tab" aria-selected={mode === "movement"} variant={mode === "movement" ? "primary" : "ghost"} onClick={() => setMode("movement")}><CalendarClock className="mr-2 h-4 w-4" aria-hidden />Ponctuel</Button>
        <Button role="tab" aria-selected={mode === "fixed"} variant={mode === "fixed" ? "primary" : "ghost"} onClick={() => setMode("fixed")}><CalendarClock className="mr-2 h-4 w-4" aria-hidden />Régulier</Button>
      </div>
      {mode === "fixed" ? <FixedCostForm onSaved={() => setOpen(false)} /> : <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={direction === "income" ? "primary" : "secondary"} onClick={() => setDirection("income")}><ArrowDownLeft className="mr-2 h-4 w-4" aria-hidden />Encaissement</Button>
          <Button variant={direction === "expense" ? "primary" : "secondary"} onClick={() => setDirection("expense")}><ArrowUpRight className="mr-2 h-4 w-4" aria-hidden />Décaissement</Button>
        </div>
        <label className="block text-sm font-medium">Libellé<Input className="mt-2" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={direction === "income" ? "Acompte Théâtre des Célestins" : "Paie de l'équipe"} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Montant<Input className="mt-2" min="0" step="1" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="block text-sm font-medium">Date<Input className="mt-2" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Fiabilité<Select className="mt-2" value={reliability} onChange={(event) => setReliability(event.target.value as typeof reliability)}><option value="secured">Confirmé</option><option value="probable">Probable</option><option value="uncertain">À sécuriser</option></Select></label><label className="block text-sm font-medium">Situation<Select className="mt-2" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="planned">À venir</option><option value="paid">Déjà réalisé</option></Select></label></div>
        <label className="block text-sm font-medium">Spectacle<Select className="mt-2" value={showId} onChange={(event) => setShowId(event.target.value)}><option value="">Toute la compagnie</option>{shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}</Select></label>
        <label className="block text-sm font-medium">Note facultative<Textarea className="mt-2 min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {message ? <p className="text-sm text-danger" role="status">{message}</p> : null}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button disabled={pending || !label.trim() || Number(amount) <= 0} onClick={submit}>{pending ? "Enregistrement…" : "Ajouter le mouvement"}</Button></div>
      </div>}
    </Dialog>
  </>;
}
