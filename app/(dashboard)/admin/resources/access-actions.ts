"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { canManageResourceEditors } from "@/lib/resource-editors-server";
import { isResourceId, RESOURCE_CONNECTION_ERROR } from "@/lib/resources-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function setResourceEditorAccess(userId: string, canEdit: boolean): Promise<{ ok: boolean; message: string }> {
  if (!isResourceId(userId) || typeof canEdit !== "boolean") return { ok: false, message: "Le compte ou le droit demandé est invalide." };
  if (!hasSupabaseEnv()) return { ok: false, message: RESOURCE_CONNECTION_ERROR };
  if (!await canManageResourceEditors()) return { ok: false, message: "Seul le superadministrateur peut attribuer ou retirer ce droit." };
  try {
    const db = await getSupabaseServerClient();
    const { data, error } = await db.rpc("admin_set_resource_editor", { p_user_id: userId, p_can_edit: canEdit });
    if (error || data !== true) {
      if (error?.message?.includes("resource_editor_superadmin")) return { ok: false, message: "Le superadministrateur conserve l’accès aux ressources." };
      if (error?.message?.includes("resource_editor_missing")) return { ok: false, message: "Ce compte n’existe plus. Rechargez la liste." };
      return { ok: false, message: "Le droit n’a pas pu être modifié. Rechargez la liste pour vérifier son état, puis réessayez." };
    }
    revalidatePath("/admin");
    revalidatePath("/admin/resources", "layout");
    revalidatePath("/resources");
    revalidatePath("/resources/manage", "layout");
    revalidatePath("/resources/manage/[id]", "page");
    return { ok: true, message: canEdit ? "Cette personne peut maintenant créer, modifier et archiver les ressources." : "Le droit de gérer les ressources a été retiré." };
  } catch { return { ok: false, message: "La connexion a été interrompue. Rechargez la liste pour vérifier le droit avant de réessayer." }; }
}
