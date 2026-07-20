import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DocumentSlot } from "@/components/documents/document-slot";
import { ShowDocumentDeleteButton } from "@/components/documents/show-document-delete-button";
import { ShowEditDialog } from "@/components/shows/show-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDealProfitability, formatCurrency, getShowCostProfile, getVerdictMeta } from "@/lib/finance";
import {
  essentialShowDocumentTypes,
  getShowDocumentReadiness,
  getShowDocumentTypeLabel,
  isEssentialShowDocumentType,
  isShowOwnedDocumentType,
  optionalShowDocumentTypes,
  resolveShowPosterUrl,
} from "@/lib/show-documents";
import { getShowById } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import type { Show } from "@/types";

type ShowTab = "overview" | "files" | "dates" | "budget";

type ShowDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const showTabs: Array<{ id: ShowTab; label: string }> = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "files", label: "Dossier" },
  { id: "dates", label: "Dates" },
  { id: "budget", label: "Budget" },
];

function resolveTab(value: string | undefined): ShowTab {
  return showTabs.some((tab) => tab.id === value) ? (value as ShowTab) : "overview";
}

export default async function ShowDetailPage({ params, searchParams }: ShowDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { documents: allDocuments, opportunities, reminders, show } = await getShowById(id);

  if (!show) notFound();

  const documents = allDocuments.filter((document) =>
    isShowOwnedDocumentType(document.documentType),
  );

  const activeTab = resolveTab(query.tab);
  const weightedRevenue = opportunities.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );
  const costProfile = getShowCostProfile(show);
  const profitabilityRows = opportunities.map((deal) => ({
    deal,
    result: buildDealProfitability({ deal, show }),
  }));
  const posterUrl = resolveShowPosterUrl(show, documents);
  const documentReadiness = getShowDocumentReadiness(documents, { hasPoster: Boolean(posterUrl) });
  const linkedOptionalDocuments = documents.filter(
    (document) => !isEssentialShowDocumentType(document.documentType),
  );
  const nextPerformanceDate = opportunities
    .map((deal) => deal.performanceDate)
    .filter(Boolean)
    .sort()[0];
  const nextDate = nextPerformanceDate || show.nextDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <Link
            className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            href="/shows"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Tous les spectacles
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Fiche spectacle</p>
          <h2 className="mt-2 truncate text-3xl font-semibold">{show.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted text-pretty">
            {show.notes || "Aucune note de production pour le moment."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Badge tone={show.status === "En diffusion" ? "success" : "info"}>{show.status}</Badge>
          <ShowEditDialog show={show} />
        </div>
      </div>

      <nav aria-label="Rubriques du spectacle" className="flex gap-1 overflow-x-auto border-b border-border">
        {showTabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/shows/${show.id}?tab=${tab.id}`}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-200",
              activeTab === tab.id && "text-accent after:scale-x-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <OverviewTab
          documentMissingCount={documentReadiness.missingCount}
          documentPercent={documentReadiness.percent}
          nextDate={nextDate}
          opportunityCount={opportunities.length}
          posterUrl={posterUrl}
          reminderCount={reminders.length}
          show={show}
          weightedRevenue={weightedRevenue}
        />
      ) : null}

      {activeTab === "files" ? (
        <Card>
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-4">
              <ShowPoster posterUrl={posterUrl} show={show} />
              <ReadinessPanel
                missingCount={documentReadiness.missingCount}
                percent={documentReadiness.percent}
              />
            </div>

            <div className="space-y-6">
              <section>
                <CardHeader>
                  <CardTitle>Pieces indispensables</CardTitle>
                  <CardDescription>Les pieces necessaires pour vendre et deposer le spectacle.</CardDescription>
                </CardHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  {essentialShowDocumentTypes.map((type) => {
                    const document = documents.find((item) => item.documentType === type);
                    const usesExistingPoster = type === "Affiche" && Boolean(posterUrl);
                    const status = document?.status ?? (usesExistingPoster ? "Pret" : "Manquant");

                    return (
                      <DocumentSlot
                        key={type}
                        showId={show.id}
                        showTitle={show.title}
                        type={type}
                        title={document?.title ?? (usesExistingPoster ? "Affiche spectacle" : null)}
                        requirementLabel="Obligatoire"
                        status={status}
                      />
                    );
                  })}
                </div>
              </section>

              <section className="border-t border-border pt-6">
                <CardHeader>
                  <CardTitle>Documents facultatifs</CardTitle>
                  <CardDescription>Devis, budget et autres pieces propres a ce spectacle.</CardDescription>
                </CardHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  {optionalShowDocumentTypes.map((type) => {
                    const document = documents.find((item) => item.documentType === type);

                    return (
                      <DocumentSlot
                        key={type}
                        showId={show.id}
                        showTitle={show.title}
                        type={type}
                        title={document?.title ?? null}
                        requirementLabel="Facultatif"
                        status={document?.status ?? "Manquant"}
                      />
                    );
                  })}
                </div>
                {linkedOptionalDocuments.length > 0 ? (
                  <p className="mt-3 text-xs text-muted">
                    {linkedOptionalDocuments.length} document(s) facultatif(s) rattache(s) au spectacle.
                  </p>
                ) : null}
              </section>

              {documents.length > 0 ? (
                <section className="space-y-3 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold">Tous les fichiers</h3>
                  {documents.map((document) => (
                    <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{document.title}</p>
                        <p className="text-xs text-muted">{getShowDocumentTypeLabel(document.documentType)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {document.fileUrl ? (
                          <a className="text-sm font-medium text-accent hover:text-accent-strong" href={document.fileUrl} rel="noreferrer" target="_blank">
                            {document.storagePath ? "Telecharger" : "Ouvrir"}
                          </a>
                        ) : null}
                        <ShowDocumentDeleteButton documentId={document.id} />
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "dates" ? (
        <Card>
          <CardHeader>
            <CardTitle>Dates et prochaines actions</CardTitle>
            <CardDescription>Les propositions commerciales et les actions rattachees a ce spectacle.</CardDescription>
          </CardHeader>
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Dates a vendre</h3>
                <ButtonLink href="/pipeline" variant="secondary">Ouvrir la diffusion</ButtonLink>
              </div>
              {opportunities.length === 0 ? (
                <ActionPanel href="/pipeline" text="Aucune date liee. Ajoutez une proposition depuis la rubrique Diffuser." />
              ) : (
                opportunities.map((deal) => (
                  <Link key={deal.id} className="flex flex-col gap-3 border-b border-border py-4 transition-colors hover:text-accent sm:flex-row sm:items-center sm:justify-between" href="/pipeline">
                    <div>
                      <p className="text-sm font-medium">{deal.title}</p>
                      <p className="mt-1 text-xs text-muted">{deal.contactName} - {deal.contactOrganization || deal.venue}</p>
                      <p className="mt-1 text-xs text-muted">Representation : {deal.performanceDate ? new Date(deal.performanceDate).toLocaleDateString("fr-FR") : "date a caler"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="font-medium">{formatCurrency(deal.value)}</p>
                        <p className="text-xs text-muted">{deal.probability}% estime</p>
                      </div>
                      <Badge tone="info">{deal.stage}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Actions a faire</h3>
                <Link className="text-sm font-medium text-accent hover:text-accent-strong" href="/reminders">Toutes les actions</Link>
              </div>
              {reminders.length === 0 ? (
                <ActionPanel href="/reminders" text="Aucune action ouverte pour ce spectacle." />
              ) : (
                reminders.map((reminder) => (
                  <Link key={reminder.id} className="block border-b border-border py-4 transition-colors hover:text-accent" href="/reminders">
                    <p className="text-sm font-medium">{reminder.label}</p>
                    <p className="mt-1 text-xs text-muted">{new Date(reminder.dueDate).toLocaleDateString("fr-FR")}</p>
                  </Link>
                ))
              )}
            </section>
          </div>
        </Card>
      ) : null}

      {activeTab === "budget" ? (
        <Card>
          <CardHeader>
            <CardTitle>Rentabilite du spectacle</CardTitle>
            <CardDescription>Base de couts et verdict de chaque date avant signature.</CardDescription>
          </CardHeader>
          <div className="grid gap-8 xl:grid-cols-2">
            <section>
              <h3 className="mb-3 text-sm font-semibold">Structure de couts</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCell label="Artistes" value={formatCurrency(costProfile.artistFees)} />
                <InfoCell label="Technique" value={formatCurrency(costProfile.technicalFees)} />
                <InfoCell label="Droits" value={formatCurrency(costProfile.rights)} />
                <InfoCell label="Production" value={formatCurrency(costProfile.production)} />
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Budget de creation</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(show.budget)}</p>
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-semibold">Verdict des dates</h3>
              <div className="space-y-3">
                {profitabilityRows.length === 0 ? (
                  <EmptyPanel text="Aucune date a calculer." />
                ) : (
                  profitabilityRows.map(({ deal, result }) => {
                    const verdict = getVerdictMeta(result.verdict);

                    return (
                      <div key={deal.id} className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium">{deal.title}</p>
                          <p className="mt-1 text-xs text-muted">Marge {formatCurrency(result.margin)} - point mort {formatCurrency(result.breakEven)}</p>
                        </div>
                        <Badge tone={verdict.tone}>{verdict.label}</Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function OverviewTab({
  documentMissingCount,
  documentPercent,
  nextDate,
  opportunityCount,
  posterUrl,
  reminderCount,
  show,
  weightedRevenue,
}: {
  documentMissingCount: number;
  documentPercent: number;
  nextDate: string | null;
  opportunityCount: number;
  posterUrl: string;
  reminderCount: number;
  show: Show;
  weightedRevenue: number;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <ShowPoster posterUrl={posterUrl} show={show} />
      <div className="space-y-6">
        <section className="grid border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-border">
          <OverviewMetric label="Prochaine representation" value={nextDate ? new Date(nextDate).toLocaleDateString("fr-FR") : "A planifier"} />
          <OverviewMetric label="Chiffre d'affaires pondere" value={formatCurrency(weightedRevenue)} />
          <OverviewMetric label="Dates en discussion" value={`${opportunityCount}`} />
          <OverviewMetric label="Actions ouvertes" value={`${reminderCount}`} />
        </section>

        <section className="border border-border bg-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Dossier indispensable</p>
              <p className="mt-2 text-xl font-semibold">{documentMissingCount === 0 ? "Pret a deposer" : `${documentMissingCount} piece(s) a completer`}</p>
            </div>
            <Badge tone={documentMissingCount === 0 ? "success" : "warning"}>{documentPercent}%</Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent" style={{ width: `${documentPercent}%` }} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={`/shows/${show.id}?tab=files`}>Completer le dossier</ButtonLink>
            <ButtonLink href={`/shows/${show.id}?tab=dates`} variant="secondary">Voir les dates</ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border p-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ReadinessPanel({ missingCount, percent }: { missingCount: number; percent: number }) {
  return (
    <div className="border border-border bg-panel-strong/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Dossier indispensable</p>
        <Badge tone={missingCount === 0 ? "success" : "warning"}>{percent}%</Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-muted">
        {missingCount === 0 ? "Le dossier est pret pour un depot." : `${missingCount} piece(s) indispensable(s) restent a completer.`}
      </p>
    </div>
  );
}

function ShowPoster({ posterUrl, show }: { posterUrl: string; show: Show }) {
  return (
    <div className="flex aspect-[4/3] items-end bg-ink bg-cover bg-center p-5 text-white" style={posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined}>
      <div className="w-full bg-ink/80 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Affiche spectacle</p>
        <p className="mt-2 text-xl font-semibold">{show.title}</p>
        <p className="mt-1 text-sm text-white/65">{show.discipline}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">{text}</div>;
}

function ActionPanel({ href, text }: { href: string; text: string }) {
  return (
    <Link className="block border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted transition-colors hover:border-accent/45 hover:bg-panel-strong hover:text-foreground" href={href}>
      {text}
    </Link>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-panel-strong/45 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
