"use client";

import { LogOut } from "lucide-react";
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
      className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
      type="button"
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Se deconnecter
    </button>
  );
}
