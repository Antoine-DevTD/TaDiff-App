import { notFound } from "next/navigation";
import { CompanyWorkflowPanel } from "@/components/admin/company-workflow-panel";
import { Card } from "@/components/ui/card";
import { getAdminCompanyWorkflowMetrics, getPlatformAdminAccess } from "@/lib/supabase/admin";

export default async function AdminCompaniesPage() {
  const access = await getPlatformAdminAccess();
  if (!access.isSuperAdmin && !access.permissions.includes("view_companies")) notFound();
  const companies = await getAdminCompanyWorkflowMetrics();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Console interne</p>
        <h1 className="mt-2 text-3xl font-semibold">Parcours des compagnies</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Comprenez les espaces adoptés et les prochaines étapes utiles sans ouvrir les contacts,
          documents, montants ou contenus saisis par les compagnies.
        </p>
      </header>
      {companies ? <CompanyWorkflowPanel companies={companies} /> : (
        <Card className="border-warning/35 bg-warning/5 p-5">
          <p className="font-semibold">Les statistiques ne sont pas encore disponibles.</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Vérifiez que la migration 073 a été appliquée, puis rechargez cette page.
          </p>
        </Card>
      )}
    </div>
  );
}
