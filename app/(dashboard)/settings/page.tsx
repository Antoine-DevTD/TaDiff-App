import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CompanyDocumentsPanel } from "@/components/settings/company-documents-panel";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { TeamAccessPanel } from "@/components/settings/team-access-panel";
import { AiCreditsPanel } from "@/components/settings/ai-credits-panel";
import { getAiEntitlement } from "@/lib/ai/entitlement";
import { demoWebinarEmail } from "@/lib/demo-webinar";
import { hasSupabaseEnv } from "@/lib/env";
import { getWorkspaceAccess, type BillingStatus, type CompanyRole } from "@/lib/supabase/access";
import { isSuperAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getDashboardData,
  getCompanyDocuments,
  getCompanyInviteCode,
  getCompanyMembers,
  getCompanyProfile,
} from "@/lib/supabase/queries";

export default async function SettingsPage() {
  const supabase = hasSupabaseEnv() ? await getSupabaseServerClient() : null;
  const currentUser = supabase ? (await supabase.auth.getUser()).data.user : null;
  const isWebinarDemo = currentUser?.email?.toLowerCase() === demoWebinarEmail;
  const [
    dashboard,
    access,
    superAdmin,
    companyProfile,
    members,
    inviteCode,
    companyDocuments,
    aiEntitlement,
  ] = await Promise.all([
    getDashboardData(),
    getWorkspaceAccess(),
    isSuperAdmin(),
    getCompanyProfile(),
    getCompanyMembers(),
    getCompanyInviteCode(),
    getCompanyDocuments(),
    getAiEntitlement(),
  ]);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Spectacles" value={dashboard.shows.length.toString()} detail="Catalogue" />
        <MetricCard label="Contacts" value={dashboard.contacts.length.toString()} detail="Carnet de contacts" />
        <MetricCard label="Dates" value={dashboard.pipelineDeals.length.toString()} detail="Dates a vendre" />
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

      <AiCreditsPanel canManage={access.canManage} entitlement={aiEntitlement} />

      {isWebinarDemo ? (
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Parcours du webinaire</p>
            <p className="mt-1 text-sm text-muted">
              Rejouez le parcours depuis l&apos;inscription. Les spectacles du compte sont retirés
              avant de relancer l&apos;accueil de William et la visite guidée.
            </p>
          </div>
          <ButtonLink href="/demo-signup">Relancer la démonstration complète</ButtonLink>
        </Card>
      ) : null}

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
