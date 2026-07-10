import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { hasSupabaseEnv } from "@/lib/env";
import { getClientIpFromHeaders } from "@/lib/request-ip";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type AccessEventType = "login" | "signup" | "page_view";

const allowedEvents = new Set<AccessEventType>(["login", "signup", "page_view"]);

type AccessPayload = {
  eventType?: string;
  path?: string;
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: AccessPayload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const eventType: AccessEventType = allowedEvents.has(payload.eventType as AccessEventType)
    ? (payload.eventType as AccessEventType)
    : "page_view";
  const path = payload.path?.slice(0, 240) ?? null;
  const headerStore = await headers();
  const ipAddress = getClientIpFromHeaders(headerStore).slice(0, 80);
  const userAgent = headerStore.get("user-agent")?.slice(0, 500) ?? null;
  const admin = getSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id,company_id,full_name")
    .eq("id", user.id)
    .maybeSingle();

  let companyName: string | null = null;

  if (profile?.company_id) {
    const { data: company } = await admin
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle();

    companyName = company?.name ?? null;
  }

  await admin.from("access_events").insert({
    user_id: user.id,
    email: user.email ?? null,
    company_id: profile?.company_id ?? null,
    company_name: companyName,
    actor_name: profile?.full_name ?? user.email ?? "Utilisateur",
    event_type: eventType,
    path,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return new NextResponse(null, { status: 204 });
}
