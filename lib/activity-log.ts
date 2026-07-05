import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Journalise une action metier dans activity_logs (migration 012).
 * Jamais bloquant : un echec de log ne doit jamais faire echouer l'action.
 */
export async function logActivity(
  action: string,
  entityType: string,
  entityLabel?: string,
) {
  if (!hasSupabaseEnv()) {
    return;
  }

  try {
    const supabase = await getSupabaseServerClient();
    await supabase.rpc("log_activity", {
      action_text: action,
      entity_type_text: entityType,
      entity_label_text: entityLabel ?? null,
    });
  } catch {
    // Silencieux : le journal est un complement, pas une dependance.
  }
}
