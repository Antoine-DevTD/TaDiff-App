import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { isResourceId, RESOURCE_CONNECTION_ERROR } from "@/lib/resources-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ResourceEditorAccount, ResourceLoadResult } from "@/types/resources";

export async function canManageResourceEditors(): Promise<boolean> {
  noStore();
  if (!hasSupabaseEnv()) return false;
  try {
    const db = await getSupabaseServerClient();
    const { data: identity, error: identityError } = await db.auth.getUser();
    if (identityError || !identity.user) return false;
    const { data, error } = await db.rpc("is_super_admin_user");
    return !error && data === true;
  } catch { return false; }
}

export async function listResourceEditorAccounts(): Promise<ResourceLoadResult<ResourceEditorAccount[]>> {
  noStore();
  if (!hasSupabaseEnv()) return { data: [], error: RESOURCE_CONNECTION_ERROR };
  if (!await canManageResourceEditors()) return { data: [], error: "L’attribution des droits sur les ressources est réservée au superadministrateur." };
  try {
    const db = await getSupabaseServerClient();
    const accounts: ResourceEditorAccount[] = [];
    const identifiers = new Set<string>();
    for (let offset = 0; offset < 100000; offset += 200) {
      const { data, error } = await db.rpc("admin_list_resource_editors", { p_limit: 200, p_offset: offset });
      if (error || !Array.isArray(data)) throw new Error("resource_editors_load_failed");
      for (const row of data) {
        if (!isResourceId(row.user_id) || identifiers.has(row.user_id) || typeof row.full_name !== "string" || typeof row.email !== "string" || typeof row.company_name !== "string"
          || typeof row.is_super_admin !== "boolean" || typeof row.can_edit !== "boolean" || (row.granted_at !== null && typeof row.granted_at !== "string")) throw new Error("resource_editors_invalid");
        identifiers.add(row.user_id);
        accounts.push({ userId: row.user_id, fullName: row.full_name, email: row.email, companyName: row.company_name, isSuperAdmin: row.is_super_admin, canEdit: row.can_edit, grantedAt: row.granted_at });
      }
      if (data.length < 200) return { data: accounts, error: null };
    }
    throw new Error("resource_editors_load_limit");
  } catch { return { data: [], error: "Impossible de charger tous les comptes. Vérifiez la connexion et l’installation des droits sur les ressources, puis réessayez." }; }
}
