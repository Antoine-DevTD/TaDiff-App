"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Mail, Search, Send } from "lucide-react";
import { confirmBetaPayment, inviteBetaSignups, markBetaPaymentEmailsSent, resendBetaInvitation, sendBetaPaymentEmails } from "@/app/(dashboard)/admin/beta/actions";
import { betaPaymentEmailBody, betaPaymentEmailSubject, getBetaAccessStage, renderBetaEmailTemplate } from "@/lib/beta-access";
import type { AdminBetaSignup } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Stage = ReturnType<typeof getBetaAccessStage>;
const stageMeta: Record<Stage, { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  registered: { label: "Inscrit", tone: "neutral" },
  payment_email_sent: { label: "Paiement envoye", tone: "warning" },
  paid: { label: "Paiement verifie", tone: "success" },
  invited: { label: "Invitation envoyee", tone: "success" },
  account_created: { label: "Compte cree", tone: "success" },
  error: { label: "A reprendre", tone: "danger" },
};

export function BetaAccessManager({ canManage, signups }: { canManage: boolean; signups: AdminBetaSignup[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [stage, setStage] = useState<"all" | Stage>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState(betaPaymentEmailSubject);
  const [body, setBody] = useState(betaPaymentEmailBody);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase("fr-FR");
    return signups.filter((signup) => {
      const currentStage = getBetaAccessStage(signup);
      if (stage !== "all" && currentStage !== stage) return false;
      if (!needle) return true;
      return `${signup.companyName} ${signup.contactName} ${signup.email} ${signup.city}`.toLocaleLowerCase("fr-FR").includes(needle);
    });
  }, [deferredQuery, signups, stage]);

  const eligible = filtered.filter((signup) => !signup.isDemo && signup.status === "reserved");
  const previewSignup = signups.find((signup) => selected.includes(signup.id)) ?? eligible[0];
  const context = previewSignup ? { firstName: previewSignup.contactName.split(/\s+/)[0] || previewSignup.contactName, companyName: previewSignup.companyName, email: previewSignup.email, paymentUrl: "https://paiement.stripe.com/..." } : null;

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setMessage("");
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) setSelected([]);
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Progression de la beta">
        {(["registered", "payment_email_sent", "paid", "invited", "account_created"] as Stage[]).map((item) => (
          <button key={item} type="button" className="rounded-md border border-border bg-panel p-4 text-left transition hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => setStage(item)}>
            <span className="text-2xl font-semibold tabular-nums">{signups.filter((signup) => getBetaAccessStage(signup) === item && !signup.isDemo).length}</span>
            <span className="mt-1 block text-xs text-muted">{stageMeta[item].label}</span>
          </button>
        ))}
      </section>

      {canManage ? <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Mail d&apos;activation</h2><p className="mt-1 text-sm text-muted">Paiement unique du premier mois, sans renouvellement automatique.</p></div>
          <Badge tone={selected.length ? "warning" : "neutral"}>{selected.length} selectionnee(s)</Badge>
        </div>
        <label className="block text-sm font-medium">Objet<Input className="mt-2" maxLength={180} value={subject} onChange={(event) => { setSubject(event.target.value); setPreview(false); }} /></label>
        <label className="block text-sm font-medium">Message<textarea className="mt-2 min-h-72 w-full rounded-md border border-border bg-panel px-4 py-3 text-sm leading-6 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10" maxLength={12000} value={body} onChange={(event) => { setBody(event.target.value); setPreview(false); }} /></label>
        <p className="text-xs text-muted">Variables : @prenom · @compagnie · @email · @lien_paiement</p>
        {preview && context ? <div className="rounded-md border border-border bg-white p-5 text-slate-900"><p className="border-b pb-3 text-sm"><strong>Objet :</strong> {renderBetaEmailTemplate(subject, context)}</p><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{renderBetaEmailTemplate(body, context)}</p></div> : null}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setPreview(true)}>Apercu final</Button><Button disabled={!preview || pending || selected.length === 0} type="button" onClick={() => run(() => sendBetaPaymentEmails({ signupIds: selected, subject, body }))}><Mail className="mr-2 h-4 w-4" />Envoyer le paiement</Button><Button disabled={pending || selected.length === 0} type="button" variant="secondary" onClick={() => run(() => markBetaPaymentEmailsSent({ signupIds: selected }))}><CheckCircle2 className="mr-2 h-4 w-4" />Mails deja envoyes manuellement</Button><Button disabled={pending || selected.length === 0} type="button" variant="secondary" onClick={() => run(() => inviteBetaSignups({ signupIds: selected }))}><Send className="mr-2 h-4 w-4" />Envoyer les invitations eligibles</Button></div>
      </Card> : null}

      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-semibold">Compagnies inscrites</h2><p className="mt-1 text-sm text-muted">Suivez chaque compagnie de son inscription a la creation du compte.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><span className="sr-only">Rechercher</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input className="pl-9" placeholder="Compagnie, contact, email..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><Select aria-label="Filtrer par etape" value={stage} onChange={(event) => setStage(event.target.value as typeof stage)}><option value="all">Toutes les etapes</option>{Object.entries(stageMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</Select></div>
        </div>
        {canManage && eligible.length ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={eligible.every((signup) => selected.includes(signup.id))} onChange={(event) => setSelected(event.target.checked ? eligible.map((signup) => signup.id) : [])} />Selectionner les compagnies eligibles affichees</label> : null}
        {message ? <p className="rounded-md border border-border bg-panel-strong p-3 text-sm" role="status">{message}</p> : null}
        {filtered.length === 0 ? <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">Aucune inscription ne correspond a ce filtre.</p> : <div className="space-y-3">{filtered.map((signup) => <BetaSignupRow key={signup.id} canManage={canManage} checked={selected.includes(signup.id)} pending={pending} signup={signup} onCheck={(checked) => setSelected((current) => checked ? [...new Set([...current, signup.id])] : current.filter((id) => id !== signup.id))} onConfirm={(reference) => run(() => confirmBetaPayment({ signupId: signup.id, reference }))} onResend={() => run(() => resendBetaInvitation({ signupId: signup.id }))} />)}</div>}
      </Card>
    </div>
  );
}

function BetaSignupRow({ canManage, checked, onCheck, onConfirm, onResend, pending, signup }: { canManage: boolean; checked: boolean; onCheck: (checked: boolean) => void; onConfirm: (reference: string) => void; onResend: () => void; pending: boolean; signup: AdminBetaSignup }) {
  const [reference, setReference] = useState("");
  const currentStage = getBetaAccessStage(signup);
  const eligible = !signup.isDemo && signup.status === "reserved";
  return <article className="rounded-md border border-border bg-panel-strong/35 p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 gap-3">{canManage ? <input aria-label={`Selectionner ${signup.companyName}`} className="mt-1" disabled={!eligible} type="checkbox" checked={checked} onChange={(event) => onCheck(event.target.checked)} /> : null}<div className="min-w-0"><p className="font-semibold">#{signup.position} {signup.companyName}</p><p className="mt-1 text-sm text-muted">{signup.contactName} · {signup.email}{signup.city ? ` · ${signup.city}` : ""}</p><p className="mt-1 text-xs text-muted">{signup.discipline} — {signup.mainNeed}</p></div></div>
      <div className="flex flex-wrap items-center gap-2">{signup.isDemo ? <Badge tone="warning">Donnee demo</Badge> : null}<Badge tone={stageMeta[currentStage].tone}>{stageMeta[currentStage].label}</Badge></div>
    </div>
    {signup.lastAccessError ? <p className="mt-3 rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{signup.lastAccessError}</p> : null}
    {canManage && eligible && signup.paymentEmailSentAt && !signup.paymentConfirmedAt ? <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row"><Input aria-label={`Reference de paiement pour ${signup.companyName}`} placeholder="Reference Stripe ou note de verification" value={reference} onChange={(event) => setReference(event.target.value)} /><Button disabled={pending || reference.trim().length < 3} type="button" variant="secondary" onClick={() => onConfirm(reference)}><CheckCircle2 className="mr-2 h-4 w-4" />Paiement verifie</Button></div> : null}
    {canManage && eligible && signup.invitationSentAt && !signup.accountCreatedAt ? <div className="mt-4 border-t border-border pt-4"><Button disabled={pending} type="button" variant="secondary" onClick={onResend}><Send className="mr-2 h-4 w-4" />Renvoyer l&apos;invitation</Button><p className="mt-2 text-xs text-muted">Genere un nouveau lien personnel et remplace le lien precedent.</p></div> : null}
    {signup.paymentReference ? <p className="mt-3 text-xs text-muted">Verification : {signup.paymentReference}</p> : null}
  </article>;
}
