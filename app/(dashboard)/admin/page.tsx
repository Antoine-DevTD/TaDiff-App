import { notFound } from "next/navigation";
import Link from "next/link";
import { CompanyBillingForm } from "@/components/admin/company-billing-form";
import { AiConfigurationPanel } from "@/components/admin/ai-configuration-panel";
import { AiAccessManager } from "@/components/admin/ai-access-manager";
import { WilliamAnalyticsPanel } from "@/components/admin/william-analytics-panel";
import { ErrorNotificationsPanel } from "@/components/admin/error-notifications-panel";
import { FeedbackRow } from "@/components/admin/feedback-row";
import { LegalInformationForm } from "@/components/admin/legal-information-form";
import { MaintenanceToggle } from "@/components/admin/maintenance-toggle";
import { PlatformCatalogManager } from "@/components/admin/platform-catalog-manager";
import { GrantCatalogProposals } from "@/components/admin/grant-catalog-proposals";
import { PlatformEmailTemplateStudio } from "@/components/admin/platform-email-template-studio";
import { PlatformAdminManager } from "@/components/admin/platform-admin-manager";
import { RevenueForecastChart } from "@/components/admin/revenue-forecast-chart";
import { PublicAnalyticsPanel } from "@/components/admin/public-analytics-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildRevenueForecast } from "@/lib/admin-forecast";
import { formatCurrency } from "@/lib/finance";
import {
  getAdminAccessEvents,
  getAdminCompanies,
  getAdminFeedback,
  getAdminMaintenanceMode,
  getAdminLegalInformation,
  getAdminGrantCatalog,
  getAdminGrantCatalogProposals,
  getAdminPatronageCatalog,
  getAdminPlatformEmailTemplates,
  getAdminAiSettings,
  getAdminRagDocuments,
  getAdminAiAccounts,
  getAdminWilliamQuestionEvents,
  getAiProviderReadiness,
  getAdminPublicAnalyticsEvents,
  getAdminPlatformAdmins,
  getAdminErrorGroups,
  getPlatformAdminAccess,
  type PlatformPermission,
  type AdminAccessEvent,
  type AdminCompany,
} from "@/lib/supabase/admin";
import type { BillingStatus } from "@/lib/supabase/access";

const statusMeta: Record<BillingStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  trial: { label: "Essai", tone: "neutral" },
  active: { label: "Actif", tone: "success" },
  comped: { label: "Offert", tone: "success" },
  past_due: { label: "Retard", tone: "warning" },
  cancelled: { label: "Resilie", tone: "danger" },
};

type AdminPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const access = await getPlatformAdminAccess();
  if (!access.isSuperAdmin && access.permissions.length === 0) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const allowedTabs = getAllowedTabs(access.isSuperAdmin, access.permissions);
  const requestedTab = resolvedSearchParams?.tab ?? "supervision";
  const activeTab = allowedTabs.includes(requestedTab as AdminTabId)
    ? (requestedTab as AdminTabId)
    : allowedTabs[0];
  const [
    companies,
    feedback,
    accessEvents,
    maintenanceActive,
    analyticsEvents,
    legalInformation,
    grantCatalog,
    grantCatalogProposals,
    patronageCatalog,
    platformEmailTemplates,
    aiSettings,
    ragDocuments,
    aiAccounts,
    williamQuestionEvents,
    platformAdmins,
    errorGroups,
  ] = await Promise.all([
    getAdminCompanies(),
    getAdminFeedback(),
    getAdminAccessEvents(60),
    getAdminMaintenanceMode(),
    getAdminPublicAnalyticsEvents(30, 2000),
    getAdminLegalInformation(),
    getAdminGrantCatalog(),
    getAdminGrantCatalogProposals(),
    getAdminPatronageCatalog(),
    getAdminPlatformEmailTemplates(),
    getAdminAiSettings(),
    getAdminRagDocuments(),
    getAdminAiAccounts(),
    getAdminWilliamQuestionEvents(),
    getAdminPlatformAdmins(),
    getAdminErrorGroups(),
  ]);
  const aiReadiness = getAiProviderReadiness();

  const activeCount = companies.filter((company) => company.billingStatus === "active").length;
  const compedCount = companies.filter((company) => company.billingStatus === "comped").length;
  const monthlyRevenue = activeCount * 19.99;
  const forecast = buildRevenueForecast(companies);
  const openFeedback = feedback.filter((entry) => entry.status !== "traite").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Console interne</p>
        <h2 className="mt-2 text-3xl font-semibold">{adminTabMeta[activeTab].title}</h2>
        <p className="mt-1 text-sm text-muted">{adminTabMeta[activeTab].description}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {allowedTabs.includes("supervision") ? <AdminTab active={activeTab === "supervision"} href="/admin" label="Supervision" /> : null}
        {allowedTabs.includes("retours") ? <AdminTab
          active={activeTab === "retours"}
          href="/admin?tab=retours"
          label={`Retours${openFeedback > 0 ? ` (${openFeedback})` : ""}`}
        /> : null}
        {allowedTabs.includes("notifications") ? <AdminTab active={activeTab === "notifications"} href="/admin?tab=notifications" label={`Notifications${errorGroups.filter((error) => !error.resolvedAt).length ? ` (${errorGroups.filter((error) => !error.resolvedAt).length})` : ""}`} /> : null}
        {allowedTabs.includes("audience") ? <AdminTab active={activeTab === "audience"} href="/admin?tab=audience" label="Audience" /> : null}
        {allowedTabs.includes("informations") ? <AdminTab active={activeTab === "informations"} href="/admin?tab=informations" label="Informations" /> : null}
        {allowedTabs.includes("catalogues") ? <AdminTab active={activeTab === "catalogues"} href="/admin?tab=catalogues" label={`Catalogues${grantCatalogProposals.length > 0 ? ` (${grantCatalogProposals.length})` : ""}`} /> : null}
        {allowedTabs.includes("emails") ? <AdminTab active={activeTab === "emails"} href="/admin?tab=emails" label="Emails" /> : null}
        {allowedTabs.includes("ia") ? <AdminTab active={activeTab === "ia"} href="/admin?tab=ia" label="William IA" /> : null}
        {allowedTabs.includes("administrateurs") ? <AdminTab active={activeTab === "administrateurs"} href="/admin?tab=administrateurs" label="Administrateurs" /> : null}
      </div>

      {activeTab === "administrateurs" ? (
        <PlatformAdminManager accounts={aiAccounts} admins={platformAdmins} />
      ) : activeTab === "notifications" ? (
        <ErrorNotificationsPanel errors={errorGroups} />
      ) : activeTab === "informations" ? (
        <LegalInformationForm initialValue={legalInformation} />
      ) : activeTab === "catalogues" ? (
        <div className="space-y-8">
          {access.isSuperAdmin ? <GrantCatalogProposals proposals={grantCatalogProposals} /> : null}
          <PlatformCatalogManager grants={grantCatalog} patronage={patronageCatalog} />
        </div>
      ) : activeTab === "emails" ? (
        <PlatformEmailTemplateStudio templates={platformEmailTemplates} />
      ) : activeTab === "ia" ? (
        <div className="space-y-5">
          {access.isSuperAdmin ? <AiAccessManager accounts={aiAccounts} /> : null}
          <WilliamAnalyticsPanel events={williamQuestionEvents} />
          <AiConfigurationPanel documents={ragDocuments} readiness={aiReadiness} settings={aiSettings} />
        </div>
      ) : activeTab === "audience" ? (
        <PublicAnalyticsPanel events={analyticsEvents} generatedAt={new Date().toISOString()} />
      ) : activeTab === "retours" ? (
        <AdminFeedbackPanel feedback={feedback} openFeedback={openFeedback} />
      ) : (
        <>
      {access.isSuperAdmin ? <Card className="space-y-3 p-5">
        <div>
          <p className="text-base font-semibold">Mode maintenance</p>
          <p className="mt-1 text-sm text-muted">
            Coupe l&apos;accès au site pour tous les visiteurs (bascule immédiate, pas de
            redeploiement). A utiliser pendant une intervention technique.
          </p>
        </div>
        <MaintenanceToggle active={maintenanceActive} />
      </Card> : null}

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Compagnies" value={companies.length.toString()} detail={`${activeCount} active(s), ${compedCount} offerte(s)`} />
        <MetricCard label="MRR bêta" value={formatCurrency(monthlyRevenue)} detail={`${activeCount} abonnement(s) a 19,99 EUR`} />
      </section>

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-semibold">Prevision de revenu</p>
          <p className="mt-1 text-sm text-muted">
            MRR estime depuis les abonnements actifs, prolonge sur 6 mois au rythme des nouvelles
            souscriptions. Indicatif tant que Stripe n&apos;est pas branche.
          </p>
        </div>
        <RevenueForecastChart forecast={forecast} />
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-semibold">Compagnies</p>
          <p className="mt-1 text-sm text-muted">
            Statut d&apos;abonnement, volumes et dernière activité. La facturation se gère ici sans
            passer par le SQL editor.
          </p>
        </div>
        {companies.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
            Aucune compagnie inscrite pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {companies.map((company) => (
              <CompanyRow key={company.id} company={company} canManageBilling={access.isSuperAdmin} />
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-semibold">Accès récents</p>
          <p className="mt-1 text-sm text-muted">
            Connexions et navigation authentifiee. A utiliser pour vérifier quel compte accede a
            l&apos;application, depuis quelle IP et quel navigateur.
          </p>
        </div>
        {accessEvents.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
            Aucun accès journalise pour le moment. Appliquer la migration 021 et vérifier
            `SUPABASE_SERVICE_ROLE_KEY` si la liste reste vide.
          </p>
        ) : (
          <div className="space-y-2">
            {accessEvents.map((event) => (
              <AccessEventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </Card>

        </>
      )}
    </div>
  );
}

const adminTabMeta = {
  supervision: { title: "Supervision TaDiff", description: "Compagnies, facturation, accès et inscriptions bêta." },
  retours: { title: "Retours compagnies", description: "Bugs, idees et avis envoyes depuis le cockpit." },
  notifications: { title: "Notifications techniques", description: "Erreurs groupées, compagnies touchées et suivi des corrections." },
  audience: { title: "Audience publique", description: "Visites, clics et inscriptions sur les pages publiques, sans adresse IP." },
  informations: { title: "Informations publiees", description: "Identite legale, contacts et prix modifiables sans redeploiement." },
  catalogues: { title: "Catalogues de référence", description: "Subventions et programmes de mécénat proposés aux compagnies et à William." },
  emails: { title: "Bibliothèque d'emails", description: "Modèles globaux personnalisables par les compagnies." },
  ia: { title: "William IA", description: "Fournisseurs, secrets disponibles et corpus de recherche contrôlé." },
  administrateurs: { title: "Administrateurs délégués", description: "Accès internes limités, sans droit sur la facturation ni les comptes offerts." },
} as const;

type AdminTabId = keyof typeof adminTabMeta;

function getAllowedTabs(isSuperAdmin: boolean, permissions: PlatformPermission[]): AdminTabId[] {
  if (isSuperAdmin) return ["supervision", "retours", "notifications", "audience", "informations", "catalogues", "emails", "ia", "administrateurs"];
  const tabs: AdminTabId[] = [];
  if (["view_companies", "view_beta", "view_access"].some((permission) => permissions.includes(permission as PlatformPermission))) tabs.push("supervision");
  if (permissions.includes("manage_feedback")) tabs.push("retours");
  if (permissions.includes("manage_feedback")) tabs.push("notifications");
  if (permissions.includes("view_audience")) tabs.push("audience");
  if (permissions.includes("manage_legal")) tabs.push("informations");
  if (permissions.includes("manage_catalogs")) tabs.push("catalogues");
  if (permissions.includes("manage_email_templates")) tabs.push("emails");
  if (permissions.includes("manage_ai")) tabs.push("ia");
  return tabs;
}

function AdminTab({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "border-b-2 border-accent px-3 py-2 text-sm font-semibold text-accent"
          : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

function AdminFeedbackPanel({
  feedback,
  openFeedback,
}: {
  feedback: Awaited<ReturnType<typeof getAdminFeedback>>;
  openFeedback: number;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold">Retours et signalements</p>
          <p className="mt-1 text-sm text-muted">
            Les nouveaux retours remontent en premier. Traitez-les sans les melanger a la
            supervision technique.
          </p>
        </div>
        {openFeedback > 0 ? (
          <Badge tone="warning">{openFeedback} à traiter</Badge>
        ) : (
          <Badge tone="success">À jour</Badge>
        )}
      </div>
      {feedback.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
          Aucun retour pour le moment. Le bouton &laquo;&nbsp;Donner un retour&nbsp;&raquo; apparait
          dans l&apos;application des compagnies.
        </p>
      ) : (
        <div className="space-y-3">
          {feedback.map((entry) => (
            <FeedbackRow key={entry.id} feedback={entry} />
          ))}
        </div>
      )}
    </Card>
  );
}

function AccessEventRow({ event }: { event: AdminAccessEvent }) {
  const eventLabel: Record<AdminAccessEvent["eventType"], string> = {
    login: "Connexion",
    signup: "Creation",
    page_view: "Page vue",
  };

  return (
    <div className="grid gap-3 rounded-md border border-border bg-panel-strong/35 px-4 py-3 text-sm lg:grid-cols-[1fr_160px_220px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={event.eventType === "login" ? "success" : "neutral"}>
            {eventLabel[event.eventType]}
          </Badge>
          <p className="font-medium">{event.email || event.actorName}</p>
          {event.companyName ? <span className="text-muted">- {event.companyName}</span> : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted">
          {event.path || "Page inconnue"} {event.userAgent ? `- ${event.userAgent}` : ""}
        </p>
      </div>
      <p className="font-mono text-xs text-muted">{event.ipAddress || "IP inconnue"}</p>
      <p className="text-xs text-muted lg:text-right">
        {new Date(event.createdAt).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function CompanyRow({ company, canManageBilling }: { company: AdminCompany; canManageBilling: boolean }) {
  const meta = statusMeta[company.billingStatus];
  const shortId = company.id.slice(0, 8);

  return (
    <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-semibold text-white">
              {getCompanyInitials(company.name)}
            </span>
            <p className="font-medium">{company.name}</p>
            <span className="font-mono text-xs text-muted">#{shortId}</span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Badge>{company.planCode}</Badge>
            {company.billingStatus === "comped" && company.compedUntil ? (
              <Badge tone="warning">
                jusqu&apos;au {new Date(company.compedUntil).toLocaleDateString("fr-FR")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Creee le {new Date(company.createdAt).toLocaleDateString("fr-FR")} —{" "}
            {company.lastActivity
              ? `derniere activite le ${new Date(company.lastActivity).toLocaleDateString("fr-FR")}`
              : "aucune activité journalisee"}
          </p>
          {company.billingNotes ? (
            <p className="mt-2 text-sm text-muted">{company.billingNotes}</p>
          ) : null}
          {company.ownerEmail || company.ownerName ? (
            <p className="mt-1 text-xs text-muted">
              Referent : {[company.ownerName, company.ownerEmail].filter(Boolean).join(" - ")}
            </p>
          ) : null}
        </div>
        <div className="grid shrink-0 grid-cols-4 gap-3 text-center text-sm">
          <VolumeCell label="Membres" value={company.memberCount} />
          <VolumeCell label="Spectacles" value={company.showCount} />
          <VolumeCell label="Contacts" value={company.contactCount} />
          <VolumeCell label="Dates" value={company.dealCount} />
        </div>
      </div>
      {canManageBilling ? <div className="mt-3"><CompanyBillingForm company={company} /></div> : null}
    </div>
  );
}

function getCompanyInitials(name: string) {
  const words = name
    .replace(/^compagnie\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);

  return (words[0]?.[0] ?? "T").concat(words[1]?.[0] ?? "").toUpperCase();
}

function VolumeCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-panel px-2 py-1.5">
      <p className="text-base font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
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
