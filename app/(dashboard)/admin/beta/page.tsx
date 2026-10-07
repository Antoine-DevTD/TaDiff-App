import { notFound } from "next/navigation";
import { BetaAccessManager } from "@/components/admin/beta-access-manager";
import Link from "next/link";
import { getAdminBetaSupervision, getPlatformAdminAccess } from "@/lib/supabase/admin";

export default async function AdminBetaPage() {
  const access = await getPlatformAdminAccess();
  if (!access.isSuperAdmin && !access.permissions.includes("view_beta")) notFound();
  const { signups, error } = await getAdminBetaSupervision();
  return <div className="space-y-6"><header><Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-accent">Supervision des compagnies</Link><h1 className="mt-2 text-3xl font-semibold">Accès bêta</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Inscriptions, comptes créés et accès offerts.</p></header><BetaAccessManager canManage={access.isSuperAdmin} canViewAccess={access.isSuperAdmin || access.permissions.includes("view_access")} signups={signups} error={error} /></div>;
}
