export const legalInformation = {
  serviceName: "TaDiff",
  operatorName: process.env.NEXT_PUBLIC_LEGAL_NAME || "ARKENCIEL Compagnie",
  operatorLegalForm: process.env.NEXT_PUBLIC_LEGAL_FORM || "Forme juridique a completer",
  operatorAddress: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "Adresse du siege a completer avant la beta",
  operatorRegistration: process.env.NEXT_PUBLIC_LEGAL_REGISTRATION || "SIREN et RCS a completer",
  operatorVat: process.env.NEXT_PUBLIC_LEGAL_VAT || "Numero de TVA a completer si applicable",
  publicationDirector: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR || "Directeur de publication a completer avant la beta",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "contact@tadiff.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact@tadiff.com",
  billingEmail: process.env.NEXT_PUBLIC_BILLING_EMAIL || "contact@tadiff.com",
  betaPrice: process.env.NEXT_PUBLIC_BETA_PRICE || "19,99 EUR TTC par mois",
  legalVersion: process.env.NEXT_PUBLIC_LEGAL_VERSION || "1.0",
};
