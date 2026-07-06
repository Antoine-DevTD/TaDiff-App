import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { TeamAccessPanel } from "@/components/settings/team-access-panel";
import { DemoCompanyPanel } from "@/components/settings/demo-company-panel";
import { WorkspaceExportPanel } from "@/components/settings/workspace-export-panel";
import { hasSupabaseEnv } from "@/lib/env";
import { getWorkspaceAccess, type BillingStatus, type CompanyRole } from "@/lib/supabase/access";
import { isSuperAdmin } from "@/lib/supabase/admin";
import {
  getActivityLog,
  getBillingPlans,
  getCommercialPacks,
  getDashboardData,
  getEmailCampaigns,
  getCompanyInviteCode,
  getCompanyMembers,
  getCompanyProfile,
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
    access,
    activity,
    superAdmin,
    companyProfile,
    members,
    inviteCode,
  ] = await Promise.all([
    getDashboardData(),
    getCommercialPacks(),
    getGrantOpportunities(),
    getPatronageDeals(),
    getEmailCampaigns(),
    getBillingPlans(),
    getQuoteItems(),
    getWorkspaceAccess(),
    getActivityLog(15),
    isSuperAdmin(),
    getCompanyProfile(),
    getCompanyMembers(),
    getCompanyInviteCode(),
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
        <PageTitle href="/settings">Parametres</PageTitle>
        <p className="mt-1 text-sm text-muted">
          Etat technique, integrateurs et sauvegarde des donnees operationnelles.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Spectacles" value={dashboard.shows.length.toString()} detail="Catalogue" />
        <MetricCard label="Contacts" value={dashboard.contacts.length.toString()} detail="Carnet de diffusion" />
        <MetricCard label="Dates" value={dashboard.pipelineDeals.length.toString()} detail="Diffusion" />
        <MetricCard label="Devis" value={quotes.length.toString()} detail="Facturation" />
      </section>

      {companyProfile ? (
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Profil de la compagnie</p>
            <p className="mt-1 text-sm text-muted">
              Ces informations identifient la compagnie et seront reutilisees dans les devis et
              les dossiers.
            </p>
          </div>
          <CompanyProfileForm profile={companyProfile} canManage={access.canManage} />
        </Card>
      ) : null}

      {members.length > 0 ? (
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Equipe et acces</p>
            <p className="mt-1 text-sm text-muted">
              Membres de la compagnie, roles et code d&apos;invitation.
            </p>
          </div>
          <TeamAccessPanel
            members={members}
            inviteCode={inviteCode}
            canManage={access.canManage}
          />
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
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

        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Compagnie et acces</p>
            <p className="mt-1 text-sm text-muted">
              Statut d abonnement et role lus depuis la base. Le paiement Stripe viendra alimenter
              ce statut automatiquement.
            </p>
          </div>
          <IntegrationRow
            label="Statut compagnie"
            detail={getBillingStatusLabel(access.billingStatus, access.compedUntil)}
            enabled={access.hasAccess}
          />
          <IntegrationRow
            label="Plan"
            detail={access.planCode ? `Code plan : ${access.planCode}` : "Aucun plan enregistre"}
            enabled={Boolean(access.planCode)}
          />
          <IntegrationRow
            label="Votre role"
            detail={getRoleLabel(access.role)}
            enabled={access.role !== "readonly"}
          />
          {superAdmin ? (
            <IntegrationRow
              label="Console interne"
              detail="Supervision des compagnies et des inscriptions beta"
              enabled
              href="/admin"
            />
          ) : null}
        </Card>
        </div>

        <div className="space-y-6">
          <WorkspaceExportPanel backup={backup} />
          <DemoCompanyPanel />

          <Card className="space-y-4 p-5">
            <div>
              <p className="text-base font-semibold">Activite recente</p>
              <p className="mt-1 text-sm text-muted">
                Les 15 dernieres actions de la compagnie (creations, modifications,
                suppressions, statuts).
              </p>
            </div>
            {activity.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
                Aucune activite enregistree pour le moment. Le journal demarre avec la
                migration 012 : chaque action metier y sera tracee.
              </p>
            ) : (
              <div className="space-y-2">
                {activity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-1 rounded-md border border-border bg-panel-strong/35 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="min-w-0">
                      <span className="font-medium">{entry.actorName}</span>{" "}
                      <span className="text-muted">{entry.action}</span>
                      {entry.entityLabel ? (
                        <span className="font-medium"> {entry.entityLabel}</span>
                      ) : null}
                    </p>
                    <p className="shrink-0 text-xs text-muted">
                      {new Date(entry.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

function getBillingStatusLabel(status: BillingStatus | null, compedUntil: string | null) {
  if (!status) return "Statut inconnu (mode demo ou profil incomplet)";
  if (status === "trial") return "Periode d essai";
  if (status === "active") return "Abonnement actif";
  if (status === "comped") {
    return compedUntil
      ? `Compte offert jusqu au ${new Date(compedUntil).toLocaleDateString("fr-FR")}`
      : "Compte offert (sans limite)";
  }
  if (status === "past_due") return "Paiement en retard";
  return "Abonnement resilie";
}

function getRoleLabel(role: CompanyRole | null) {
  if (!role) return "Role inconnu";
  if (role === "owner") return "Owner - responsable de la compagnie";
  if (role === "admin") return "Admin - gestion complete";
  if (role === "member") return "Membre - edition courante";
  return "Lecture seule";
}

function IntegrationRow({
  detail,
  enabled,
  href,
  label,
}: {
  detail: string;
  enabled: boolean;
  href?: string;
  label: string;
}) {
  const content = (
    <>
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted">{detail}</p>
      </div>
      <Badge tone={enabled ? "success" : "warning"}>
        {href ? "Ouvrir" : enabled ? "Actif" : "A brancher"}
      </Badge>
    </>
  );

  if (href) {
    return (
      <Link
        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/40 hover:bg-panel-strong/60"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-4">
      {content}
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
