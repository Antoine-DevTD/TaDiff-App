import Link from "next/link";
import { DocumentExplorer, type ExplorerFolder } from "@/components/documents/document-explorer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getCompanyDocuments,
  getPipelineDeals,
  getReminders,
  getShowDocuments,
  getShows,
} from "@/lib/supabase/queries";
import { getShowDocumentReadiness, resolveShowPosterUrl } from "@/lib/show-documents";
import type { PipelineDeal, Reminder, Show, ShowDocument } from "@/types";

type DocumentPackStatus = "to-build" | "to-update" | "ready";

type DocumentPack = {
  id: string;
  showId: string;
  showTitle: string;
  discipline: string;
  nextDate: string;
  budget: number;
  contractState: string;
  remindersCount: number;
  pipelineCount: number;
  packStatus: DocumentPackStatus;
  readinessPercent: number;
  missingCount: number;
  note: string;
};

function getStatusMeta(status: DocumentPackStatus) {
  if (status === "ready") {
    return { label: "Pret", tone: "success" as const };
  }

  if (status === "to-update") {
    return { label: "A mettre a jour", tone: "warning" as const };
  }

  return { label: "A construire", tone: "neutral" as const };
}

function resolveContractState(showId: string, deals: PipelineDeal[]) {
  const relatedDeals = deals.filter((deal) => deal.showId === showId);

  if (relatedDeals.some((deal) => deal.stage === "Confirme")) {
    return "Contrat signe";
  }

  if (relatedDeals.some((deal) => deal.stage === "Negociation")) {
    return "Contrat a valider";
  }

  if (relatedDeals.some((deal) => deal.stage === "Relance prevue")) {
    return "Contrat a preparer";
  }

  return "Pas de contrat actif";
}

function buildDocumentPacks({
  deals,
  documents,
  reminders,
  shows,
}: {
  deals: PipelineDeal[];
  documents: ShowDocument[];
  reminders: Reminder[];
  shows: Show[];
}): DocumentPack[] {
  return shows
    .map((show) => {
      const relatedDeals = deals.filter((deal) => deal.showId === show.id);
      const relatedDocuments = documents.filter((document) => document.showId === show.id);
      const readiness = getShowDocumentReadiness(relatedDocuments, {
        hasPoster: Boolean(resolveShowPosterUrl(show, relatedDocuments)),
      });
      const relatedLabels = new Set([show.title, ...relatedDeals.map((deal) => deal.title)]);
      const relatedReminders = reminders.filter((reminder) => relatedLabels.has(reminder.relatedTo));
      const contractState = resolveContractState(show.id, deals);

      const packStatus: DocumentPackStatus =
        readiness.missingCount === 0
          ? "ready"
          : relatedDocuments.length > 0 ||
              relatedReminders.length > 0 ||
              contractState !== "Pas de contrat actif"
            ? "to-update"
            : "to-build";

      return {
        id: `pack-${show.id}`,
        showId: show.id,
        showTitle: show.title,
        discipline: show.discipline,
        nextDate: show.nextDate,
        budget: show.budget,
        contractState,
        remindersCount: relatedReminders.length,
        pipelineCount: relatedDeals.length,
        packStatus,
        readinessPercent: readiness.percent,
        missingCount: readiness.missingCount,
        note:
          packStatus === "ready"
            ? "Le dossier de base est pret pour un depot ou un envoi programmeur."
            : packStatus === "to-update"
              ? "Des pieces existent deja, mais le dossier n est pas encore complet."
              : "Commencer par ajouter affiche, dossier artistique, note, budget et fiche technique.",
      };
    })
    .sort((a, b) => new Date(a.nextDate || "2999-12-31").getTime() - new Date(b.nextDate || "2999-12-31").getTime());
}

