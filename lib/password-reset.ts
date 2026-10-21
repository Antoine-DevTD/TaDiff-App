import { createHash, randomBytes } from "node:crypto";
import { validPasswordResetToken, validateResetPassword } from "@/lib/password-reset-validation";
export { passwordResetRequestMessage } from "@/lib/password-reset-validation";

export const PASSWORD_RESET_DAYS = 7;

export type ResetLinkStatus = "ready" | "expired" | "used" | "invalid" | "busy";
export type ResetResult = { status: ResetLinkStatus | "changed" | "error"; expiresAt?: string; message?: string };
type RpcResult = { data: unknown; error: { message: string } | null };
export type PasswordResetBackend = {
  rpc: (name: string, args: Record<string, string>) => PromiseLike<RpcResult>;
  changePassword: (userId: string, password: string, claimId: string) => Promise<{ error: { code?: string } | null }>;
};

export function newPasswordResetToken() { return randomBytes(32).toString("hex"); }
export function passwordResetHash(token: string) { return createHash("sha256").update(`tadiff:password-reset:v1:${token}`).digest("hex"); }
export function passwordResetUrl(origin: string, token: string) {
  const url = new URL("/reset-password", origin);
  // Le secret ne passe ni dans les journaux HTTP ni dans l'en-tête Referer.
  url.hash = new URLSearchParams({ recovery: token }).toString();
  return url.toString();
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function linkResult(data: unknown): ResetResult {
  const row = object(data);
  const status = ["ready", "expired", "used", "busy"].includes(String(row.status)) ? row.status as ResetLinkStatus : "invalid";
  return { status, ...(typeof row.expiresAt === "string" ? { expiresAt: row.expiresAt } : {}) };
}

export async function inspectResetLink(backend: PasswordResetBackend, token: unknown): Promise<ResetResult> {
  if (!validPasswordResetToken(token)) return { status: "invalid" };
  const { data, error } = await backend.rpc("inspect_password_reset_link", { p_token_hash: passwordResetHash(token) });
  if (error) return { status: "error", message: "Le lien n’a pas pu être vérifié. Réessayez dans un instant." };
  return linkResult(data);
}

export async function issueResetLink(backend: PasswordResetBackend, email: string, origin: string) {
  const token = newPasswordResetToken();
  const { data, error } = await backend.rpc("issue_password_reset_link", { p_email: email.trim().toLowerCase(), p_token_hash: passwordResetHash(token) });
  if (error) throw new Error("Password reset issuance unavailable");
  const row = object(data);
  if (row.status !== "issued") return null;
  if (typeof row.email !== "string" || typeof row.expiresAt !== "string") throw new Error("Invalid password reset issuance");
  return { url: passwordResetUrl(origin, token), email: row.email, expiresAt: row.expiresAt };
}

export async function completeReset(backend: PasswordResetBackend, token: unknown, password: unknown, confirmation: unknown): Promise<ResetResult> {
  if (!validPasswordResetToken(token)) return { status: "invalid" };
  const validation = validateResetPassword(password, confirmation);
  if (validation) return { status: "error", message: validation };
  const { data, error } = await backend.rpc("claim_password_reset_link", { p_token_hash: passwordResetHash(token) });
  if (error) return { status: "error", message: "L’enregistrement n’a pas pu démarrer. Réessayez." };
  const claim = object(data);
  if (claim.status !== "claimed") return linkResult(data);
  if (typeof claim.userId !== "string" || typeof claim.claimId !== "string") return { status: "error", message: "L’enregistrement n’a pas pu démarrer. Réessayez." };
  try {
    const result = await backend.changePassword(claim.userId, password as string, claim.claimId);
    if (result.error) {
      // L'API Auth peut avoir validé avant une coupure réseau. Le trigger a alors
      // consommé le lien dans la même transaction que le changement de mot de passe.
      const applied = await backend.rpc("password_reset_claim_applied", { p_claim_id: claim.claimId });
      if (!applied.error && applied.data === true) return { status: "changed" };
      const state = await inspectResetLink(backend, token);
      if (state.status === "used") return state;
      await backend.rpc("release_password_reset_claim", { p_claim_id: claim.claimId });
      const message = result.error.code === "same_password" ? "Choisissez un mot de passe différent de l’ancien."
        : result.error.code === "weak_password" ? "Ce mot de passe est trop facile à deviner. Choisissez-en un autre."
          : "Le mot de passe n’a pas pu être enregistré. Vous pouvez réessayer avec ce lien.";
      return { status: "error", message };
    }
    return { status: "changed" };
  } catch {
    const applied = await Promise.resolve(backend.rpc("password_reset_claim_applied", { p_claim_id: claim.claimId })).catch(() => null);
    if (applied && !applied.error && applied.data === true) return { status: "changed" };
    const state = await inspectResetLink(backend, token).catch(() => ({ status: "error" as const }));
    if (state.status === "used") return state;
    // En cas d'issue inconnue, ne pas libérer une requête Auth encore en cours.
    // Sa réservation expirera ; le trigger refusera ensuite sa validation tardive.
    return { status: "error", message: "La connexion a été interrompue. Réessayez dans deux minutes avec ce lien." };
  }
}
