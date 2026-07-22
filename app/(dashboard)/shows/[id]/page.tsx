import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { DocumentSlot } from "@/components/documents/document-slot";
import { DocumentDropzone } from "@/components/documents/document-dropzone";
import { ShowDocumentsDownloadButton } from "@/components/documents/show-documents-download-button";
import { UnclassifiedDocuments } from "@/components/documents/unclassified-documents";
import { ShowEditDialog } from "@/components/shows/show-edit-dialog";
import { ShowBudgetWorkspace } from "@/components/shows/show-budget-workspace";
import { ShowEmailProfileForm } from "@/components/shows/show-email-profile-form";
import { ShowActionsPanel } from "@/components/shows/show-actions-panel";
import { ShowWorkspaceDocuments } from "@/components/shows/show-workspace-documents";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import {
  essentialShowDocumentTypes,
  getShowDocumentReadiness,
  isShowOwnedDocumentType,
  optionalShowDocumentTypes,
  resolveShowPosterUrl,
} from "@/lib/show-documents";
import { getContacts, getShowById, getShowDocuments, getShowWorkDocuments, getShows } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import type { Show } from "@/types";

type ShowTab = "overview" | "presentation" | "files" | "workspace" | "dates" | "budget";

type ShowDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const baseShowTabs: Array<{ id: ShowTab; label: string }> = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "presentation", label: "Presentation" },
  { id: "files", label: "Dossier" },
  { id: "workspace", label: "Documents de travail" },
  { id: "dates", label: "Dates" },
];

function resolveTab(value: string | undefined, tabs: Array<{ id: ShowTab }>): ShowTab {
  return tabs.some((tab) => tab.id === value) ? (value as ShowTab) : "overview";
}

