"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { LogOut, Plus, Settings } from "lucide-react";
import { signOutAction } from "@/app/auth/sign-out/actions";
import { TadiffMark } from "@/components/brand/tadiff-mark";

const AccountShowDialog = dynamic(
  () => import("@/components/layout/account-show-dialog").then((module) => module.AccountShowDialog),
  { ssr: false },
);

export function AccountMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Menu du compte"
        onClick={() => setMenuOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-[#1d1d1f] shadow-sm shadow-ink/10 transition hover:scale-[1.03]"
      >
        <TadiffMark className="h-full w-full rounded-full" />
      </button>

      {menuOpen ? (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-lg border border-border bg-panel shadow-xl shadow-ink/20">
          <p className="border-b border-border px-4 py-2 text-xs uppercase tracking-[0.14em] text-muted">
            Mon compte
          </p>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-panel-strong"
          >
            <Settings className="h-4 w-4 text-muted" aria-hidden />
            Paramètres compagnie
          </Link>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setCreateOpen(true);
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-panel-strong"
          >
            <Plus className="h-4 w-4 text-muted" aria-hidden />
            Ajouter un spectacle
          </button>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={() => startSignOut(() => signOutAction())}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </div>
      ) : null}

      {createOpen ? <AccountShowDialog onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}
