export const betaPaymentEmailSubject = "Votre accès à la bêta TaDiff est prêt";

export const betaPaymentEmailBody = `Bonjour @prenom,

La bêta TaDiff ouvre ses portes et la place de @compagnie est confirmée.

Pour activer votre accès, réglez le premier mois de bêta au tarif unique de 19,99 EUR TTC avec le lien sécurisé ci-dessous. Utilisez la même adresse email que lors de votre inscription : @email.

@lien_paiement

Ce paiement couvre uniquement votre premier mois de bêta. Aucun renouvellement automatique ne sera effectué. Les conditions de poursuite vous seront présentées séparément avant toute nouvelle facturation.

Après vérification du paiement, vous recevrez votre invitation personnelle pour choisir votre mot de passe et créer l’espace de votre compagnie.

En cas de question, répondez simplement à cet email.

À très bientôt,
L’équipe TaDiff`;

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
