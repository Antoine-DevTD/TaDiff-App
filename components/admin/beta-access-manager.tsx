"use client";

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, Gift, RefreshCw, Search, Send } from "lucide-react";
import { confirmBetaPayment, creditBetaWilliam, grantBetaComplimentaryAccess, inviteBetaSignups, markBetaPaymentEmailsSent, resendBetaInvitation, sendBetaPaymentEmails } from "@/app/(dashboard)/admin/beta/actions";
import { betaPaymentEmailBody, betaPaymentEmailSubject, renderBetaEmailTemplate } from "@/lib/beta-access";
import type { AdminBetaSignup } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Filter = "all" | "pending" | "open" | "offered" | "error";
type Result = { ok: boolean; message: string };
function isOffered(signup: AdminBetaSignup) {
  return signup.billingStatus === "comped" || Boolean(signup.accessGrantedAt && !signup.linkedCompanyId);
}
function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
}

export function BetaAccessManager({ canManage, canViewAccess = canManage, signups, error = null }: { canManage: boolean; canViewAccess?: boolean; signups: AdminBetaSignup[]; error?: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState(betaPaymentEmailSubject);
  const [body, setBody] = useState(betaPaymentEmailBody);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const realSignups = signups.filter((signup) => !signup.isDemo);
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase("fr-FR");
    return signups.filter((signup) => {
      if (filter === "pending" && (signup.isDemo || signup.hasAccess)) return false;
      if (filter === "open" && (signup.isDemo || !signup.hasAccess)) return false;
      if (filter === "offered" && (signup.isDemo || !isOffered(signup))) return false;
      if (filter === "error" && !signup.lastAccessError) return false;
      return !needle || `${signup.companyName} ${signup.linkedCompanyName ?? ""} ${signup.contactName} ${signup.email} ${signup.city}`.toLocaleLowerCase("fr-FR").includes(needle);
    });
  }, [deferredQuery, signups, filter]);
  const eligible = filtered.filter((signup) => !signup.isDemo && signup.status === "reserved" && !signup.accessGrantedAt && !isOffered(signup));
  const selectedIds = selected.filter((id) => signups.some((signup) => signup.id === id && !signup.isDemo && signup.status === "reserved" && !signup.accessGrantedAt && !isOffered(signup)));
  const payableIds = selectedIds.filter((id) => !signups.find((signup) => signup.id === id)?.paymentConfirmedAt);
  const inviteIds = selectedIds.filter((id) => signups.some((signup) => signup.id === id && signup.paymentConfirmedAt && !signup.emailConfirmedAt && !signup.invitationSentAt));
  const previewSignup = signups.find((signup) => payableIds.includes(signup.id));
  const context = previewSignup ? { firstName: previewSignup.contactName.split(/\s+/)[0] || previewSignup.contactName, companyName: previewSignup.companyName, email: previewSignup.email, paymentUrl: "https://paiement.stripe.com/..." } : null;

  function run(action: () => Promise<Result>) {
    if (busy.current || error) return;
    busy.current = true;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        setMessage(result);
        if (result.ok) { setSelected([]); setPreview(false); }
        router.refresh();
      } catch {
        setMessage({ ok: false, message: "L’action n’a pas abouti. Vos choix sont conservés ; réessayez." });
      } finally { busy.current = false; }
    });
  }

  return <div className="space-y-5" aria-busy={pending}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <p className="max-w-2xl text-sm text-muted">Ouvrez un accès offert directement. Le paiement et l’invitation se gèrent séparément.</p>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />Actualiser</Button>
    </div>
    {error ? <p className="rounded-md border border-danger/30 p-4 text-sm text-danger" role="alert">{error} Utilisez Actualiser après correction.</p> : <>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Suivi des inscriptions">
        <span><strong className="tabular-nums">{realSignups.length}</strong> inscriptions</span>
        <span><strong className="tabular-nums">{realSignups.filter((signup) => signup.hasAccess).length}</strong> accès ouverts</span>
        <span><strong className="tabular-nums">{realSignups.filter(isOffered).length}</strong> accès offerts</span>
        <span><strong className="tabular-nums">{realSignups.filter((signup) => !signup.hasAccess).length}</strong> accès à activer</span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">Rechercher une inscription</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input className="pl-9" placeholder="Compagnie, personne, email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <Select aria-label="Filtrer les accès" className="sm:w-auto" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="all">Toutes les inscriptions</option><option value="pending">Accès à activer</option><option value="open">Accès ouverts</option><option value="offered">Accès offerts</option><option value="error">Erreurs à reprendre</option></Select>
      </div>
      {message ? <p className={`rounded-md border p-3 text-sm ${message.ok ? "border-success/30 text-success" : "border-danger/30 text-danger"}`} role={message.ok ? "status" : "alert"}>{message.message}</p> : null}
      {filtered.length === 0 ? <p className="border-y border-dashed border-border py-8 text-sm text-muted">{signups.length ? "Aucune inscription ne correspond à ce filtre." : "Aucune inscription bêta pour le moment."}</p> : <div className="divide-y divide-border border-y border-border">
        {filtered.map((signup) => <BetaSignupRow key={signup.id} canManage={canManage} canViewAccess={canViewAccess} pending={pending} signup={signup} onGrant={(note) => run(() => grantBetaComplimentaryAccess({ signupId: signup.id, note }))} onInvite={() => run(() => inviteBetaSignups({ signupIds: [signup.id] }))} onConfirm={(reference) => run(() => confirmBetaPayment({ signupId: signup.id, reference }))} onResend={() => run(() => resendBetaInvitation({ signupId: signup.id }))} onCredit={() => run(() => creditBetaWilliam({ signupIds: [signup.id] }))} />)}
      </div>}
      {canManage ? <details className="border-b border-border pb-4">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Paiements manuels et envois groupés</summary>
        <div className="space-y-4 pt-2">
          <p className="max-w-2xl text-sm text-muted">Ancien parcours bêta : paiement unique du premier mois, sans renouvellement automatique. Les accès offerts sont exclus de ces envois.</p>
          {eligible.length ? <label className="flex min-h-11 items-center gap-2 text-sm"><input disabled={pending} type="checkbox" checked={eligible.every((signup) => selectedIds.includes(signup.id))} onChange={(event) => { setSelected(event.target.checked ? eligible.map((signup) => signup.id) : []); setPreview(false); }} />Sélectionner les inscriptions affichées</label> : null}
          <div className="space-y-1">{eligible.map((signup) => <label key={signup.id} className="flex min-h-11 min-w-0 items-center gap-2 text-sm"><input disabled={pending} checked={selectedIds.includes(signup.id)} type="checkbox" onChange={(event) => { setSelected((current) => event.target.checked ? [...new Set([...current, signup.id])] : current.filter((id) => id !== signup.id)); setPreview(false); }} /><span className="break-words">{signup.contactName} · {signup.companyName}</span></label>)}</div>
          <p className="text-sm text-muted">{selectedIds.length} inscription(s) sélectionnée(s)</p>
          <label className="block text-sm font-medium">Objet<Input className="mt-2" disabled={pending} maxLength={180} value={subject} onChange={(event) => { setSubject(event.target.value); setPreview(false); }} /></label>
          <label className="block text-sm font-medium">Message<textarea disabled={pending} className="mt-2 min-h-56 w-full rounded-md border border-border bg-panel px-4 py-3 text-sm leading-6 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10" maxLength={12000} value={body} onChange={(event) => { setBody(event.target.value); setPreview(false); }} /></label>
          <p className="text-xs text-muted">Variables : @prenom · @compagnie · @email · @lien_paiement</p>
          {preview && context ? <div className="border-y border-border py-4"><p className="text-sm"><strong>Objet :</strong> {renderBetaEmailTemplate(subject, context)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{renderBetaEmailTemplate(body, context)}</p><p className="mt-2 text-xs text-muted">Le lien affiché est un exemple. L’envoi utilise le lien configuré sur le serveur.</p></div> : null}
          <div className="flex flex-wrap gap-2"><Button disabled={pending || !context} type="button" variant="secondary" onClick={() => setPreview(true)}>Aperçu final</Button><Button disabled={!preview || pending || !payableIds.length} type="button" variant="secondary" onClick={() => run(() => sendBetaPaymentEmails({ signupIds: payableIds, subject, body }))}>Envoyer le paiement</Button><Button disabled={pending || !payableIds.length} type="button" variant="secondary" onClick={() => run(() => markBetaPaymentEmailsSent({ signupIds: payableIds }))}>Mails déjà envoyés manuellement</Button><Button disabled={pending || !inviteIds.length} type="button" variant="secondary" onClick={() => run(() => inviteBetaSignups({ signupIds: inviteIds }))}><Send aria-hidden="true" className="mr-2 h-4 w-4" />Envoyer les invitations éligibles</Button></div>
        </div>
      </details> : null}
    </>}
  </div>;
}

