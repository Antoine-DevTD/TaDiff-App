import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";

type AnalyticsEventType = "page_view" | "cta_click" | "beta_signup";
type AnalyticsDeviceType = "mobile" | "tablet" | "desktop";

const eventTypes = new Set<AnalyticsEventType>(["page_view", "cta_click", "beta_signup"]);
const deviceTypes = new Set<AnalyticsDeviceType>(["mobile", "tablet", "desktop"]);
const publicPathPattern = /^\/(?:$|beta(?:\/|$)|pricing(?:\/|$)|cgu(?:\/|$)|cgv(?:\/|$)|confidentialite(?:\/|$)|cookies(?:\/|$)|mentions-legales(?:\/|$)|annexe-rgpd(?:\/|$))/;
const namePattern = /^[a-z0-9_-]{1,64}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AnalyticsBody = {
  sessionId?: string;
  eventType?: string;
  path?: string;
  eventName?: string;
  target?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  deviceType?: string;
};

function clean(value: string | undefined, maxLength: number) {
  return value?.trim().slice(0, maxLength) || null;
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminEnv()) return new NextResponse(null, { status: 204 });

  const origin = request.headers.get("origin");
  const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host : "";
  } catch {
    originHost = "";
  }
  if (!originHost || !expectedHost || originHost !== expectedHost) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: AnalyticsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (
    !body.sessionId ||
    !uuidPattern.test(body.sessionId) ||
    !body.eventType ||
    !eventTypes.has(body.eventType as AnalyticsEventType) ||
    !body.path ||
    !publicPathPattern.test(body.path) ||
    !body.deviceType ||
    !deviceTypes.has(body.deviceType as AnalyticsDeviceType)
  ) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  if (body.eventType === "cta_click" && (!body.eventName || !namePattern.test(body.eventName))) {
    return NextResponse.json({ error: "Invalid CTA" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const eventType = body.eventType as AnalyticsEventType;
  const deviceType = body.deviceType as AnalyticsDeviceType;
  const { error } = await admin.from("public_analytics_events").insert({
    session_id: body.sessionId,
    event_type: eventType,
    path: body.path.slice(0, 160),
    event_name: clean(body.eventName, 64),
    target: clean(body.target, 160),
    referrer_host: clean(body.referrerHost, 120),
    utm_source: clean(body.utmSource, 100),
    utm_medium: clean(body.utmMedium, 100),
    utm_campaign: clean(body.utmCampaign, 120),
    utm_content: clean(body.utmContent, 120),
    device_type: deviceType,
  });

  if (error) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  return new NextResponse(null, { status: 204 });
}
