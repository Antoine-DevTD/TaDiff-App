import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AiEntitlement = {
  enabled: boolean;
  unlimited: boolean;
  monthlyQuota: number;
  monthlyUsed: number;
  bonusBalance: number;
  remainingTokens: number | null;
  periodStartedAt: string;
};

export async function getAiEntitlement(): Promise<AiEntitlement | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_my_ai_entitlement");
  const entitlement = data?.[0];
  if (error || !entitlement) return null;
  return {
    enabled: entitlement.enabled,
    unlimited: entitlement.is_unlimited,
    monthlyQuota: entitlement.monthly_quota,
    monthlyUsed: entitlement.monthly_used,
    bonusBalance: entitlement.bonus_balance,
    remainingTokens: entitlement.remaining_tokens < 0 ? null : entitlement.remaining_tokens,
    periodStartedAt: entitlement.period_started_at,
  };
}
