const [emailInput, firstNameInput = "", companyNameInput = ""] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
const firstName = firstNameInput.trim() || "bonjour";
const companyName = companyNameInput.trim() || "votre compagnie";
const apiKey = process.env.RESEND_API_KEY?.trim();
const paymentUrl = process.env.BETA_PAYMENT_LINK_URL?.trim();
const from = process.env.BETA_SIGNUP_NOTIFICATION_FROM?.trim() || "TaDiff <support@tadiff.com>";

if (!email || !email.includes("@")) {
  console.error('Usage : npm run beta:email -- "email@compagnie.fr" "Prenom" "Nom de la compagnie"');
  process.exit(1);
}

if (!apiKey || !paymentUrl) {
  console.error("Variables requises : RESEND_API_KEY et BETA_PAYMENT_LINK_URL.");
  process.exit(1);
}

let parsedPaymentUrl;
try {
  parsedPaymentUrl = new URL(paymentUrl);
} catch {
  console.error("BETA_PAYMENT_LINK_URL doit etre une URL HTTPS valide.");
  process.exit(1);
}

if (parsedPaymentUrl.protocol !== "https:") {
  console.error("BETA_PAYMENT_LINK_URL doit utiliser HTTPS.");
  process.exit(1);
}

const subject = "Votre acces a la beta TaDiff est pret";
const text = [
  `Bonjour ${firstName},`,
  "",
  `La beta TaDiff ouvre ses portes et la place de ${companyName} est confirmee.`,
  "",
  "TaDiff reunit vos spectacles, contacts, dates, dossiers, financements et priorites dans un meme cockpit. William, notre assistant IA, vous accompagnera pendant la prise en main.",
  "",
  "Pour activer votre acces :",
  "1. Reglez votre premier mois de beta a 19,99 EUR TTC avec le lien securise ci-dessous.",
  "2. Utilisez la meme adresse email que celle de votre inscription.",
  "3. Apres confirmation du paiement, vous recevrez votre invitation personnelle TaDiff dans un delai maximal d'un jour ouvre.",
  "4. Choisissez votre mot de passe, renseignez votre compagnie et suivez la visite guidee.",
  "",
  paymentUrl,
  "",
  "Ce paiement couvre uniquement votre premier mois de beta. Aucun renouvellement automatique ne sera effectue. Les conditions de poursuite vous seront presentees separement avant toute nouvelle facturation.",
  "",
  "Pour bien demarrer, vous pouvez preparer le logo de votre compagnie, le nom d'un premier spectacle et quelques contacts ou un fichier Excel.",
  "",
  "En cas de question, repondez simplement a cet email ou ecrivez a support@tadiff.com.",
  "",
  "A tres bientot,",
  "L'equipe TaDiff",
].join("\n");

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ from, to: [email], subject, text }),
});

if (!response.ok) {
  console.error(`Email non envoye : Resend a repondu ${response.status}.`);
  process.exit(1);
}

console.log(`Mail de paiement envoye a ${email} pour ${companyName}.`);