export default async function DocumentsPage() {
  const [shows, deals, reminders, documents, companyDocuments] = await Promise.all([
    getShows(),
    getPipelineDeals(),
    getReminders(),
    getShowDocuments(),
    getCompanyDocuments(),
  ]);

  const packs = buildDocumentPacks({ deals, documents, reminders, shows });

  const explorerFolders: ExplorerFolder[] = [
    ...shows
      .map((show) => ({
        id: show.id,
        label: show.title,
        detail: show.discipline,
        href: `/shows/${show.id}`,
        documents: documents
          .filter((document) => document.showId === show.id)
          .map((document) => ({
            id: document.id,
            title: document.title,
            type: document.documentType,
            fileUrl: document.fileUrl,
            date: document.updatedAt,
          })),
      }))
      .filter((folder) => folder.documents.length > 0),
    ...(companyDocuments.length > 0
      ? [
          {
            id: "company-documents",
            label: "Documents généraux",
            detail: "RIB, statuts, licence...",
            href: "/settings",
            documents: companyDocuments.map((document) => ({
              id: document.id,
              title: document.title,
              type: document.docType,
              fileUrl: document.fileUrl,
              date: document.createdAt,
            })),
          },
        ]
      : []),
  ];
  const focusPack =
    packs.find((pack) => pack.packStatus === "to-update") ??
    packs.find((pack) => pack.packStatus === "to-build") ??
    packs[0] ??
    null;

  const readyCount = packs.filter((pack) => pack.packStatus === "ready").length;
  const updateCount = packs.filter((pack) => pack.packStatus === "to-update").length;
  const buildCount = packs.filter((pack) => pack.packStatus === "to-build").length;

  return (
    <div className="space-y-6">
      {packs.length === 0 ? (
        <EmptyState
          title="Aucun dossier documentaire"
          description="Ajoutez d abord un spectacle. Les besoins documentaires remonteront ensuite ici."
          actionHref="/shows/new"
          actionLabel="Ajouter un spectacle"
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Dossiers" value={packs.length.toString()} detail="Spectacles suivis" />
            <MetricCard label="A construire" value={buildCount.toString()} detail="Base documentaire a creer" />
            <MetricCard label="A mettre a jour" value={updateCount.toString()} detail="Versions a recaler" />
            <MetricCard label="Prets" value={readyCount.toString()} detail="Dossiers stabilises" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="space-y-4 p-5" data-tour="documents-priorite">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Dossier prioritaire</p>
                  <p className="mt-2 text-xl font-semibold">
                    {focusPack?.showTitle || "Aucun dossier prioritaire"}
                  </p>
                </div>
                {focusPack ? (
                  <Badge tone={getStatusMeta(focusPack.packStatus).tone}>
                    {getStatusMeta(focusPack.packStatus).label}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted">
                {focusPack?.note ||
                  "Les futurs lots brancheront ici le vrai stockage, les PDFs, les versions et les uploads."}
              </p>
              {focusPack ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <InfoCard label="Contrat" value={focusPack.contractState} />
                  <InfoCard
                    label="Date cible"
                    value={
                      focusPack.nextDate
                        ? new Date(focusPack.nextDate).toLocaleDateString("fr-FR")
                        : "A planifier"
                    }
                  />
                  <InfoCard label="Actions" value={focusPack.remindersCount.toString()} />
                  <InfoCard label="Pieces" value={`${focusPack.readinessPercent}% pret`} />
                </div>
              ) : null}
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Acces rapides</p>
                <p className="mt-1 text-sm text-muted">
                  Le documentaire suit encore les autres modules. Les fichiers viendront ensuite.
                </p>
              </div>
              <div className="grid gap-3">
                <QuickLink
                  href="/shows"
                  title="Ouvrir les spectacles"
                  detail="Mettre a jour le contexte des dates possibles et les notes de production."
                />
                <QuickLink
                  href="/contracts"
                  title="Ouvrir les contrats"
                  detail="Verifier le statut contractuel avant de figer une version."
                />
                <QuickLink
                  href="/reminders"
                  title="Ouvrir les actions"
                  detail="Voir les rappels qui impliquent une mise a jour documentaire."
                />
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <DocumentColumn
              title="A construire"
              description="Dossiers a creer ou structurer."
              items={packs.filter((pack) => pack.packStatus === "to-build")}
            />
            <DocumentColumn
              title="A mettre a jour"
              description="Versions encore en mouvement."
              items={packs.filter((pack) => pack.packStatus === "to-update")}
            />
            <DocumentColumn
              title="Prets"
              description="Dossiers stabilises pour archivage ou envoi."
              items={packs.filter((pack) => pack.packStatus === "ready")}
            />
          </section>

          <Card className="space-y-4 p-5" data-tour="documents-explorateur">
            <div>
              <p className="text-base font-semibold">Explorateur de documents</p>
              <p className="mt-1 text-sm text-muted">
                Tous les fichiers importés, classés par spectacle (et par les documents généraux
                de la compagnie). Chaque dossier reprend le rangement réel du stockage.
              </p>
            </div>
            <DocumentExplorer folders={explorerFolders} />
          </Card>
        </>
      )}
    </div>
  );
}

function DocumentColumn({
  description,
  items,
  title,
}: {
  description: string;
  items: DocumentPack[];
  title: string;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold">{title}</p>
          <Badge tone="neutral">{items.length}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
          Aucun dossier dans cette colonne.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = getStatusMeta(item.packStatus);

            return (
              <Link
                key={item.id}
                className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                href={`/shows/${item.showId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.showTitle}</p>
                    <p className="mt-1 truncate text-sm text-muted">{item.discipline}</p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted">Contrat</p>
                    <p className="mt-1 font-medium">{item.contractState}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Date cible</p>
                    <p className="mt-1 font-medium">
                      {item.nextDate
                        ? new Date(item.nextDate).toLocaleDateString("fr-FR")
                        : "A planifier"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted">
                  <p>{item.pipelineCount} date(s) liee(s)</p>
                  <p>{item.missingCount} piece(s) manquante(s)</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${item.readinessPercent}%` }} />
                </div>
                <p className="mt-3 text-sm text-muted">{item.note}</p>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </Card>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function QuickLink({
  detail,
  href,
  title,
}: {
  detail: string;
  href: string;
  title: string;
}) {
  return (
    <Link
      className="rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
      href={href}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </Link>
  );
}
