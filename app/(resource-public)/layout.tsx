import Link from "next/link";
import type { ReactNode } from "react";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResourcePublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-panel text-foreground">
    <a href="#resource-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel focus:p-3 focus:text-accent focus:outline-2">Aller au contenu</a>
    <header className="border-b border-border"><div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8"><Link href="/" aria-label="TaDiff, accueil" className="flex min-h-11 items-center gap-2 rounded-sm text-2xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-accent"><TadiffMark className="h-7 w-7" />TaDiff</Link><nav aria-label="Navigation principale" className="flex flex-wrap items-center gap-3 sm:gap-7"><Link href="/ressources" className="inline-flex min-h-11 items-center border-b-2 border-accent text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent">Ressources</Link><ButtonLink href="/login" variant="secondary">Se connecter</ButtonLink></nav></div></header>
    <main id="resource-main" className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">{children}</main>
    <footer className="mx-auto max-w-7xl border-t border-border px-4 py-6 text-sm text-muted sm:px-8"><Link href="/" className="inline-flex min-h-11 items-center hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">TaDiff — le cockpit des compagnies de spectacle vivant</Link></footer>
  </div>;
}
