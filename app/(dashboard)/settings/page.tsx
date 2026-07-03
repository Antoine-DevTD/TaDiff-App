import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WorkspaceExportPanel } from "@/components/settings/workspace-export-panel";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getBillingPlans,
  getCommercialPacks,
  getDashboardData,
  getEmailCampaigns,
  getGrantOpportunities,
  getPatronageDeals,
  getQuoteItems,
} from "@/lib/supabase/queries";

export default async function SettingsPage() {
  const [
    dashboard,
    commercialPacks,
    grants,
    patronageDeals,
    campaigns,
    plans,
    quotes,
  ] = await Promise.all([
    getDashboardData(),
    getCommercialPacks(),
    getGrantOpportunities(),
    getPatronageDeals(),
    getEmailCampaigns(),
    getBillingPlans(),
    getQuoteItems(),
  ]);
  const currentPlan = plans.find((plan) => plan.current) ?? plans[0];
  const backup = {
    billingPlan: currentPlan,
    campaigns,
    commercialPacks,
    contacts: dashboard.contacts,
    grants,
    patronageDeals,
    pipelineDeals: dashboard.pipelineDeals,
    quotes,
    reminders: dashboard.reminders,
    shows: dashboard.shows,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Parametres</h2>
        <p className="mt-1 text-sm text-muted">
          Etat technique, integrateurs et sauvegarde des donnees operationnelles.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Spectacles" value={dashboard.shows.length.toString()} detail="Catalogue" />
        <MetricCard label="Contacts" value={dashboard.contacts.length.toString()} detail="CRM" />
        <MetricCard label="Opportunites" value={dashboard.pipelineDeals.length.toString()} detail="Pipeline" />
        <MetricCard label="Devis" value={quotes.length.toString()} detail="Facturation" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Integrations</p>
            <p className="mt-1 text-sm text-muted">
              Etat de branchement des services externes necessaires a la production.
            </p>
          </div>
          <IntegrationRow
            label="Supabase"
            detail={hasSupabaseEnv() ? "Auth et base connectees" : "Mode demo / mock data"}
            enabled={hasSupabaseEnv()}
          />
          <IntegrationRow
            label="Stripe"
            detail={process.env.STRIPE_SECRET_KEY ? "Cle serveur detectee" : "Paiement non active"}
            enabled={Boolean(process.env.STRIPE_SECRET_KEY)}
          />
          <IntegrationRow
            label="Email provider"
            detail={process.env.RESEND_API_KEY ? "Cle Resend detectee" : "Envoi reel non active"}
            enabled={Boolean(process.env.RESEND_API_KEY)}
          />
          <IntegrationRow
            label="Plan cible"
            detail={currentPlan ? `${currentPlan.name} - ${currentPlan.monthlyPrice} EUR / mois` : "Aucun plan"}
            enabled={Boolean(currentPlan)}
          />
        </Card>

        <WorkspaceExportPanel backup={backup} />
      </section>
    </div>
  );
}

function IntegrationRow({
  detail,
  enabled,
  label,
}: {
  detail: string;
  enabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted">{detail}</p>
      </div>
      <Badge tone={enabled ? "success" : "warning"}>{enabled ? "Actif" : "A brancher"}</Badge>
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
