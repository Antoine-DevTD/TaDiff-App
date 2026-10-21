"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { validPasswordResetToken, validateResetPassword } from "@/lib/password-reset-validation";

const subscribeHash = (callback: () => void) => { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); };
const snapshot = () => window.location.hash;
const serverSnapshot = () => "pending";
type State = "loading" | "ready" | "expired" | "used" | "invalid" | "error" | "changed";

export function PasswordResetEntry({ nextPath }: { nextPath: string }) {
  const hash = useSyncExternalStore(subscribeHash, snapshot, serverSnapshot);
  if (hash === "pending") return <p role="status" className="text-sm text-muted">Vérification du lien…</p>;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("recovery")) return <ResetPasswordForm nextPath={nextPath} />;
  return <ReusablePasswordResetForm key={hash} token={params.get("recovery") ?? ""} />;
}

export function ReusablePasswordResetForm({ token }: { token: string }) {
  const [state, setState] = useState<State>("loading");
  const [expiresAt, setExpiresAt] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const abort = new AbortController();
    async function inspect() {
      if (!validPasswordResetToken(token)) { setState("invalid"); return; }
      try {
        const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "inspect", token }), cache: "no-store", signal: abort.signal });
        const result = await response.json();
        if (!response.ok) throw new Error("Unavailable");
        if (["ready", "expired", "used", "invalid"].includes(result.status)) {
          setState(result.status);
          if (result.status === "ready" && typeof result.expiresAt === "string") setExpiresAt(result.expiresAt);
        } else setState("error");
      } catch { if (!abort.signal.aborted) setState("error"); }
    }
    void inspect();
    return () => abort.abort();
  }, [token, attempt]);

  useEffect(() => { if (message) messageRef.current?.focus(); }, [message]);
  useEffect(() => { if (state === "changed") successRef.current?.focus(); }, [state]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const error = validateResetPassword(password, confirmation);
    if (error) { setMessage(error); return; }
    lock.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", token, password, confirmPassword: confirmation }), cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error("Unavailable");
      if (result.status === "changed") { setPassword(""); setConfirmation(""); setState("changed"); }
      else if (["used", "expired", "invalid"].includes(result.status)) setState(result.status);
      else setMessage(result.status === "busy" ? "Un enregistrement est déjà en cours. Patientez deux minutes, puis réessayez." : result.message || "Le mot de passe n’a pas pu être enregistré. Réessayez avec ce lien.");
    } catch { setMessage("La connexion a été interrompue. Vos champs sont conservés ; vous pouvez réessayer."); }
    finally { lock.current = false; setPending(false); }
  }

  if (state === "loading") return <p role="status" className="text-sm text-muted">Vérification du lien…</p>;
  if (state === "changed") return <div className="space-y-4"><p role="status" ref={successRef} tabIndex={-1} className="rounded-md bg-success/10 p-3 text-sm text-success">Votre nouveau mot de passe est enregistré. Ce lien est désormais désactivé.</p><Link href="/login" className="inline-flex min-h-11 items-center font-medium text-accent underline">Se connecter à TaDiff</Link></div>;
  if (state !== "ready") return <div className="space-y-4">
    <p role="alert" className="text-sm text-muted">{state === "used" ? "Ce lien a été désactivé après un changement de mot de passe." : state === "expired" ? "Ce lien a expiré au bout de 7 jours." : state === "invalid" ? "Ce lien n’est pas valide. Vérifiez que vous avez copié le lien complet." : "Le lien n’a pas pu être vérifié. Réessayez dans un instant."}</p>
    {state === "error" ? <Button type="button" onClick={() => { setState("loading"); setAttempt((value) => value + 1); }}>Réessayer</Button> : null}
    <Link className="inline-flex min-h-11 items-center font-medium text-accent underline" href={state === "used" ? "/login" : "/forgot-password"}>{state === "used" ? "Se connecter" : "Demander un nouveau lien"}</Link>
  </div>;
  const expiry = expiresAt && !Number.isNaN(Date.parse(expiresAt)) ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(expiresAt)) : null;
  return <form className="space-y-4" aria-busy={pending} onSubmit={submit}>
    <p className="text-sm text-muted">{expiry ? `Ce lien est valable jusqu’au ${expiry}. ` : "Ce lien est valable 7 jours. "}Vous pouvez l’ouvrir plusieurs fois ; il sera désactivé après l’enregistrement du nouveau mot de passe.</p>
    <fieldset disabled={pending} className="space-y-4">
      <label className="block text-sm font-medium" htmlFor="reusable-password">Nouveau mot de passe<Input className="mt-2 !text-base sm:!text-sm" id="reusable-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="password-reset-help" /></label>
      <p id="password-reset-help" className="text-xs text-muted">Au moins 8 caractères.</p>
      <label className="block text-sm font-medium" htmlFor="reusable-confirmation">Confirmer le mot de passe<Input className="mt-2 !text-base sm:!text-sm" id="reusable-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <Button className="w-full" type="submit">{pending ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}</Button>
    </fieldset>
    {message ? <p ref={messageRef} tabIndex={-1} role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">{message}</p> : null}
  </form>;
}
