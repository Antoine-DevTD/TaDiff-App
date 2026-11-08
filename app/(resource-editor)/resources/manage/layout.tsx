import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, UsersRound } from "lucide-react";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { hasSupabaseEnv } from "@/lib/env";
import { canEditResources } from "@/lib/resources-server";
import { isSuperAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Éditeur de ressources", robots: { index: false, follow: false } };

export default async function ResourceEditorLayout({ children }: { children: ReactNode }) {
  const [canEdit, canManageAccess] = await Promise.all([canEditResources(), isSuperAdmin()]);
  if (hasSupabaseEnv() && !canEdit) notFound();
  const back = canManageAccess ? "/admin?tab=ressources" : "/dashboard";
  return <div className="min-h-screen bg-background text-foreground">
    <a href="#resource-editor-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ink focus:p-3 focus:text-white">Aller à l’éditeur</a>
    <header className="border-b border-border bg-panel">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href={back} className="inline-flex min-h-11 items-center gap-3 rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><TadiffMark className="size-7" /><span>TaDiff <span className="ml-1 font-normal text-muted">/ Ressources</span></span></Link>
        <nav aria-label="Navigation de l’éditeur" className="flex flex-wrap items-center gap-1 text-sm">
          <Link href={back} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 hover:bg-panel-strong focus-visible:outline-2 focus-visible:outline-accent"><ArrowLeft className="size-4" aria-hidden />{canManageAccess ? "Administration" : "Mon espace compagnie"}</Link>
          <Link href="/ressources" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 hover:bg-panel-strong focus-visible:outline-2 focus-visible:outline-accent"><BookOpen className="size-4" aria-hidden />Voir les pages publiques<span className="sr-only"> (nouvel onglet)</span></Link>
          {canManageAccess ? <Link href="/admin?tab=ressources" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 font-medium hover:bg-panel-strong focus-visible:outline-2 focus-visible:outline-accent"><UsersRound className="size-4" aria-hidden />Gérer les éditeurs</Link> : null}
        </nav>
      </div>
    </header>
    <main id="resource-editor-main" tabIndex={-1} className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
  </div>;
}
