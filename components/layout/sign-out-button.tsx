"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await getSupabaseBrowserClient().auth.signOut();
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className="rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
      type="button"
      onClick={handleSignOut}
    >
      Sortir
    </button>
  );
}
