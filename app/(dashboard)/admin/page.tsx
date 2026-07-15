import { notFound } from "next/navigation";
import Link from "next/link";
import { CompanyBillingForm } from "@/components/admin/company-billing-form";
import { FeedbackRow } from "@/components/admin/feedback-row";
import { MaintenanceToggle } from "@/components/admin/maintenance-toggle";
import { RevenueForecastChart } from "@/components/admin/revenue-forecast-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildRevenueForecast } from "@/lib/admin-forecast";
import { formatCurrency } from "@/lib/finance";
import {
  getAdminBetaSignups,
  getAdminAccessEvents,
  getAdminCompanies,
  getAdminFeedback,
  getAdminMaintenanceMode,
  isSuperAdmin,
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
  if (!(await isSuperAdmin())) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams?.tab === "retours" ? "retours" : "supervision";
  const [companies, betaSignups, feedback, accessEvents, maintenanceActive] = await Promise.all([
    getAdminCompanies(),
    getAdminBetaSignups(),
    getAdminFeedback(),
    getAdminAccessEvents(60),
    getAdminMaintenanceMode(),
  ]);

  const activeCount = companies.filter((company) => company.billingStatus === "active").length;
  const compedCount = companies.filter((company) => company.billingStatus === "comped").length;
  const reserved = betaSignups.filter((signup) => signup.status === "reserved");
  const waitlist = betaSignups.filter((signup) => signup.status === "waitlist");
  const monthlyRevenue = activeCount * 19.99;
  const forecast = buildRevenueForecast(companies);
  const openFeedback = feedback.filter((entry) => entry.status !== "traite").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Console interne</p>
        <h2 className="mt-2 text-3xl font-semibold">
          {activeTab === "retours" ? "Retours compagnies" : "Supervision TaDiff"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {activeTab === "retours"
            ? "Bugs, idees et avis envoyes depuis le cockpit."
            : "Reservee aux super admins. Compagnies, billing et inscriptions beta."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        <AdminTab active={activeTab === "supervision"} href="/admin" label="Supervision" />
        <AdminTab
          active={activeTab === "retours"}
          href="/admin?tab=retours"
          label={`Retours${openFeedback > 0 ? ` (${openFeedback})` : ""}`}
        />
      </div>

      {activeTab === "retours" ? (
        <AdminFeedbackPanel feedback={feedback} openFeedback={openFeedback} />
      ) : (
        <>
      <Card className="space-y-3 p-5">
        <div>
          <p className="text-base font-semibold">Mode maintenance</p>
          <p className="mt-1 text-sm text-muted">
            Coupe l&apos;acces au site pour tous les visiteurs (bascule immediate, pas de
            redeploiement). A utiliser pendant une intervention technique.
          </p>
        </div>
        <MaintenanceToggle active={maintenanceActive} />
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Compagnies" value={companies.length.toString()} detail={`${activeCount} active(s), ${compedCount} offerte(s)`} />
        <MetricCard label="MRR beta" value={formatCurrency(monthlyRevenue)} detail={`${activeCount} abonnement(s) a 19,99 EUR`} />
        <MetricCard label="Beta reservee" value={`${reserved.length}/30`} detail="Places confirmees" />
        <MetricCard label="Liste d'attente" value={waitlist.length.toString()} detail="Compagnies en attente" />
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
            Statut d&apos;abonnement, volumes et derniere activite. Le billing se gere ici sans
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
              <CompanyRow key={company.id} company={company} />
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-semibold">Acces recents</p>
          <p className="mt-1 text-sm text-muted">
            Connexions et navigation authentifiee. A utiliser pour verifier quel compte accede a
            l&apos;application, depuis quelle IP et quel navigateur.
          </p>
        </div>
        {accessEvents.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
            Aucun acces journalise pour le moment. Appliquer la migration 021 et verifier
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

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-semibold">Inscriptions beta</p>
          <p className="mt-1 text-sm text-muted">
            30 places reservees puis liste d&apos;attente, dans l&apos;ordre d&apos;arrivee.
          </p>
        </div>
        {betaSignups.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
            Aucune inscription beta pour le moment.
          </p>
        ) : (
          <div className="space-y-2">
            {betaSignups.map((signup) => (
              <div
                key={signup.id}
                className="flex flex-col gap-2 rounded-md border border-border bg-panel-strong/35 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    #{signup.position} {signup.companyName}
                    <span className="ml-2 font-normal text-muted">
                      {signup.contactName} · {signup.email}
                      {signup.city ? ` · ${signup.city}` : ""}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {signup.discipline} — {signup.mainNeed}
                  </p>
                </div>
                <Badge tone={signup.status === "reserved" ? "success" : "neutral"}>
                  {signup.status === "reserved" ? "Place reservee" : "Liste d'attente"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
        </>
      )}
    </div>
  );
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
          <Badge tone="warning">{openFeedback} a traiter</Badge>
        ) : (
          <Badge tone="success">A jour</Badge>
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

function CompanyRow({ company }: { company: AdminCompany }) {
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
              : "aucune activite journalisee"}
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
      <div className="mt-3">
        <CompanyBillingForm company={company} />
      </div>
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
      <p className="text-[11px] text-muted">{label}</p>
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
