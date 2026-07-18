export type PublicAnalyticsEventType = "page_view" | "cta_click" | "beta_signup";

const sessionKey = "tadiff_public_analytics_session";
const optOutKey = "tadiff_analytics_opt_out";
const attributionKey = "tadiff_public_analytics_attribution";

type PublicAnalyticsPayload = {
  eventType: PublicAnalyticsEventType;
  path?: string;
  eventName?: string;
  target?: string;
};

function getSessionId() {
  const existing = window.sessionStorage.getItem(sessionKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(sessionKey, created);
  return created;
}

function getDeviceType() {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

function getReferrerHost() {
  if (!document.referrer) return "";
  try {
    const referrer = new URL(document.referrer);
    return referrer.host === window.location.host ? "" : referrer.host;
  } catch {
    return "";
  }
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  const current = {
    referrerHost: getReferrerHost(),
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    utmContent: params.get("utm_content") || "",
  };
  const hasCurrentAttribution = Object.values(current).some(Boolean);

  if (hasCurrentAttribution) {
    window.sessionStorage.setItem(attributionKey, JSON.stringify(current));
    return current;
  }

  try {
    const stored = window.sessionStorage.getItem(attributionKey);
    return stored ? (JSON.parse(stored) as typeof current) : current;
  } catch {
    return current;
  }
}

export function isPublicAnalyticsEnabled() {
  const preference = window.localStorage.getItem(optOutKey);
  if (preference === "1") return false;
  if (preference === "0") return true;
  return navigator.doNotTrack !== "1";
}

export function setPublicAnalyticsEnabled(enabled: boolean) {
  if (enabled) {
    window.localStorage.setItem(optOutKey, "0");
  } else {
    window.localStorage.setItem(optOutKey, "1");
    window.sessionStorage.removeItem(sessionKey);
    window.sessionStorage.removeItem(attributionKey);
  }
}

export function trackPublicEvent(payload: PublicAnalyticsPayload) {
  if (!isPublicAnalyticsEnabled()) return;

  const attribution = getAttribution();
  const body = JSON.stringify({
    ...payload,
    sessionId: getSessionId(),
    path: (payload.path || window.location.pathname).slice(0, 160),
    ...attribution,
    deviceType: getDeviceType(),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics/public",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }

  void fetch("/api/analytics/public", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}
