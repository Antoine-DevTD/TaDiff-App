"use client";

import { useState } from "react";
import { FixedCostForm } from "@/components/finance/fixed-cost-form";
import { TreasuryBalanceForm } from "@/components/finance/treasury-balance-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { TreasurySnapshot } from "@/types";

export function TreasuryMovementDialog({ currentBalance, onRecorded }: { currentBalance: number | null; onRecorded: (snapshot: TreasurySnapshot) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"balance" | "fixed">("balance");
  return <><Button type="button" onClick={() => setOpen(true)}>Ajouter un mouvement</Button><Dialog open={open} onClose={() => setOpen(false)} eyebrow="Trésorerie" title="Ajouter un mouvement" description="Mettez à jour le solde réel ou enregistrez une dépense qui revient régulièrement."><div className="mb-4 grid grid-cols-2 gap-2"><Button variant={kind === "balance" ? "primary" : "secondary"} onClick={() => setKind("balance")}>Solde ponctuel</Button><Button variant={kind === "fixed" ? "primary" : "secondary"} onClick={() => setKind("fixed")}>Frais fixe / régulier</Button></div>{kind === "balance" ? <TreasuryBalanceForm currentBalance={currentBalance} onRecorded={(snapshot) => { onRecorded(snapshot); setOpen(false); }} /> : <FixedCostForm onSaved={() => setOpen(false)} />}</Dialog></>;
}
