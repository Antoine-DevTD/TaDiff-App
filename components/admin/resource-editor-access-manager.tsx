"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, ShieldCheck } from "lucide-react";
import { setResourceEditorAccess } from "@/app/(dashboard)/admin/resources/access-actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ResourceEditorAccount } from "@/types/resources";

type AccessNotice = { userId: string; canEdit: boolean; ok: boolean; message: string };

function searchable(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function accountName(account: ResourceEditorAccount) {
  return account.fullName || account.email || "Compte TaDiff";
}

export function ResourceEditorAccessManager({ accounts, error }: { accounts: ResourceEditorAccount[]; error: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editorsOnly, setEditorsOnly] = useState(false);
  const [changes, setChanges] = useState<{ source: ResourceEditorAccount[]; values: Record<string, boolean> } | null>(null);
  const [notice, setNotice] = useState<AccessNotice | null>(null);
  const [revokeUserId, setRevokeUserId] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const entries = accounts.map((account) => ({ ...account, canEdit: account.isSuperAdmin || (changes?.source === accounts ? changes.values[account.userId] ?? account.canEdit : account.canEdit) }));
  const normalizedQuery = searchable(query.trim());
  const filtered = entries.filter((account) => (!editorsOnly || account.canEdit) && (!normalizedQuery || searchable(`${account.fullName} ${account.email} ${account.companyName}`).includes(normalizedQuery)));
  const revokeTarget = entries.find((account) => account.userId === revokeUserId && !account.isSuperAdmin && account.canEdit);

  useEffect(() => { noticeRef.current?.focus(); }, [notice]);

  function save(userId: string, canEdit: boolean) {
    const account = entries.find((entry) => entry.userId === userId);
    if (inFlight.current || error || !account || account.isSuperAdmin) return;
    inFlight.current = true;
    setPendingUserId(userId);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await setResourceEditorAccess(userId, canEdit);
        setNotice({ userId, canEdit, ok: result.ok, message: result.message });
        if (result.ok) {
          setChanges((current) => ({ source: accounts, values: { ...(current?.source === accounts ? current.values : {}), [userId]: canEdit } }));
          setRevokeUserId(null);
          router.refresh();
        }
      } catch {
        setNotice({ userId, canEdit, ok: false, message: "Le droit n’a pas pu être modifié. Réessayez." });
      } finally {
        inFlight.current = false;
        setPendingUserId(null);
      }
    });
  }

  function closeConfirmation() {
    if (inFlight.current) return;
    setRevokeUserId(null);
    setNotice(null);
  }

  const feedback = notice ? <div ref={noticeRef} tabIndex={-1} role={notice.ok ? "status" : "alert"} className={`rounded-md border p-4 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${notice.ok ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
    <p>{notice.message}</p>
    {!notice.ok && !revokeTarget ? <Button type="button" variant="secondary" className="mt-3" disabled={pending} onClick={() => save(notice.userId, notice.canEdit)}>Réessayer</Button> : null}
  </div> : null;

  return <section aria-labelledby="resource-editor-access-title" className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <h3 id="resource-editor-access-title" className="text-xl font-semibold">Éditeurs de ressources</h3>
        <p className="mt-2 text-sm leading-6 text-muted">Choisissez qui peut créer, modifier, publier et archiver les pages de ressources, publiques ou réservées aux membres.</p>
        <p className="mt-2 text-sm leading-6 text-muted">Chaque personne conserve son compte, sa compagnie et son rôle dans la compagnie. Ce droit donne uniquement accès à l’édition des ressources.</p>
      </div>
      <ButtonLink href="/resources/manage" variant="secondary" className="gap-2"><ArrowUpRight aria-hidden="true" className="h-4 w-4" />Ouvrir l’éditeur</ButtonLink>
    </header>

    {error ? <div role="alert" className="rounded-md border border-danger/30 bg-panel p-5"><h4 className="font-semibold">Les comptes n’ont pas pu être chargés</h4><p className="mt-2 text-sm leading-6 text-muted">Aucun droit ne peut être modifié tant que la liste n’est pas disponible. Réessayez de la charger.</p><Button type="button" variant="secondary" className="mt-4" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Chargement…" : "Réessayer le chargement"}</Button></div> : <>
      {!revokeTarget ? feedback : null}
      {entries.length === 0 ? <div className="border-y border-border py-9"><h4 className="font-semibold">Aucun compte à afficher</h4><p className="mt-2 text-sm leading-6 text-muted">Les comptes TaDiff disponibles apparaîtront ici pour leur attribuer le droit d’édition.</p></div> : <>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 max-w-2xl flex-1 basis-72"><label htmlFor="resource-editor-account-search" className="sr-only">Rechercher un compte par nom, email ou compagnie</label><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input id="resource-editor-account-search" type="search" className="pl-10 placeholder:text-muted" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, email ou compagnie" /></div>
          <div role="group" aria-label="Filtrer les comptes" className="flex gap-2">{[{ label: "Tous", value: false }, { label: "Éditeurs", value: true }].map((filter) => <Button key={filter.label} type="button" variant={editorsOnly === filter.value ? "primary" : "secondary"} aria-pressed={editorsOnly === filter.value} onClick={() => setEditorsOnly(filter.value)}>{filter.label}</Button>)}</div>
        </div>
        <p role="status" className="text-sm text-muted">{filtered.length} {filtered.length === 1 ? "compte affiché" : "comptes affichés"}</p>
        {filtered.length === 0 ? <div className="border-y border-border py-9"><h4 className="font-semibold">Aucun compte ne correspond à ces filtres</h4><p className="mt-2 text-sm leading-6 text-muted">Essayez un autre nom, un email ou une compagnie.</p><Button type="button" variant="secondary" className="mt-4" onClick={() => { setQuery(""); setEditorsOnly(false); }}>Effacer les filtres</Button></div> : <ul className="divide-y divide-border border-y border-border">
          {filtered.map((account) => <li key={account.userId} className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4 py-5">
            <div className="min-w-0 flex-1 basis-60"><h4 className="font-semibold">{accountName(account)}</h4>{account.fullName && account.email ? <p className="mt-1 text-sm leading-6 text-muted">{account.email}</p> : null}<p className="mt-1 text-sm leading-6 text-muted">{account.companyName || "Sans compagnie"}</p></div>
            <div className="flex min-w-0 flex-1 basis-64 flex-wrap items-center justify-between gap-3 sm:flex-none sm:justify-end sm:gap-5">
              <span className={`inline-flex items-center gap-2 text-sm ${account.canEdit ? "font-medium text-accent" : "text-muted"}`}>{account.isSuperAdmin ? <><ShieldCheck aria-hidden="true" className="h-4 w-4" />Accès permanent</> : account.canEdit ? "Éditeur de ressources" : "Sans droit d’édition"}</span>
              {account.isSuperAdmin ? <span className="text-xs text-muted">Superadministrateur</span> : account.canEdit ? <Button type="button" variant="secondary" disabled={pending} onClick={() => { setNotice(null); setRevokeUserId(account.userId); }}>Retirer le droit<span className="sr-only"> à {accountName(account)}</span></Button> : <Button type="button" variant="secondary" disabled={pending} onClick={() => save(account.userId, true)}>{pendingUserId === account.userId ? "Enregistrement…" : "Autoriser l’édition"}<span className="sr-only"> pour {accountName(account)}</span></Button>}
            </div>
          </li>)}
        </ul>}
      </>}
    </>}

    <Dialog open={Boolean(revokeTarget)} title="Retirer le droit d’édition ?" description={revokeTarget ? `${accountName(revokeTarget)} ne pourra plus créer, modifier, publier ni archiver de pages de ressources.` : ""} onClose={closeConfirmation} className="max-w-lg">
      <div className="space-y-5"><p className="text-sm leading-6 text-muted">Son compte et son espace compagnie restent inchangés. Les pages déjà créées sont conservées. Vous pourrez réattribuer ce droit plus tard.</p>{revokeTarget ? feedback : null}<div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="secondary" disabled={pending} onClick={closeConfirmation}>Annuler</Button><Button type="button" disabled={pending || !revokeTarget} onClick={() => revokeTarget && save(revokeTarget.userId, false)}>{pending ? "Enregistrement…" : notice && !notice.ok ? "Réessayer le retrait" : "Retirer le droit d’édition"}</Button></div></div>
    </Dialog>
  </section>;
}
