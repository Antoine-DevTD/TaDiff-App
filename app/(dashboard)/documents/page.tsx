import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPipelineDeals, getReminders, getShows } from "@/lib/supabase/queries";
import type { PipelineDeal, Reminder, Show } from "@/types";

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
  reminders,
  shows,
}: {
  deals: PipelineDeal[];
  reminders: Reminder[];
  shows: Show[];
}): DocumentPack[] {
  return shows
    .map((show) => {
      const relatedDeals = deals.filter((deal) => deal.showId === show.id);
      const relatedLabels = new Set([show.title, ...relatedDeals.map((deal) => deal.title)]);
      const relatedReminders = reminders.filter((reminder) => relatedLabels.has(reminder.relatedTo));
      const contractState = resolveContractState(show.id, deals);

      const packStatus: DocumentPackStatus =
        show.notes && contractState === "Contrat signe"
          ? "ready"
          : relatedReminders.length > 0 || contractState !== "Pas de contrat actif"
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
        note:
          packStatus === "ready"
            ? "Le dossier peut etre consolide et archive avec ses pieces finales."
            : packStatus === "to-update"
              ? "Des elements bougent encore. Gardez les versions de diffusion, contrat et fiche technique alignees."
              : "Commencer par preparer un dossier de diffusion et une base technique simple.",
      };
    })
    .sort((a, b) => new Date(a.nextDate || "2999-12-31").getTime() - new Date(b.nextDate || "2999-12-31").getTime());
}

export default async function DocumentsPage() {
  const [shows, deals, reminders] = await Promise.all([
    getShows(),
    getPipelineDeals(),
    getReminders(),
  ]);

  const packs = buildDocumentPacks({ deals, reminders, shows });
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
      <div>
        <h2 className="text-2xl font-semibold">Documents</h2>
        <p className="mt-1 text-sm text-muted">
          Hub documentaire des spectacles, derive du pipeline, des relances et des contrats.
        </p>
      </div>

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
            <Card className="space-y-4 p-5">
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
                  <InfoCard label="Relances" value={focusPack.remindersCount.toString()} />
                  <InfoCard label="Budget" value={`${focusPack.budget.toLocaleString("fr-FR")} EUR`} />
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
                  detail="Mettre a jour le contexte de diffusion et les notes de production."
                />
                <QuickLink
                  href="/contracts"
                  title="Ouvrir les contrats"
                  detail="Verifier le statut contractuel avant de figer une version."
                />
                <QuickLink
                  href="/reminders"
                  title="Ouvrir les relances"
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
                  <p>{item.pipelineCount} opportunite(s)</p>
                  <p>{item.remindersCount} relance(s)</p>
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
