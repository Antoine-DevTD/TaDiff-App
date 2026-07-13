"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Settings } from "lucide-react";
import { ShowForm } from "@/components/forms/show-form";
import { Dialog } from "@/components/ui/dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AccountMenu({ initials = "TD" }: { initials?: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  async function signOut() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await getSupabaseBrowserClient().auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Menu du compte"
        onClick={() => setMenuOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white transition hover:bg-accent-strong"
      >
        {initials}
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
            onClick={signOut}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </div>
      ) : null}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        eyebrow="Catalogue"
        title="Nouveau spectacle"
        description="Ajoutez une creation au catalogue des spectacles."
      >
        <ShowForm onSuccess={() => setCreateOpen(false)} />
      </Dialog>
    </div>
  );
}
