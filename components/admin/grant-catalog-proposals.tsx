"use client";

import { Building2, ExternalLink, Globe2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminReviewGrantCatalogProposal } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/finance";
import type { AdminGrantCatalogProposal } from "@/lib/supabase/admin";

export function GrantCatalogProposals({ proposals }: { proposals: AdminGrantCatalogProposal[] }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState<AdminGrantCatalogProposal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function review(proposal: AdminGrantCatalogProposal, publishGlobally: boolean) {
    startTransition(async () => {
      const result = await adminReviewGrantCatalogProposal(proposal.id, publishGlobally);
      setMessage({ ok: result.ok, text: result.message });
      if (!result.ok) return;

      setPublishing(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3" aria-labelledby="grant-proposals-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 id="grant-proposals-title" className="text-xl font-semibold">
              Propositions des compagnies
            </h3>
            {proposals.length > 0 ? <Badge tone="warning">{proposals.length} à examiner</Badge> : null}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Une aide ajoutée par une compagnie reste dans son espace. Vous décidez ici si elle doit rejoindre le catalogue commun.
          </p>
        </div>
      </div>

      {message ? (
        <p
          className={message.ok ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success" : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"}
          role={message.ok ? "status" : "alert"}
        >
          {message.text}
        </p>
      ) : null}

      <Card className="overflow-hidden p-0">
        {proposals.length === 0 ? (
          <div className="p-5 text-sm text-muted">Aucune nouvelle aide à examiner.</div>
        ) : (
          <div className="divide-y divide-border">
            {proposals.map((proposal) => (
              <article key={proposal.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-foreground">{proposal.title}</h4>
                      <Badge tone={proposal.sourceUrl ? "info" : "warning"}>
                        {proposal.sourceUrl ? "Source fournie" : "Source à vérifier"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{proposal.funder}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <Building2 aria-hidden="true" className="h-4 w-4" />
                        {proposal.companyName}
                      </span>
                      <span>{proposal.territory || "Territoire non précisé"}</span>
                      <span>{new Date(`${proposal.deadline}T12:00:00`).toLocaleDateString("fr-FR")}</span>
                      <span>{formatCurrency(proposal.amount)}</span>
                    </div>
                    {proposal.requirements.length > 0 ? (
                      <p className="mt-3 text-xs text-muted">
                        Pièces demandées : {proposal.requirements.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {proposal.sourceUrl ? (
                      <a
                        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-accent transition hover:bg-panel-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        href={proposal.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Vérifier la source <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </a>
                    ) : null}
                    <Button
                      disabled={isPending}
                      type="button"
                      variant="ghost"
                      onClick={() => review(proposal, false)}
                    >
                      Conserver pour cette compagnie
                    </Button>
                    <Button disabled={isPending} type="button" onClick={() => setPublishing(proposal)}>
                      <Globe2 aria-hidden="true" className="mr-2 h-4 w-4" />
                      Publier au catalogue commun
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={publishing !== null}
        eyebrow="Catalogue commun"
        title="Publier cette aide dans le catalogue commun ?"
        description={
          publishing
            ? `« ${publishing.title} » sera proposée aux compagnies qui ne l’ont pas retirée et intégrée aux ressources de William.`
            : "Cette aide sera publiée dans le catalogue commun."
        }
        onClose={() => setPublishing(null)}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isPending} type="button" variant="ghost" onClick={() => setPublishing(null)}>
            Annuler
          </Button>
          <Button
            disabled={isPending || publishing === null}
            type="button"
            onClick={() => publishing && review(publishing, true)}
          >
            Publier au catalogue commun
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
