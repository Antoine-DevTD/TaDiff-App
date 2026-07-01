import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import { getCommercialPacks, getPatronageDeals } from "@/lib/supabase/queries";
import type { PatronageDeal } from "@/types";

function getPatronageTone(status: PatronageDeal["status"]) {
  if (status === "Signe") return "success" as const;
  if (status === "Negociation" || status === "Argumentaire") return "warning" as const;
  return "neutral" as const;
}

export default async function MecenatPage() {
  const [deals, packs] = await Promise.all([getPatronageDeals(), getCommercialPacks()]);
  const packMap = new Map(packs.map((pack) => [pack.id, pack]));
  const expectedAmount = deals.reduce((total, deal) => total + deal.amount, 0);
  const taxDeduction = Math.round(expectedAmount * 0.6);
  const focusDeal = deals.find((deal) => deal.status === "Negociation") ?? deals[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Mecenat</h2>
          <p className="mt-1 text-sm text-muted">
            Pipeline entreprises, deduction fiscale loi Aillagon et packs de contreparties.
          </p>
        </div>
        <ButtonLink href="/campaigns" variant="secondary">
          Preparer une campagne
        </ButtonLink>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Partenaires" value={deals.length.toString()} detail="Entreprises suivies" />
        <MetricCard label="Montant cible" value={formatCurrency(expectedAmount)} detail="Mecenat potentiel" />
        <MetricCard label="Deduction 60%" value={formatCurrency(taxDeduction)} detail="Argument fiscal" />
        <MetricCard label="Packs" value={packs.filter((pack) => pack.id.includes("patronage")).length.toString()} detail="Offres mecene" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Partenaire prioritaire</p>
              <p className="mt-2 text-xl font-semibold">{focusDeal?.companyName ?? "Aucun partenaire"}</p>
            </div>
            {focusDeal ? <Badge tone={getPatronageTone(focusDeal.status)}>{focusDeal.status}</Badge> : null}
          </div>
          <p className="text-sm text-muted">
            {focusDeal?.nextAction ?? "Ajoutez un partenaire entreprise pour generer un argumentaire fiscal."}
          </p>
          {focusDeal ? (
            <div className="grid gap-3 md:grid-cols-3">
              <InfoCard label="Contact" value={focusDeal.contactName} />
              <InfoCard label="Montant" value={formatCurrency(focusDeal.amount)} />
              <InfoCard label="Deduction" value={formatCurrency(focusDeal.amount * 0.6)} />
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Pack entreprise mecene</p>
            <p className="mt-1 text-sm text-muted">
              Contreparties et calcul fiscal a joindre a l argumentaire.
            </p>
          </div>
          {packs
            .filter((pack) => pack.id === "pack-patronage")
            .map((pack) => (
              <div key={pack.id} className="rounded-lg border border-border bg-panel-strong/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{pack.name}</p>
                    <p className="mt-1 text-sm text-muted">{pack.description}</p>
                  </div>
                  <Badge>x{pack.multiplier.toFixed(2)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pack.includes.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        {(["Prospect", "Argumentaire", "Negociation", "Signe"] as const).map((status) => (
          <PatronageColumn
            key={status}
            deals={deals.filter((deal) => deal.status === status)}
            packMap={packMap}
            title={status}
          />
        ))}
      </section>
    </div>
  );
}

function PatronageColumn({
  deals,
  packMap,
  title,
}: {
  deals: PatronageDeal[];
  packMap: Map<string, { name: string }>;
  title: string;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold">{title}</p>
        <Badge>{deals.length}</Badge>
      </div>
      {deals.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
          Aucun partenaire ici.
        </p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <div key={deal.id} className="rounded-lg border border-border bg-panel-strong/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{deal.companyName}</p>
                  <p className="mt-1 text-sm text-muted">{deal.contactName}</p>
                </div>
                <Badge tone={getPatronageTone(deal.status)}>{formatCurrency(deal.amount)}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">{deal.nextAction}</p>
              <p className="mt-3 text-xs text-muted">
                {packMap.get(deal.packId)?.name ?? "Pack a definir"} - relance{" "}
                {new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
          ))}
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
