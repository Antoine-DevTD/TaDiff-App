import { notFound } from "next/navigation";
import Link from "next/link";
import { CompanySupervision } from "@/components/admin/company-supervision";
import { BetaAccessManager } from "@/components/admin/beta-access-manager";
import { getAdminCompanySupervision } from "@/lib/admin-supervision-server";
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
  getAdminBetaSupervision,
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
} from "@/lib/supabase/admin";

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
  const canViewCompanies = access.isSuperAdmin || access.permissions.includes("view_companies");
  const canViewAccess = access.isSuperAdmin || access.permissions.includes("view_access");
  const isSupervision = activeTab === "supervision";
  const [
    companySnapshot,
    betaSnapshot,
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
    isSupervision && canViewCompanies ? getAdminCompanySupervision() : Promise.resolve(null),
    activeTab === "beta" ? getAdminBetaSupervision() : Promise.resolve(null),
    access.isSuperAdmin || access.permissions.includes("manage_feedback") ? getAdminFeedback() : Promise.resolve([]),
    isSupervision && canViewAccess ? getAdminAccessEvents(60) : Promise.resolve([]),
    isSupervision && access.isSuperAdmin ? getAdminMaintenanceMode() : Promise.resolve(false),
    activeTab === "audience" ? getAdminPublicAnalyticsEvents(30, 2000) : Promise.resolve([]),
    activeTab === "informations" ? getAdminLegalInformation() : Promise.resolve(null),
    activeTab === "catalogues" ? getAdminGrantCatalog() : Promise.resolve([]),
    activeTab === "catalogues" ? getAdminGrantCatalogProposals() : Promise.resolve([]),
    activeTab === "catalogues" ? getAdminPatronageCatalog() : Promise.resolve([]),
    activeTab === "emails" ? getAdminPlatformEmailTemplates() : Promise.resolve([]),
    activeTab === "ia" ? getAdminAiSettings() : Promise.resolve(null),
    activeTab === "ia" ? getAdminRagDocuments() : Promise.resolve([]),
    activeTab === "ia" || activeTab === "administrateurs" ? getAdminAiAccounts() : Promise.resolve([]),
    activeTab === "ia" ? getAdminWilliamQuestionEvents() : Promise.resolve([]),
    activeTab === "administrateurs" ? getAdminPlatformAdmins() : Promise.resolve([]),
    activeTab === "notifications" ? getAdminErrorGroups() : Promise.resolve([]),
  ]);
  const aiReadiness = getAiProviderReadiness();
  const companies = companySnapshot?.status === "ready" ? companySnapshot.companies : [];

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
        {allowedTabs.includes("beta") ? <AdminTab active={activeTab === "beta"} href="/admin?tab=beta" label="Accès bêta" /> : null}
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

      {activeTab === "beta" && betaSnapshot ? (
        <BetaAccessManager canManage={access.isSuperAdmin} canViewAccess={canViewAccess} signups={betaSnapshot.signups} error={betaSnapshot.error} />
      ) : activeTab === "administrateurs" ? (
        <PlatformAdminManager accounts={aiAccounts} admins={platformAdmins} />
      ) : activeTab === "notifications" ? (
        <ErrorNotificationsPanel errors={errorGroups} />
      ) : activeTab === "informations" && legalInformation ? (
        <LegalInformationForm initialValue={legalInformation} />
      ) : activeTab === "catalogues" ? (
        <div className="space-y-8">
          {access.isSuperAdmin ? <GrantCatalogProposals proposals={grantCatalogProposals} /> : null}
          <PlatformCatalogManager grants={grantCatalog} patronage={patronageCatalog} />
        </div>
      ) : activeTab === "emails" ? (
        <PlatformEmailTemplateStudio templates={platformEmailTemplates} />
      ) : activeTab === "ia" && aiSettings ? (
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
      {companySnapshot ? <CompanySupervision snapshot={companySnapshot} canManageBilling={access.isSuperAdmin} /> : null}

      {companySnapshot?.status === "ready" ? <details className="border-y border-border">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Abonnements et prévision de revenu</summary>
        <div className="space-y-4 pb-5">
          <section className="grid gap-4 md:grid-cols-2">
            <MetricCard label="Compagnies" value={companies.length.toString()} detail={`${activeCount} abonnement(s) actif(s), ${compedCount} accès offert(s)`} />
            <MetricCard label="Revenu mensuel estimé" value={formatCurrency(monthlyRevenue)} detail={`${activeCount} abonnement(s) à 19,99 EUR`} />
          </section>
          <p className="text-sm text-muted">Estimation depuis les statuts d’abonnement, projetée sur six mois. Le montant encaissé doit être vérifié dans Stripe.</p>
          <RevenueForecastChart forecast={forecast} />
        </div>
      </details> : null}

      {canViewAccess ? <details className="border-b border-border">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Connexions et navigation récentes</summary>
        <div className="space-y-3 pb-5">
          <p className="text-sm text-muted">Derniers événements enregistrés. Ils ne constituent pas une présence en temps réel.</p>
          {accessEvents.length === 0 ? <p className="py-4 text-sm text-muted">Aucun événement d’accès disponible. Vérifiez la collecte si cette liste reste vide.</p> : <div className="space-y-2">{accessEvents.map((event) => <AccessEventRow key={event.id} event={event} />)}</div>}
        </div>
      </details> : null}

      {access.isSuperAdmin ? <details className="border-b border-border">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Maintenance du site</summary>
        <div className="space-y-3 pb-5">
          <p className="text-sm text-muted">Coupe l’accès au site pour les visiteurs pendant une intervention technique.</p>
          <MaintenanceToggle active={maintenanceActive} />
        </div>
      </details> : null}

        </>
      )}
    </div>
  );
}

const adminTabMeta = {
  supervision: { title: "Supervision TaDiff", description: "Compagnies, facturation, accès et inscriptions bêta." },
  beta: { title: "Accès bêta", description: "Activer un accès offert et suivre chaque inscription jusqu’à sa première connexion." },
  retours: { title: "Retours des compagnies", description: "Bugs, idées et avis envoyés depuis le cockpit." },
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
  if (isSuperAdmin) return ["supervision", "beta", "retours", "notifications", "audience", "informations", "catalogues", "emails", "ia", "administrateurs"];
  const tabs: AdminTabId[] = [];
  if (["view_companies", "view_access"].some((permission) => permissions.includes(permission as PlatformPermission))) tabs.push("supervision");
  if (permissions.includes("view_beta")) tabs.push("beta");
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
