"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv();
    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}
