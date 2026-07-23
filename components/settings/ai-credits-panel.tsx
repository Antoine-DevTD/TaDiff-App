import { Bot, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AiEntitlement } from "@/lib/ai/entitlement";
import { aiCreditPackCodes, aiCreditPacks, hasAiCreditPrice } from "@/lib/stripe/ai-credits";
import { createAiCreditCheckoutSession } from "@/lib/stripe/ai-credit-checkout-action";

export function AiCreditsPanel({ canManage, entitlement }: { canManage: boolean; entitlement: AiEntitlement | null }) {
  const usedPercent = entitlement?.monthlyQuota ? Math.min(100, Math.round((entitlement.monthlyUsed / entitlement.monthlyQuota) * 100)) : 0;
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3"><Bot className="mt-0.5 h-5 w-5 text-accent" /><div><p className="font-semibold">William</p><p className="mt-1 text-sm text-muted">Assistant IA en accès progressif. Les credits supplementaires ne disparaissent pas a la fin du mois.</p></div></div>
        <Badge tone={entitlement?.enabled ? "success" : "neutral"}>{entitlement?.enabled ? "Active" : "Pas encore active"}</Badge>
      </div>

      {entitlement ? <div className="grid gap-3 sm:grid-cols-3"><Metric label="Utilises ce mois" value={formatTokens(entitlement.monthlyUsed)} /><Metric label="Quota mensuel" value={entitlement.unlimited ? "Illimite" : formatTokens(entitlement.monthlyQuota)} /><Metric label="Credits disponibles" value={entitlement.unlimited ? "Illimites" : formatTokens(entitlement.remainingTokens ?? 0)} /></div> : null}
      {entitlement && !entitlement.unlimited ? <div><div className="h-2 overflow-hidden rounded-full bg-panel-strong"><div className="h-full bg-accent transition-[width]" style={{ width: `${usedPercent}%` }} /></div><p className="mt-2 text-xs text-muted">Les credits achetes sont utilises seulement après le quota mensuel inclus.</p></div> : null}

      {entitlement?.enabled && canManage ? <div className="border-t border-border pt-4"><div className="mb-3 flex items-center gap-2"><Coins className="h-4 w-4 text-accent" /><p className="text-sm font-semibold">Ajouter des credits</p></div><div className="grid gap-3 md:grid-cols-3">{aiCreditPackCodes.map((code) => { const pack = aiCreditPacks[code]; return <form key={code} action={createAiCreditCheckoutSession.bind(null, code)} className="rounded-md border border-border bg-panel-strong/30 p-3"><p className="font-medium">{pack.label}</p><p className="mt-1 text-sm text-muted">{pack.displayPrice}</p><Button className="mt-3 w-full" disabled={!hasAiCreditPrice(code)} type="submit" variant="secondary">Acheter</Button></form>; })}</div><p className="mt-3 text-xs text-muted">Les boutons deviennent actifs après creation des trois tarifs ponctuels dans Stripe et ajout de leurs identifiants dans Vercel.</p></div> : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-panel-strong/40 p-3"><p className="text-lg font-semibold">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>; }
function formatTokens(value: number) { return new Intl.NumberFormat("fr-FR").format(value); }
