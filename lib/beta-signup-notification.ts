type BetaSignupNotification = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  discipline: string;
  mainNeed: string;
  position: number;
  status: "reserved" | "waitlist";
};

type NotificationResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "provider_error" };

export async function notifyBetaSignup(
  signup: BetaSignupNotification,
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient =
    process.env.BETA_SIGNUP_NOTIFICATION_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    "contact@tadiff.com";
  const from =
    process.env.BETA_SIGNUP_NOTIFICATION_FROM?.trim() ||
    "TaDiff <noreply@tadiff.com>";

  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `Nouvelle demande bêta — ${signup.companyName}`,
        text: [
          "Une nouvelle demande d'inscription à la bêta TaDiff vient d'être enregistrée.",
          "",
          `Compagnie : ${signup.companyName}`,
          `Contact : ${signup.contactName}`,
          `Email : ${signup.email}`,
          `Téléphone : ${signup.phone || "Non renseigné"}`,
          `Ville : ${signup.city || "Non renseignée"}`,
          `Discipline : ${signup.discipline}`,
          `Besoin principal : ${signup.mainNeed || "Non renseigné"}`,
          `Statut : ${signup.status === "reserved" ? "Place réservée" : "Liste d'attente"}`,
          `Position : ${signup.position}`,
          "",
          "La demande est disponible dans l'onglet Bêta du super-admin TaDiff.",
        ].join("\n"),
      }),
    });
  } catch {
    console.error("Beta signup notification failed", {
      provider: "resend",
      reason: "network_error",
    });
    return { sent: false, reason: "provider_error" };
  }

  if (!response.ok) {
    console.error("Beta signup notification failed", {
      provider: "resend",
      status: response.status,
    });
    return { sent: false, reason: "provider_error" };
  }

  return { sent: true };
}

export async function sendBetaWelcomeEmail(
  signup: BetaSignupNotification,
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.BETA_SIGNUP_NOTIFICATION_FROM?.trim() ||
    "TaDiff Support <support@tadiff.com>";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "https://tadiff.com";
  const calendarUrl = `${appUrl}/api/beta-launch-calendar`;

  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [signup.email],
        subject: "Bienvenue dans la bêta TaDiff — rendez-vous le 6 août",
        text: [
          `Bonjour ${signup.contactName},`,
          "",
          `C'est confirmé : la place de ${signup.companyName} dans la bêta TaDiff est réservée.`,
          "",
          "On se donne rendez-vous le 6 août 2026 pour l'ouverture de votre cockpit.",
          "L'ouverture aura lieu à 10 h (heure de Paris).",
          "",
          "Ajouter l'ouverture de la bêta à votre agenda :",
          calendarUrl,
          "",
          "Vous pourrez alors réunir vos spectacles, contacts, dates, dossiers et priorités dans un même espace, avec William pour vous accompagner.",
          "",
          "Quelques jours avant l'ouverture, vous recevrez un email avec les informations utiles pour bien démarrer.",
          "",
          "D'ici là, vous pouvez répondre directement à cet email si vous avez une question.",
          "",
          "À très bientôt,",
          "L'équipe TaDiff",
          "support@tadiff.com",
        ].join("\n"),
      }),
    });
  } catch {
    console.error("Beta welcome email failed", {
      provider: "resend",
      reason: "network_error",
    });
    return { sent: false, reason: "provider_error" };
  }

  if (!response.ok) {
    console.error("Beta welcome email failed", {
      provider: "resend",
      status: response.status,
    });
    return { sent: false, reason: "provider_error" };
  }

  return { sent: true };
}
