import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEmailCampaigns } from "@/lib/supabase/queries";
import type { EmailCampaign } from "@/types";

function getCampaignTone(status: EmailCampaign["status"]) {
  if (status === "Envoyee") return "success" as const;
  if (status === "Prete") return "warning" as const;
  return "neutral" as const;
}

export default async function CampaignsPage() {
  const campaigns = await getEmailCampaigns();
  const sent = campaigns.reduce((total, campaign) => total + campaign.sentCount, 0);
  const sentCampaigns = campaigns.filter((campaign) => campaign.status === "Envoyee");
  const averageOpenRate =
    sentCampaigns.length > 0
      ? Math.round(sentCampaigns.reduce((total, campaign) => total + campaign.openRate, 0) / sentCampaigns.length)
      : 0;
  const ready = campaigns.filter((campaign) => campaign.status === "Prete");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Campagnes email</h2>
          <p className="mt-1 text-sm text-muted">
            Templates, audiences, prochaines relances et suivi de performance.
          </p>
        </div>
        <ButtonLink href="/contacts" variant="secondary">
          Voir les contacts
        </ButtonLink>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Campagnes" value={campaigns.length.toString()} detail="Sequences suivies" />
        <MetricCard label="Pretes" value={ready.length.toString()} detail="En attente d'envoi" />
        <MetricCard label="Emails envoyes" value={sent.toLocaleString("fr-FR")} detail="Historique demo" />
        <MetricCard label="Ouverture moy." value={`${averageOpenRate}%`} detail="Campagnes envoyees" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">File de campagnes</p>
            <p className="mt-1 text-sm text-muted">
              Les envois sont prepares. Le provider email reste a brancher avant tout depart reel.
            </p>
          </div>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-lg border border-border bg-panel-strong/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="mt-1 text-sm text-muted">{campaign.audience}</p>
                  </div>
                  <Badge tone={getCampaignTone(campaign.status)}>{campaign.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <InfoCell label="Template" value={campaign.template} />
                  <InfoCell label="Envoyes" value={campaign.sentCount.toLocaleString("fr-FR")} />
                  <InfoCell label="Ouverture" value={`${campaign.openRate}%`} />
                </div>
                <p className="mt-3 text-xs text-muted">
                  {campaign.nextSendAt
                    ? `Prochain envoi ${new Date(campaign.nextSendAt).toLocaleDateString("fr-FR")}`
                    : "Pas de prochain envoi planifie"}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Templates disponibles</p>
              <p className="mt-1 text-sm text-muted">
                Les variables se branchent sur spectacles, contacts, packs et relances.
              </p>
            </div>
            <Badge>4 modeles</Badge>
          </div>
          <TemplateBlock
            title="Diffusion spectacle"
            variables="{contact_name}, {show_title}, {next_date}, {pack_name}"
          />
          <TemplateBlock
            title="Offre mediation"
            variables="{city}, {school_pack}, {workshop_price}, {deadline}"
          />
          <TemplateBlock
            title="Mecenat entreprise"
            variables="{company_name}, {tax_deduction}, {patronage_amount}"
          />
          <TemplateBlock
            title="Relance devis"
            variables="{quote_number}, {deposit_due}, {balance_due}"
          />
        </Card>
      </section>
    </div>
  );
}

function TemplateBlock({ title, variables }: { title: string; variables: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-2 break-words text-sm text-muted">{variables}</p>
    </div>
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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}
