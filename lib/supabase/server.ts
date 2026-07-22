import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "@/lib/env";

export const getSupabaseServerClient = cache(async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
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
