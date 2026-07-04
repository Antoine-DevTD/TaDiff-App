import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPipelineDeals, getShows } from "@/lib/supabase/queries";
import type { PipelineDeal, Show } from "@/types";

type ContractStatus = "draft" | "review" | "signed";

type ContractItem = {
  id: string;
  dealId: string;
  showId: string;
  title: string;
  contactName: string;
  organization: string;
  showTitle: string;
  nextDate: string;
  amount: number;
  status: ContractStatus;
  href: string;
  note: string;
};

function getWeightedValue(deal: PipelineDeal) {
  return Math.round((deal.value * deal.probability) / 100);
}

function buildContracts(deals: PipelineDeal[], shows: Show[]): ContractItem[] {
  const showMap = new Map(shows.map((show) => [show.id, show]));

  return deals
    .filter((deal) => deal.showId)
    .filter((deal) => deal.stage === "Negociation" || deal.stage === "Confirme" || deal.stage === "Relance prevue")
    .map((deal) => {
      const show = showMap.get(deal.showId);
      const status: ContractStatus =
        deal.stage === "Confirme"
          ? "signed"
          : deal.stage === "Negociation"
            ? "review"
            : "draft";

      return {
        id: `contract-${deal.id}`,
        dealId: deal.id,
        showId: deal.showId,
        title: `${deal.showTitle} - ${deal.contactOrganization || deal.venue}`,
        contactName: deal.contactName,
        organization: deal.contactOrganization || deal.venue,
        showTitle: deal.showTitle,
        nextDate: show?.nextDate ?? "",
        amount: deal.value || show?.budget || getWeightedValue(deal),
        status,
        href: `/shows/${deal.showId}`,
        note:
          status === "signed"
            ? "Accord confirme. Le contrat peut etre archive et rattache au dossier."
            : status === "review"
              ? "Conditions a verrouiller avant envoi final."
              : "Preparer un premier contrat ou une proposition formelle.",
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.nextDate || "2999-12-31").getTime();
      const dateB = new Date(b.nextDate || "2999-12-31").getTime();
      return dateA - dateB;
    });
}

function getStatusMeta(status: ContractStatus) {
  if (status === "signed") {
    return { label: "Signe", tone: "success" as const };
  }

  if (status === "review") {
    return { label: "A valider", tone: "warning" as const };
  }

  return { label: "A preparer", tone: "neutral" as const };
}

export default async function ContractsPage() {
  const [deals, shows] = await Promise.all([getPipelineDeals(), getShows()]);
  const contracts = buildContracts(deals, shows);
  const draftContracts = contracts.filter((contract) => contract.status === "draft");
  const reviewContracts = contracts.filter((contract) => contract.status === "review");
  const signedContracts = contracts.filter((contract) => contract.status === "signed");
  const focusContract = reviewContracts[0] ?? draftContracts[0] ?? signedContracts[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Contrats</h2>
        <p className="mt-1 text-sm text-muted">
          Une vue de suivi contractuel derivee des spectacles et des dates en discussion.
        </p>
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          title="Aucun contrat a suivre"
          description="Des qu un spectacle entre en relance avancee, negociation ou confirmation, il remonte ici."
          actionHref="/pipeline"
          actionLabel="Ouvrir la diffusion"
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="A preparer"
              value={draftContracts.length.toString()}
              detail="Contrats a monter"
            />
            <MetricCard
              label="A valider"
              value={reviewContracts.length.toString()}
              detail="Conditions en cours"
            />
            <MetricCard
              label="Signes"
              value={signedContracts.length.toString()}
              detail="Accords confirmes"
            />
            <MetricCard
              label="Volume"
              value={`${contracts.reduce((total, item) => total + item.amount, 0).toLocaleString("fr-FR")} EUR`}
              detail="Montant cumule"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Dossier prioritaire</p>
                  <p className="mt-2 text-xl font-semibold">
                    {focusContract?.title || "Aucun dossier prioritaire"}
                  </p>
                </div>
                {focusContract ? (
                  <Badge tone={getStatusMeta(focusContract.status).tone}>
                    {getStatusMeta(focusContract.status).label}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted">
                {focusContract?.note ||
                  "Les futurs lots brancheront ici les fichiers, versions et signatures reelles."}
              </p>
              {focusContract ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoCard label="Structure" value={focusContract.organization} />
                  <InfoCard
                    label="Date visee"
                    value={
                      focusContract.nextDate
                        ? new Date(focusContract.nextDate).toLocaleDateString("fr-FR")
                        : "A planifier"
                    }
                  />
                  <InfoCard
                    label="Montant"
                    value={`${focusContract.amount.toLocaleString("fr-FR")} EUR`}
                  />
                </div>
              ) : null}
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold">Acces rapides</p>
                <p className="mt-1 text-sm text-muted">
                  Le contrat reste pilote depuis les modules qui portent la relation et la date.
                </p>
              </div>
              <div className="grid gap-3">
                <QuickLink
                  href="/pipeline"
                  title="Revenir a la diffusion"
                  detail="Faire avancer la negociation et ajuster la probabilite."
                />
                <QuickLink
                  href="/shows"
                  title="Verifier les spectacles"
                  detail="Controler date, budget et contexte de diffusion."
                />
                <QuickLink
                  href="/documents"
                  title="Ouvrir les documents"
                  detail="Preparer le futur rattachement des PDF et versions."
                />
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <ContractColumn
              title="A preparer"
              description="Les contrats a monter prochainement."
              items={draftContracts}
            />
            <ContractColumn
              title="A valider"
              description="Les dossiers en attente de retour ou d arbitrage."
              items={reviewContracts}
            />
            <ContractColumn
              title="Signes"
              description="Les accords deja confirmes."
              items={signedContracts}
            />
          </section>
        </>
      )}
    </div>
  );
}

function ContractColumn({
  description,
  items,
  title,
}: {
  description: string;
  items: ContractItem[];
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
          Aucun dossier dans cette etape.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = getStatusMeta(item.status);

            return (
              <Link
                key={item.id}
                className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                href={item.href}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.showTitle}</p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {item.contactName} - {item.organization}
                    </p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted">Date</p>
                    <p className="mt-1 font-medium">
                      {item.nextDate
                        ? new Date(item.nextDate).toLocaleDateString("fr-FR")
                        : "A planifier"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Montant</p>
                    <p className="mt-1 font-medium">{item.amount.toLocaleString("fr-FR")} EUR</p>
                  </div>
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
