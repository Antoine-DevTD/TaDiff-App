export const betaPaymentEmailSubject = "Votre acces a la beta TaDiff est pret";

export const betaPaymentEmailBody = `Bonjour @prenom,

La beta TaDiff ouvre ses portes et la place de @compagnie est confirmee.

Pour activer votre acces, reglez le premier mois de beta au tarif unique de 19,99 EUR TTC avec le lien securise ci-dessous. Utilisez la meme adresse email que lors de votre inscription : @email.

@lien_paiement

Ce paiement couvre uniquement votre premier mois de beta. Aucun renouvellement automatique ne sera effectue. Les conditions de poursuite vous seront presentees separement avant toute nouvelle facturation.

Apres verification du paiement, vous recevrez votre invitation personnelle pour choisir votre mot de passe et creer l'espace de votre compagnie.

En cas de question, repondez simplement a cet email.

A tres bientot,
L'equipe TaDiff`;

export type BetaEmailContext = {
  firstName: string;
  companyName: string;
  email: string;
  paymentUrl: string;
};

export function renderBetaEmailTemplate(template: string, context: BetaEmailContext) {
  const values: Record<string, string> = {
    prenom: context.firstName,
    compagnie: context.companyName,
    email: context.email,
    lien_paiement: context.paymentUrl,
  };
  return Object.entries(values).reduce(
    (result, [token, value]) => result.replaceAll(`@${token}`, value).replaceAll(`{{${token}}}`, value),
    template,
  );
}
export function getBetaAccessStage(signup: {
  accountCreatedAt: string | null;
  invitationSentAt: string | null;
  paymentConfirmedAt: string | null;
  paymentEmailSentAt: string | null;
  lastAccessError: string;
}) {
  if (signup.lastAccessError) return "error" as const;
  if (signup.accountCreatedAt) return "account_created" as const;
  if (signup.invitationSentAt) return "invited" as const;
  if (signup.paymentConfirmedAt) return "paid" as const;
  if (signup.paymentEmailSentAt) return "payment_email_sent" as const;
  return "registered" as const;
}
