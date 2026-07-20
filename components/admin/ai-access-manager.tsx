"use client";

import { Crown, Save, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { adminSetCompanyAiAccess, adminSetFounderAccount, adminSetUserAiAccess } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminAiAccount } from "@/lib/supabase/admin";

export function AiAccessManager({ accounts }: { accounts: AdminAiAccount[] }) {
  const companies = useMemo(() => groupAccounts(accounts), [accounts]);

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start gap-3">
        <UserRoundCheck className="mt-0.5 h-5 w-5 text-accent" />
        <div>
          <h3 className="text-xl font-semibold">Comptes autorises</h3>
          <p className="mt-1 text-sm text-muted">Activez William par compagnie, puis uniquement pour les membres qui participent au rodage.</p>
        </div>
      </div>
      {companies.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">Appliquez la migration 039 pour afficher les comptes et leurs quotas.</p>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => <CompanyAiAccess key={company.companyId} company={company} />)}
        </div>
      )}
    </Card>
  );
}

type CompanyGroup = {
  companyId: string;
  companyName: string;
  enabled: boolean;
  monthlyQuota: number;
  monthlyUsed: number;
  bonusBalance: number;
  accounts: AdminAiAccount[];
};

function CompanyAiAccess({ company }: { company: CompanyGroup }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(company.enabled);
  const [monthlyQuota, setMonthlyQuota] = useState(company.monthlyQuota);
  const [bonusBalance, setBonusBalance] = useState(company.bonusBalance);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const quotaPercent = monthlyQuota > 0 ? Math.min(100, Math.round((company.monthlyUsed / monthlyQuota) * 100)) : 0;

  const saveCompany = () => startTransition(async () => {
    const result = await adminSetCompanyAiAccess(company.companyId, { enabled, monthlyQuota, bonusBalance });
    setMessage(result.message);
    if (result.ok) router.refresh();
  });

  return (
    <section className="rounded-md border border-border bg-panel-strong/30 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{company.companyName}</p>
            <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Rodage actif" : "Desactive"}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">{formatTokens(company.monthlyUsed)} consommes ce mois-ci, soit {quotaPercent}% du quota mensuel.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={enabled} type="checkbox" onChange={(event) => setEnabled(event.target.checked)} />
          Activer pour la compagnie
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <Field label="Quota mensuel partage"><Input min="0" step="10000" type="number" value={monthlyQuota} onChange={(event) => setMonthlyQuota(Number(event.target.value))} /></Field>
        <Field label="Credits supplementaires"><Input min="0" step="10000" type="number" value={bonusBalance} onChange={(event) => setBonusBalance(Number(event.target.value))} /></Field>
        <Button disabled={pending} type="button" onClick={saveCompany}><Save className="mr-2 h-4 w-4" />Enregistrer</Button>
      </div>
      {message ? <p className="mt-2 text-xs text-muted" role="status">{message}</p> : null}

      <div className="mt-4 divide-y divide-border border-t border-border">
        {company.accounts.map((account) => <AccountAccess key={account.userId} account={account} companyEnabled={enabled} />)}
      </div>
    </section>
  );
}

function AccountAccess({ account, companyEnabled }: { account: AdminAiAccount; companyEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(account.userEnabled);
  const [founderMessage, setFounderMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [founderPending, startFounderTransition] = useTransition();
  const toggle = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      const result = await adminSetUserAiAccess(account.userId, next);
      if (!result.ok) setEnabled(!next);
      else router.refresh();
    });
  };
  const toggleFounder = () => startFounderTransition(async () => {
    const result = await adminSetFounderAccount(account.userId, !account.isFounder);
    setFounderMessage(result.message);
    if (result.ok) router.refresh();
  });

  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{account.fullName || account.email || "Compte sans nom"}</p>
          <Badge>{account.role}</Badge>
          {account.isSuperAdmin ? <Badge><ShieldCheck className="mr-1 h-3.5 w-3.5" />Super-admin technique</Badge> : null}
          {account.isFounder ? <Badge tone="success"><Crown className="mr-1 h-3.5 w-3.5" />Fondateur</Badge> : null}
        </div>
        {account.fullName && account.email ? <p className="mt-1 truncate text-xs text-muted">{account.email}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {account.isSuperAdmin ? (
          <span className="text-xs font-medium text-muted">Console uniquement</span>
        ) : account.isFounder ? (
          <span className="text-xs font-medium text-success">{formatTokens(account.accountMonthlyUsed)} / 5 000 000 tokens ce mois-ci</span>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <input checked={enabled} disabled={pending || !companyEnabled} type="checkbox" onChange={(event) => toggle(event.target.checked)} />
            Autoriser William
          </label>
        )}
        {!account.isSuperAdmin ? (
          <Button className="h-9 px-3 text-sm" disabled={founderPending} type="button" variant="ghost" onClick={toggleFounder}>
            <Crown className="mr-2 h-4 w-4" />
            {account.isFounder ? "Retirer fondateur" : "Definir fondateur"}
          </Button>
        ) : null}
      </div>
      {founderMessage ? <p className="text-xs text-muted" role="status">{founderMessage}</p> : null}
    </div>
  );
}

function groupAccounts(accounts: AdminAiAccount[]): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();
  for (const account of accounts) {
    const current = groups.get(account.companyId) ?? {
      companyId: account.companyId,
      companyName: account.companyName,
      enabled: account.companyEnabled,
      monthlyQuota: account.monthlyQuota,
      monthlyUsed: account.monthlyUsed,
      bonusBalance: account.bonusBalance,
      accounts: [],
    };
    current.accounts.push(account);
    groups.set(account.companyId, current);
  }
  return Array.from(groups.values());
}

function formatTokens(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="block text-sm font-medium">{label}<span className="mt-2 block">{children}</span></label>;
}
