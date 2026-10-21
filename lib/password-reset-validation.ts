export const passwordResetRequestMessage = "Si un compte confirmé existe avec cet email, vous recevrez un lien valable 7 jours. Consultez aussi vos courriers indésirables.";
export function validPasswordResetToken(token: unknown): token is string { return typeof token === "string" && /^[a-f0-9]{64}$/.test(token); }
export function validateResetPassword(password: unknown, confirmation: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "Choisissez un mot de passe d’au moins 8 caractères.";
  if (new TextEncoder().encode(password).length > 72) return "Ce mot de passe est trop long. Choisissez-en un plus court.";
  if (password !== confirmation) return "Les deux mots de passe ne correspondent pas.";
  return null;
}