function BetaSignupRow({ canManage, canViewAccess, onGrant, onInvite, onConfirm, onResend, onCredit, pending, signup }: { canManage: boolean; canViewAccess: boolean; onGrant: (note: string) => void; onInvite: () => void; onConfirm: (reference: string) => void; onResend: () => void; onCredit: () => void; pending: boolean; signup: AdminBetaSignup }) {
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const eligible = !signup.isDemo && signup.status === "reserved";
  const offered = isOffered(signup);
  const canInvite = eligible && !signup.emailConfirmedAt && !signup.invitationSentAt && (signup.accessGrantedAt || signup.paymentConfirmedAt || (offered && signup.hasAccess));
  return <article className="py-5">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
      <div className="min-w-0 space-y-1">
        <h2 className="break-words text-base font-semibold">{signup.contactName}</h2>
        <p className="break-all text-sm text-muted">{signup.email}</p>
        <p className="break-words text-sm">{signup.linkedCompanyName ?? signup.companyName}{signup.linkedCompanyId ? <span className="text-muted"> · {signup.memberCount} membre{signup.memberCount > 1 ? "s" : ""}</span> : <span className="text-muted"> · espace compagnie à créer</span>}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {signup.isDemo ? <Badge tone="warning">Donnée démo</Badge> : null}
        {signup.status === "waitlist" ? <Badge tone="warning">Liste d’attente</Badge> : null}
        <Badge tone={signup.hasAccess ? "success" : "warning"}>{signup.hasAccess ? "Accès ouvert" : "Accès à activer"}</Badge>
        {offered ? <Badge tone="success">Offert{signup.compedUntil ? ` jusqu’au ${new Date(`${signup.compedUntil}T12:00:00Z`).toLocaleDateString("fr-FR")}` : " sans limite"}</Badge> : null}
        {signup.paymentConfirmedAt ? <Badge tone="neutral">Paiement confirmé</Badge> : null}
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
      <span>{signup.accountExists ? "Compte existant" : "Compte à créer"}{signup.emailConfirmedAt ? " · email confirmé" : signup.accountExists ? " · email à confirmer" : ""}</span>
      <span>{!canViewAccess ? "Connexions non visibles avec vos droits" : signup.lastSignInAt ? `Dernière connexion : ${formatDate(signup.lastSignInAt)}` : "Aucune connexion connue"}</span>
      {signup.invitationSentAt ? <span>Invitation : {formatDate(signup.invitationSentAt)}</span> : null}
    </div>
    {signup.accessGrantNote ? <p className="mt-2 break-words text-xs text-muted">Motif de l’accès offert : {signup.accessGrantNote}</p> : null}
    {signup.lastAccessError ? <p className="mt-3 break-words text-sm text-danger" role="alert">{signup.lastAccessError}</p> : null}
    {canManage && eligible ? <div className="mt-4 space-y-3">
      {!offered && !signup.accessGrantedAt && !signup.paymentConfirmedAt && signup.billingStatus !== "active" ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Input className="sm:max-w-sm" disabled={pending} aria-label={`Motif de l’accès offert pour ${signup.contactName}`} placeholder="Motif facultatif : collaboration, équipe…" maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} /><Button disabled={pending} type="button" onClick={() => onGrant(note)}><Gift aria-hidden="true" className="mr-2 h-4 w-4" />Offrir l’accès</Button></div> : null}
      {signup.accessGrantedAt && signup.linkedCompanyId && !offered ? <p className="text-sm text-muted">Un accès offert a déjà été accordé. Le statut actuel se gère depuis la supervision des compagnies.</p> : null}
      {offered && !signup.hasAccess ? <p className="text-sm text-muted">{signup.linkedCompanyId ? "La période offerte est terminée. Gérez la durée depuis la supervision des compagnies." : signup.accountExists ? "Accès offert enregistré. La compagnie sera préparée lors de sa prochaine connexion." : "Accès offert enregistré. Envoyez l’invitation pour lui permettre de choisir son mot de passe."}</p> : null}
      {canInvite ? <Button disabled={pending} type="button" variant="secondary" onClick={onInvite}><Send aria-hidden="true" className="mr-2 h-4 w-4" />Envoyer l’invitation</Button> : null}
      {signup.invitationSentAt && !signup.emailConfirmedAt ? <Button disabled={pending} type="button" variant="secondary" onClick={onResend}>Renvoyer l’invitation</Button> : null}
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Détails et autres actions</summary><div className="space-y-3 pb-2">
        <p className="break-words text-xs text-muted">Inscription #{signup.position} · {formatDate(signup.createdAt)}{signup.city ? ` · ${signup.city}` : ""}<br />{signup.discipline} — {signup.mainNeed}</p>
        {signup.paymentReference ? <p className="break-words text-xs text-muted">Référence de paiement : {signup.paymentReference}</p> : null}
        {!offered && !signup.accessGrantedAt && !signup.paymentConfirmedAt ? <div className="flex flex-col gap-2 sm:flex-row"><Input disabled={pending} aria-label={`Référence de paiement pour ${signup.contactName}`} placeholder="Référence Stripe ou note de vérification" value={reference} maxLength={240} onChange={(event) => setReference(event.target.value)} /><Button disabled={pending || reference.trim().length < 3} type="button" variant="secondary" onClick={() => onConfirm(reference)}>Confirmer le paiement</Button></div> : null}
        {signup.williamBetaCreditedAt ? <p className="text-sm text-muted">William bêta déjà crédité.</p> : <Button disabled={pending || !signup.linkedCompanyId} type="button" variant="secondary" onClick={onCredit}><Coins aria-hidden="true" className="mr-2 h-4 w-4" />Créditer William de 200 000 tokens</Button>}
      </div></details>
    </div> : null}
  </article>;
}
