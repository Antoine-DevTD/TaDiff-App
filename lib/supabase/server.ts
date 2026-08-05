import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "@/lib/env";

export const getSupabaseServerClient = cache(async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    global: {
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (!response.ok) {
          const payload = await response.clone().json().catch(() => null) as { code?: string; message?: string } | null;
          const code = payload?.code ?? "";
          if (response.status >= 500 || code.startsWith("42") || code.startsWith("PGRST")) {
            const { reportApplicationError } = await import("@/lib/error-reporting");
            await reportApplicationError({ message: payload?.message || `Erreur Supabase ${response.status}`, code, route: typeof input === "string" ? new URL(input).pathname : "supabase", source: "supabase" });
          }
        }
        return response;
      },
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; Route Handlers and Actions can.
        }
      },
    },
  });
});

export const getSupabaseServerUser = cache(async function getSupabaseServerUser() {
  const supabase = await getSupabaseServerClient();
  return supabase.auth.getUser();
});
