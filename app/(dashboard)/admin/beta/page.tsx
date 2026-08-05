import { notFound } from "next/navigation";
import { BetaAccessManager } from "@/components/admin/beta-access-manager";
import { getAdminBetaSignups, getPlatformAdminAccess } from "@/lib/supabase/admin";

export default async function AdminBetaPage() {
  const access = await getPlatformAdminAccess();
  if (!access.isSuperAdmin && !access.permissions.includes("view_beta")) notFound();
  const signups = await getAdminBetaSignups();
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Console interne</p><h1 className="mt-2 text-3xl font-semibold">Acces beta</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Envoyez le paiement, verifiez-le dans Stripe puis ouvrez l&apos;acces personnel de chaque compagnie.</p></header><BetaAccessManager canManage={access.isSuperAdmin} signups={signups} /></div>;
}
