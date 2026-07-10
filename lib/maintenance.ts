import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpFromHeaders } from "@/lib/request-ip";

const bypassCookie = "tadiff_maintenance_bypass";

export function isMaintenanceModeEnabled() {
  return ["1", "true", "yes", "on"].includes(
    (process.env.TADIFF_MAINTENANCE_MODE ?? "").toLowerCase(),
  );
}

type MaintenanceCache = { value: boolean; expiresAt: number };

let maintenanceCache: MaintenanceCache | null = null;
const MAINTENANCE_CACHE_TTL_MS = 5000;

async function fetchMaintenanceModeFromDb(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return false;
  }

  try {
    const response = await fetch(`${url}/rest/v1/app_settings?select=maintenance_mode&limit=1`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const rows = (await response.json()) as { maintenance_mode: boolean }[];
    return rows[0]?.maintenance_mode ?? false;
  } catch {
    return false;
  }
}

/**
 * Etat effectif du mode maintenance : bascule DB (reglable depuis /admin) OU
 * variable d'env TADIFF_MAINTENANCE_MODE (bascule d'urgence, prioritaire).
 * Cache court cote edge pour eviter une requete DB a chaque requete.
 */
export async function isMaintenanceModeActive() {
  if (isMaintenanceModeEnabled()) {
    return true;
  }

  if (maintenanceCache && maintenanceCache.expiresAt > Date.now()) {
    return maintenanceCache.value;
  }

  const value = await fetchMaintenanceModeFromDb();
  maintenanceCache = { value, expiresAt: Date.now() + MAINTENANCE_CACHE_TTL_MS };
  return value;
}

export function getMaintenanceAllowedIps() {
  return (process.env.TADIFF_MAINTENANCE_ALLOWED_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

export function isMaintenanceBypassed(request: NextRequest) {
  const allowedIps = getMaintenanceAllowedIps();
  const clientIp = getClientIpFromHeaders(request.headers);

  if (allowedIps.includes(clientIp)) {
    return true;
  }

  const bypassToken = process.env.TADIFF_MAINTENANCE_BYPASS_TOKEN;

  if (!bypassToken) {
    return false;
  }

  return request.cookies.get(bypassCookie)?.value === bypassToken;
}

export function getMaintenanceTokenResponse(request: NextRequest) {
  const bypassToken = process.env.TADIFF_MAINTENANCE_BYPASS_TOKEN;
  const providedToken = request.nextUrl.searchParams.get("maintenance_token");

  if (!bypassToken || providedToken !== bypassToken) {
    return null;
  }

  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete("maintenance_token");

  const response = NextResponse.redirect(cleanUrl);
  response.cookies.set(bypassCookie, bypassToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
