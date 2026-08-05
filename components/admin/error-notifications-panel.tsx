"use client";

import { CheckCircle2, RotateCcw, TriangleAlert } from "lucide-react";
import { useTransition } from "react";
import { adminResolveErrorGroup } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminErrorGroup } from "@/lib/supabase/admin";

export function ErrorNotificationsPanel({ errors }: { errors: AdminErrorGroup[] }) {
  const [pending, startTransition] = useTransition();
  return <Card className="space-y-4 p-5"><div><h3 className="text-xl font-semibold">Erreurs regroupées</h3><p className="mt-1 text-sm text-muted">Une ligne par erreur technique. Le compteur et le nombre de compagnies évitent les doublons.</p></div>{errors.length ? <div className="space-y-3">{errors.map((error) => <article key={error.id} className="rounded-lg border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium">{error.message}</p><p className="mt-1 text-xs text-muted">{error.route || "Page inconnue"} · dernière occurrence {new Date(error.lastSeenAt).toLocaleString("fr-FR")}</p></div><div className="flex flex-wrap gap-2"><Badge tone={error.resolvedAt ? "success" : "danger"}>{error.resolvedAt ? "Corrigée" : "À corriger"}</Badge><Badge>{error.occurrenceCount} occurrence{error.occurrenceCount > 1 ? "s" : ""}</Badge><Badge>{error.companyCount} compagnie{error.companyCount > 1 ? "s" : ""}</Badge></div></div><div className="mt-4 flex justify-end"><Button disabled={pending} variant="secondary" onClick={() => startTransition(async () => { await adminResolveErrorGroup(error.id, !error.resolvedAt); })}>{error.resolvedAt ? <RotateCcw className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{error.resolvedAt ? "Rouvrir" : "Marquer corrigée"}</Button></div></article>)}</div> : <div className="rounded-md border border-dashed border-border p-6 text-center"><TriangleAlert className="mx-auto h-5 w-5 text-success" /><p className="mt-2 text-sm text-muted">Aucune erreur remontée.</p></div>}</Card>;
}
