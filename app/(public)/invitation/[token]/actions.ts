"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function respondToInvitation(token: string, response: "yes" | "no") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return { ok: false, message: "Cette invitation n'est pas valide." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("respond_to_performance_invitation", {
    invitation_token: token,
    invitation_response: response,
  });

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Cette invitation n'existe plus." };
  }

  return {
    ok: true,
    message:
      response === "yes"
        ? "Votre presence est confirmee. La compagnie a bien recu votre reponse."
        : "Votre reponse a bien ete transmise a la compagnie.",
  };
}