export default async function ShowDetailPage({ params, searchParams }: ShowDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [showDetail, contacts, allShows, catalogueDocuments, workDocuments] = await Promise.all([
    getShowById(id),
    getContacts(),
    getShows(),
    getShowDocuments(),
    getShowWorkDocuments(id),
  ]);
  const { budgetItems, budgetProfile, documents: allDocuments, opportunities, reminders, show } = showDetail;

  if (!show) notFound();

  const documents = allDocuments.filter((document) =>
    isShowOwnedDocumentType(document.documentType),
  );

  const showTabs = show.detailedBudgetEnabled
    ? [...baseShowTabs, { id: "budget" as const, label: "Budget" }]
    : baseShowTabs;
  const activeTab = resolveTab(query.tab, showTabs);
  const weightedRevenue = opportunities.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );
  const posterUrl = resolveShowPosterUrl(show, documents);
  const showsWithPosters = allShows.map((item) => ({
    ...item,
    posterUrl: resolveShowPosterUrl(
      item,
      catalogueDocuments.filter((document) => document.showId === item.id),
    ),
  }));
  const documentReadiness = getShowDocumentReadiness(documents, { hasPoster: Boolean(posterUrl) });
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
          {show.captureUrl ? (
            <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-medium hover:border-accent/40 hover:text-accent" href={show.captureUrl} rel="noreferrer" target="_blank">
              Voir la captation <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
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
              "relative shrink-0 px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:bg-accent/10 focus-visible:text-foreground focus-visible:outline-none",
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

      {activeTab === "presentation" ? <ShowEmailProfileForm documents={documents} show={show} /> : null}

      {activeTab === "workspace" ? (
        <Card className="p-5">
          <ShowWorkspaceDocuments documents={workDocuments.documents} folders={workDocuments.folders} showId={show.id} />
        </Card>
      ) : null}

      {activeTab === "files" ? (
        <Card>
          <div className={cn("grid gap-6", posterUrl && "xl:grid-cols-[0.72fr_1.28fr]")}>
            <div className="space-y-4">
              <ShowPoster posterUrl={posterUrl} show={show} />
              {documentReadiness.missingCount > 0 ? (
                <ReadinessPanel
                  missingCount={documentReadiness.missingCount}
                  percent={documentReadiness.percent}
                />
              ) : null}
            </div>

            <div className="space-y-6">
              <section>
                <div className="flex items-start justify-between gap-4">
                  <CardHeader className="min-w-0">
                    <CardTitle>Pièces indispensables</CardTitle>
                    <CardDescription>Les pièces nécessaires pour vendre et déposer le spectacle.</CardDescription>
                  </CardHeader>
                  <ShowDocumentsDownloadButton documents={documents} showTitle={show.title} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {essentialShowDocumentTypes.map((type) => {
                    const document = documents.find((item) => item.documentType === type);
                    const usesExistingPoster = type === "Affiche" && Boolean(posterUrl);
                    const status = document?.status ?? (usesExistingPoster ? "Pret" : "Manquant");

                    return (
                      <DocumentSlot
                        key={type}
                        documentId={document?.id}
                        fileUrl={document?.fileUrl}
                        previewUrl={document?.previewUrl}
                        showId={show.id}
                        showTitle={show.title}
                        type={type}
                        title={document?.title ?? (usesExistingPoster ? "Affiche spectacle" : null)}
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
                        documentId={document?.id}
                        fileUrl={document?.fileUrl}
                        previewUrl={document?.previewUrl}
                        showId={show.id}
                        showTitle={show.title}
                        type={type}
                        title={document?.title ?? null}
                        status={document?.status ?? "Manquant"}
                      />
                    );
                  })}
                </div>
              </section>

              <UnclassifiedDocuments
                documents={documents.filter((document) => document.documentType === "A renseigner")}
                showId={show.id}
              />

              <section className="border-t border-border pt-6">
                <CardHeader>
                  <CardTitle>Deposer plusieurs fichiers</CardTitle>
                  <CardDescription>
                    Glissez toutes les pieces du spectacle. TaDiff propose leur type avant de les ajouter au dossier.
                  </CardDescription>
                </CardHeader>
                <DocumentDropzone showId={show.id} showTitle={show.title} />
              </section>
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
                      <Badge tone={getOpportunityStageTone(deal.stage)}>{deal.stage}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </section>

            <ShowActionsPanel
              contacts={contacts}
              currentShowId={show.id}
              initialReminders={reminders}
              shows={showsWithPosters}
            />
          </div>
        </Card>
      ) : null}

      {activeTab === "budget" && show.detailedBudgetEnabled ? (
        <section aria-labelledby="detailed-budget-title" className="space-y-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Budget du spectacle</p>
            <h3 id="detailed-budget-title" className="mt-2 text-2xl font-semibold">Construire le budget réel du spectacle</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Équipe, répétitions, scénographie, droits et exploitation : TaDiff transforme vos hypothèses en coût plateau, prix de cession et seuil de rentabilité.
            </p>
          </div>
          <ShowBudgetWorkspace
            initialItems={budgetItems}
            initialProfile={budgetProfile}
            showId={show.id}
            simpleBudget={show.budget}
            weightedPipelineRevenue={weightedRevenue}
          />
        </section>
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
    <div className={cn("grid gap-6", posterUrl && "xl:grid-cols-[0.8fr_1.2fr]")}>
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
              <p className="mt-2 text-xl font-semibold">{documentMissingCount === 0 ? "Prêt à déposer" : `${documentMissingCount} pièce(s) à compléter`}</p>
            </div>
            <Badge tone={documentMissingCount === 0 ? "success" : "warning"}>{documentPercent}%</Badge>
          </div>
          {documentMissingCount > 0 ? (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-accent" style={{ width: `${documentPercent}%` }} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {documentMissingCount > 0 ? (
              <ButtonLink href={`/shows/${show.id}?tab=files`}>Compléter le dossier</ButtonLink>
            ) : null}
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
  if (!posterUrl) return null;

  return (
    <div className="flex aspect-[4/3] items-end bg-cover bg-center p-5 text-white" style={{ backgroundImage: `url(${posterUrl})` }}>
      <div className="w-full bg-ink/80 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Affiche spectacle</p>
        <p className="mt-2 text-xl font-semibold">{show.title}</p>
        <p className="mt-1 text-sm text-white/65">{show.discipline}</p>
      </div>
    </div>
  );
}

function getOpportunityStageTone(stage: string) {
  if (stage === "Confirme") return "success" as const;
  if (stage === "Relance prevue") return "warning" as const;
  if (stage === "Perdu") return "danger" as const;
  return "info" as const;
}

function ActionPanel({ href, text }: { href: string; text: string }) {
  return (
    <Link className="block border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted transition-colors hover:border-accent/45 hover:bg-panel-strong hover:text-foreground" href={href}>
      {text}
    </Link>
  );
}
