import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";
import { getStripe, hasStripeWebhookEnv } from "@/lib/stripe/server";
import { processStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasStripeWebhookEnv() || !hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    await processStripeEvent(event, stripe);
    return NextResponse.json({ received: true });
  } catch {
    // SQL and provider errors must trigger a retry, without leaking their payload.
    return NextResponse.json({ error: "Payment synchronization unavailable" }, { status: 500 });
  }
}
