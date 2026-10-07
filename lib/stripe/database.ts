import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { Database, Json } from "@/types/database.types";

type Rpc<Args> = { Args: Args; Returns: Json };
type StripeDatabase = Omit<Database, "public"> & { public: Omit<Database["public"], "Functions"> & {
  Functions: Database["public"]["Functions"] & {
    prepare_stripe_checkout: Rpc<{ p_company_id: string; p_actor_id: string; p_plan_code: string; p_price_id: string }>;
    bind_stripe_checkout_customer: Rpc<{ p_attempt_id: string; p_customer_id: string }>;
    finish_stripe_checkout: Rpc<{ p_attempt_id: string; p_session_id: string; p_url: string; p_expires_at: string }>;
    expire_stripe_checkout: Rpc<{ p_attempt_id: string; p_session_id: string }>;
    apply_stripe_billing_event: Rpc<{
      p_event_id: string; p_event_created: number; p_event_type: string; p_company_id: string;
      p_customer_id: string; p_subscription_id: string; p_price_id: string; p_plan_code: string;
      p_status: string; p_payment_confirmed: boolean; p_current_period_end: string | null; p_checkout_attempt_id: string | null;
    }>;
  };
} };

export function getStripeDatabase() {
  return getSupabaseAdminClient() as unknown as SupabaseClient<StripeDatabase>;
}

export function rpcObject(data: Json | null): Record<string, Json | undefined> {
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}
