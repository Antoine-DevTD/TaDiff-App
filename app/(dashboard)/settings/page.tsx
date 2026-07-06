import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { TheatreThemeSwitcher } from "@/components/theme/theatre-theme-switcher";
import { ThemeModeSwitcher } from "@/components/theme/theme-mode-switcher";
import { CompanyDocumentsPanel } from "@/components/settings/company-documents-panel";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { TeamAccessPanel } from "@/components/settings/team-access-panel";
import { DemoCompanyPanel } from "@/components/settings/demo-company-panel";
import { WorkspaceExportPanel } from "@/components/settings/workspace-export-panel";
import { getWorkspaceAccess, type BillingStatus, type CompanyRole } from "@/lib/supabase/access";
import { isSuperAdmin } from "@/lib/supabase/admin";
import {
  getActivityLog,
  getBillingPlans,
  getCommercialPacks,
  getDashboardData,
  getEmailCampaigns,
  getCompanyDocuments,
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
    companyDocuments,
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
    getCompanyDocuments(),
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
        <PageTitle href="/settings">Paramètres</PageTitle>
        <p className="mt-1 text-sm text-muted">
          État technique, intégrateurs et sauvegarde des données opérationnelles.
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
              Ces informations identifient la compagnie et seront réutilisées dans les devis et
              les dossiers.
            </p>
          </div>
          <CompanyProfileForm profile={companyProfile} canManage={access.canManage} />
        </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-semibold">Documents de la compagnie</p>
          <p className="mt-1 text-sm text-muted">
            RIB, statuts, licence, attestation d&apos;assurance... Ajoutés une fois, réutilisables
            dans tous les dossiers sans re-téléverser.
          </p>
        </div>
        <CompanyDocumentsPanel documents={companyDocuments} canManage={access.canManage} />
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-semibold">Apparence</p>
          <p className="mt-1 text-sm text-muted">
            Mode clair, sombre ou système, puis direction artistique de l&apos;interface.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Mode</p>
          <ThemeModeSwitcher />
        </div>
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Direction artistique</p>
          <TheatreThemeSwitcher embedded />
        </div>
      </Card>

      {members.length > 0 ? (
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Équipe et accès</p>
            <p className="mt-1 text-sm text-muted">
              Membres de la compagnie, rôles et code d&apos;invitation.
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
            <p className="text-base font-semibold">Compagnie et accès</p>
            <p className="mt-1 text-sm text-muted">
              Statut d&apos;abonnement et rôle lus depuis la base. Le paiement Stripe viendra alimenter
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
            detail={access.planCode ? `Code plan : ${access.planCode}` : "Aucun plan enregistré"}
            enabled={Boolean(access.planCode)}
          />
          <IntegrationRow
            label="Votre rôle"
            detail={getRoleLabel(access.role)}
            enabled={access.role !== "readonly"}
          />
          {superAdmin ? (
            <IntegrationRow
              label="Console interne"
              detail="Supervision des compagnies et des inscriptions bêta"
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
              <p className="text-base font-semibold">Activité récente</p>
              <p className="mt-1 text-sm text-muted">
                Les 15 dernières actions de la compagnie (créations, modifications,
                suppressions, statuts).
              </p>
            </div>
            {activity.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
                Aucune activité enregistrée pour le moment. Le journal démarre avec la
                migration 012 : chaque action métier y sera tracée.
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
  if (!status) return "Statut inconnu (mode démo ou profil incomplet)";
  if (status === "trial") return "Période d'essai";
  if (status === "active") return "Abonnement actif";
  if (status === "comped") {
    return compedUntil
      ? `Compte offert jusqu'au ${new Date(compedUntil).toLocaleDateString("fr-FR")}`
      : "Compte offert (sans limite)";
  }
  if (status === "past_due") return "Paiement en retard";
  return "Abonnement résilié";
}

function getRoleLabel(role: CompanyRole | null) {
  if (!role) return "Rôle inconnu";
  if (role === "owner") return "Owner - responsable de la compagnie";
  if (role === "admin") return "Admin - gestion complète";
  if (role === "member") return "Membre - édition courante";
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
