"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
