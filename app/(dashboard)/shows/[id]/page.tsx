import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentSlot } from "@/components/documents/document-slot";
import { ShowDocumentDeleteButton } from "@/components/documents/show-document-delete-button";
import { ShowEditDialog } from "@/components/shows/show-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDealProfitability, formatCurrency, getShowCostProfile, getVerdictMeta } from "@/lib/finance";
import {
  essentialShowDocumentTypes,
  getShowDocumentReadiness,
  getShowDocumentTypeLabel,
  isEssentialShowDocumentType,
  optionalShowDocumentTypes,
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
  const linkedOptionalDocuments = documents.filter(
    (document) => !isEssentialShowDocumentType(document.documentType),
  );
  const nextPerformanceDate = opportunities
    .map((deal) => deal.performanceDate)
    .filter(Boolean)
    .sort()[0];

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
          value={
            nextPerformanceDate || show.nextDate
              ? new Date(nextPerformanceDate || show.nextDate).toLocaleDateString("fr-FR")
              : "A planifier"
          }
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
                <p className="font-medium">Dossier indispensable</p>
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
                  ? "Le dossier indispensable est pret pour un depot."
                  : `${documentReadiness.missingCount} piece(s) indispensable(s) restent a completer. Les documents facultatifs peuvent etre ajoutes ensuite.`}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <CardHeader>
                <CardTitle>Pieces indispensables</CardTitle>
                <CardDescription>
                  Les pieces qui comptent dans le dossier de base du spectacle.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {essentialShowDocumentTypes.map((type) => {
                  const document = documents.find((item) => item.documentType === type);
                  const status = document?.status ?? "Manquant";

                  return (
                    <DocumentSlot
                      key={type}
                      showId={show.id}
                      showTitle={show.title}
                      type={type}
                      title={document?.title ?? null}
                      requirementLabel="Obligatoire"
                      status={status}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <CardHeader>
                <CardTitle>Documents facultatifs</CardTitle>
                <CardDescription>
                  Ajoutez ce qui aide la vente ou les dossiers : devis, budget, RIB, statuts ou
                  autres pieces utiles.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {optionalShowDocumentTypes.map((type) => {
                  const document = documents.find((item) => item.documentType === type);
                  const status = document?.status ?? "Manquant";

                  return (
                    <DocumentSlot
                      key={type}
                      showId={show.id}
                      showTitle={show.title}
                      type={type}
                      title={document?.title ?? null}
                      requirementLabel="Facultatif"
                      status={status}
                    />
                  );
                })}
              </div>
              {linkedOptionalDocuments.length > 0 ? (
                <p className="mt-3 text-xs text-muted">
                  {linkedOptionalDocuments.length} document(s) facultatif(s) deja rattache(s) au
                  spectacle.
                </p>
              ) : null}
            </div>

            {documents.length > 0 ? (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold">Fichiers liés</p>
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-panel-strong/45 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{document.title}</p>
                      <p className="text-xs text-muted">
                        {getShowDocumentTypeLabel(document.documentType)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {document.fileUrl ? (
                        <a
                          className="text-sm font-medium text-accent hover:text-accent-strong"
                          href={document.fileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {document.storagePath ? "Télécharger" : "Ouvrir"}
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
          <CardTitle>Rentabilité</CardTitle>
          <CardDescription>Base de coûts et verdict des dates avant signature.</CardDescription>
        </CardHeader>
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold">Structure de coûts</p>
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
                <EmptyPanel text="Aucune date à calculer." />
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
          <CardDescription>Dates, négociations et actions à suivre sur ce spectacle.</CardDescription>
        </CardHeader>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <Link className="text-sm font-semibold hover:text-accent" href="/pipeline">
              Dates liees
            </Link>
            {opportunities.length === 0 ? (
              <ActionPanel href="/pipeline" text="Aucune date liee a ce spectacle. Ajouter ou associer une date dans la diffusion." />
            ) : (
              opportunities.map((deal) => (
                <Link
                  key={deal.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-panel-strong/45 p-3 transition hover:border-accent/40 hover:bg-panel-strong sm:flex-row sm:items-center sm:justify-between"
                  href="/pipeline"
                >
                  <div>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {deal.contactName} - {deal.contactOrganization || deal.venue}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Jeu :{" "}
                      {deal.performanceDate
                        ? new Date(deal.performanceDate).toLocaleDateString("fr-FR")
                        : "date a caler"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-medium">{deal.value.toLocaleString("fr-FR")} EUR</p>
                      <p className="text-xs text-muted">{deal.probability}%</p>
                    </div>
                    <Badge tone="info">{deal.stage}</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="space-y-3">
            <Link className="text-sm font-semibold hover:text-accent" href="/reminders">
              Relances
            </Link>
            {reminders.length === 0 ? (
              <ActionPanel href="/reminders" text="Aucune relance ouverte. Voir ou creer les relances liees a ce spectacle." />
            ) : (
              reminders.map((reminder) => (
                <Link
                  key={reminder.id}
                  className="block rounded-md border border-border bg-panel-strong/45 p-3 transition hover:border-accent/40 hover:bg-panel-strong"
                  href="/reminders"
                >
                  <p className="text-sm font-medium">{reminder.label}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
                  </p>
                </Link>
              ))
            )}
          </div>
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

function ActionPanel({ href, text }: { href: string; text: string }) {
  return (
    <Link
      className="block rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted transition hover:border-accent/45 hover:bg-panel-strong hover:text-foreground"
      href={href}
    >
      {text}
    </Link>
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
