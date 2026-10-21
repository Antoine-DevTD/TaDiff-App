import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { PasswordResetBackend } from "@/lib/password-reset";

export function passwordResetBackend(): PasswordResetBackend {
  const client = getSupabaseAdminClient();
  return {
    rpc: (name, args) => {
      switch (name) {
        case "issue_password_reset_link": return client.rpc(name, { p_email: args.p_email, p_token_hash: args.p_token_hash });
        case "inspect_password_reset_link": return client.rpc(name, { p_token_hash: args.p_token_hash });
        case "claim_password_reset_link": return client.rpc(name, { p_token_hash: args.p_token_hash });
        case "release_password_reset_claim": return client.rpc(name, { p_claim_id: args.p_claim_id });
        case "password_reset_claim_applied": return client.rpc(name, { p_claim_id: args.p_claim_id });
        default: throw new Error("Unsupported password reset operation");
      }
    },
    changePassword: async (userId, password, claimId) => {
      const { error } = await client.auth.admin.updateUserById(userId, {
        password,
        app_metadata: { tadiff_password_reset_claim: claimId },
      });
      return { error };
    },
  };
}

export async function sendPasswordResetEmail(email: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Password reset email unavailable");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.BETA_SIGNUP_NOTIFICATION_FROM?.trim() || "TaDiff <noreply@tadiff.com>",
      to: [email],
      subject: "Choisissez un nouveau mot de passe TaDiff",
      text: ["Bonjour,", "", "Pour choisir un nouveau mot de passe TaDiff, ouvrez ce lien :", url, "", "Ce lien est valable 7 jours. Vous pouvez l’ouvrir plusieurs fois ; il est désactivé après l’enregistrement du nouveau mot de passe.", "", "Si vous n’avez pas demandé ce changement, vous pouvez ignorer cet email."].join("\n"),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Password reset email provider unavailable");
}
