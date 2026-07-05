import Link from "next/link";
import { notFound } from "next/navigation";
import { ShowDocumentDeleteButton } from "@/components/documents/show-document-delete-button";
import { ShowEditDialog } from "@/components/shows/show-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDealProfitability, formatCurrency, getShowCostProfile, getVerdictMeta } from "@/lib/finance";
import {
  getDocumentStatusTone,
  getShowDocumentReadiness,
  requiredShowDocumentTypes,
} from "@/lib/show-documents";
import { getShowById } from "@/lib/supabase/queries";
import type { Show } from "@/types";

type ShowDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { id } = await params;
  const { documents, opportunities, reminders, show } = await getShowById(id);

  if (!show) {
    notFound();
  }

  const weightedRevenue = opportunities.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );
  const costProfile = getShowCostProfile(show);
  const profitabilityRows = opportunities.map((deal) => ({
    deal,
    result: buildDealProfitability({ deal, show }),
  }));
  const documentReadiness = getShowDocumentReadiness(documents);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Fiche spectacle</p>
          <h2 className="mt-2 text-3xl font-semibold">{show.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {show.notes || "Aucune note de production pour le moment."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={show.status === "En diffusion" ? "success" : "info"}>{show.status}</Badge>
          <ShowEditDialog show={show} />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBlock label="Discipline" value={show.discipline} />
        <StatBlock
          label="Prochaine date"
          value={show.nextDate ? new Date(show.nextDate).toLocaleDateString("fr-FR") : "A planifier"}
        />
        <StatBlock label="Budget" value={`${show.budget.toLocaleString("fr-FR")} EUR`} />
        <StatBlock label="CA pondere" value={`${weightedRevenue.toLocaleString("fr-FR")} EUR`} />
      </section>

      {/* Dossier & documents : affiche, avancement, checklist et pieces en un seul bloc. */}
      <Card>
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <ShowPoster show={show} />
            <div className="rounded-md border border-border bg-panel-strong/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Dossier de base</p>
                <Badge tone={documentReadiness.missingCount === 0 ? "success" : "warning"}>
                  {documentReadiness.percent}%
                </Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${documentReadiness.percent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                {documentReadiness.missingCount === 0
                  ? "Le dossier de base est pret pour un depot."
                  : `${documentReadiness.missingCount} piece(s) restent a completer. Cliquez sur Modifier pour deposer vos fichiers.`}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <CardHeader>
                <CardTitle>Pieces du dossier</CardTitle>
                <CardDescription>
                  Deposez vos fichiers via Modifier : le type est reconnu automatiquement.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {requiredShowDocumentTypes.map((type) => {
                  const document = documents.find((item) => item.documentType === type);
                  const status = document?.status ?? "Manquant";

                  return (
                    <div
                      key={type}
                      className="flex items-start justify-between gap-2 rounded-md border border-border bg-panel-strong/45 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{type}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {document?.title || "A ajouter"}
                        </p>
                      </div>
                      <Badge tone={getDocumentStatusTone(status)}>{status}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold">Fichiers lies</p>
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-panel-strong/45 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{document.title}</p>
                      <p className="text-xs text-muted">{document.documentType}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {document.fileUrl ? (
                        <a
                          className="text-sm font-medium text-accent hover:text-accent-strong"
                          href={document.fileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {document.storagePath ? "Telecharger" : "Ouvrir"}
                        </a>
                      ) : null}
                      <ShowDocumentDeleteButton documentId={document.id} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Rentabilite : structure de couts + verdict des dates dans un seul bloc. */}
      <Card>
        <CardHeader>
          <CardTitle>Rentabilite</CardTitle>
          <CardDescription>Base de couts et verdict des dates avant signature.</CardDescription>
        </CardHeader>
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold">Structure de couts</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCell label="Artistes" value={formatCurrency(costProfile.artistFees)} />
              <InfoCell label="Technique" value={formatCurrency(costProfile.technicalFees)} />
              <InfoCell label="Droits" value={formatCurrency(costProfile.rights)} />
              <InfoCell label="Production" value={formatCurrency(costProfile.production)} />
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Verdict des dates</p>
            <div className="space-y-3">
              {profitabilityRows.length === 0 ? (
                <EmptyPanel text="Aucune date a calculer." />
              ) : (
                profitabilityRows.map(({ deal, result }) => {
                  const verdict = getVerdictMeta(result.verdict);

                  return (
                    <div
                      key={deal.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-border bg-panel-strong/45 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Marge {formatCurrency(result.margin)} - point mort{" "}
                          {formatCurrency(result.breakEven)}
                        </p>
                      </div>
                      <Badge tone={verdict.tone}>{verdict.label}</Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Diffusion & relances : dates liees + relances, navigation en pied. */}
      <Card>
        <CardHeader>
          <CardTitle>Diffusion et relances</CardTitle>
          <CardDescription>Dates, negociations et actions a suivre sur ce spectacle.</CardDescription>
        </CardHeader>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Dates liees</p>
            {opportunities.length === 0 ? (
              <EmptyPanel text="Aucune date liee a ce spectacle." />
            ) : (
              opportunities.map((deal) => (
                <div
                  key={deal.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-panel-strong/45 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {deal.contactName} - {deal.contactOrganization || deal.venue}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-medium">{deal.value.toLocaleString("fr-FR")} EUR</p>
                      <p className="text-xs text-muted">{deal.probability}%</p>
                    </div>
                    <Badge tone="info">{deal.stage}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Relances</p>
            {reminders.length === 0 ? (
              <EmptyPanel text="Aucune relance ouverte." />
            ) : (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-md border border-border bg-panel-strong/45 p-3"
                >
                  <p className="text-sm font-medium">{reminder.label}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
          <Link className="font-medium text-accent hover:text-accent-strong" href="/pipeline">
            Ouvrir la diffusion
          </Link>
          <Link className="font-medium text-accent hover:text-accent-strong" href="/reminders">
            Voir les relances
          </Link>
          <ButtonLink className="ml-auto" href="/shows/new" variant="secondary">
            Nouveau spectacle
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </Card>
  );
}

function ShowPoster({ show }: { show: Show }) {
  const style = show.posterUrl
    ? { backgroundImage: `url(${show.posterUrl})` }
    : undefined;

  return (
    <div
      className="flex aspect-[4/3] items-end rounded-md bg-ink bg-cover bg-center p-5 text-white"
      style={style}
    >
      <div className="w-full rounded-md bg-ink/76 p-4 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.14em] text-white/55">Affiche spectacle</p>
        <p className="mt-2 text-xl font-semibold">{show.title}</p>
        <p className="mt-1 text-sm text-white/65">{show.discipline}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
      {text}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel-strong/45 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
