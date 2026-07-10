import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getMaintenanceTokenResponse,
  isMaintenanceBypassed,
  isMaintenanceModeActive,
} from "@/lib/maintenance";

const protectedRoutes = [
  "/admin",
  "/dashboard",
  "/shows",
  "/contacts",
  "/pipeline",
  "/reminders",
  "/calendar",
  "/subventions",
  "/mecenat",
  "/campaigns",
  "/contracts",
  "/finances",
  "/documents",
  "/billing",
  "/settings",
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAlwaysAllowedPath(pathname: string) {
  return (
    pathname === "/maintenance" ||
    pathname === "/api/stripe/webhook" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    pathname.includes(".")
  );
}

export async function proxy(request: NextRequest) {
  const tokenResponse = getMaintenanceTokenResponse(request);

  if (tokenResponse) {
    return tokenResponse;
  }

  if (
    !isAlwaysAllowedPath(request.nextUrl.pathname) &&
    !isMaintenanceBypassed(request) &&
    (await isMaintenanceModeActive())
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    url.search = "";
    const response = NextResponse.rewrite(url);
    response.headers.set("x-robots-tag", "noindex");
    response.headers.set("retry-after", "3600");
    return response;
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
