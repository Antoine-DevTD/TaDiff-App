import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/sign-out/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        type="submit"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Se déconnecter
      </button>
    </form>
  );
}
