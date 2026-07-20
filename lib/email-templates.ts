import type { Contact, Show } from "@/types";

export type ContactEmailTemplate = "first-touch" | "follow-up" | "date-option";

export type ContactEmailDraft = {
  subject: string;
  body: string;
};

const templateLabels: Record<ContactEmailTemplate, string> = {
  "first-touch": "Prise de contact",
  "follow-up": "Relance",
  "date-option": "Proposition de spectacle",
};

export const contactEmailTemplateOptions = Object.entries(templateLabels).map(([value, label]) => ({
  value: value as ContactEmailTemplate,
  label,
}));

export function buildContactEmailDraft(
  contact: Contact,
  template: ContactEmailTemplate,
  show?: Show,
): ContactEmailDraft {
  const firstName = contact.name.split(" ")[0] || contact.name;
  const organization = contact.organization || "votre structure";
  const showTitle = show?.title || "notre spectacle";
  const nextDate = show?.nextDate
    ? new Date(show.nextDate).toLocaleDateString("fr-FR")
    : "";

  if (template === "follow-up") {
    return {
      subject: show ? `Relance - ${show.title}` : `Relance - ${organization}`,
      body: [
        `Bonjour ${firstName},`,
        "",
        `Je me permets de revenir vers vous concernant ${showTitle}.`,
        `Je peux vous renvoyer les elements utiles ou convenir d'un court echange avec ${organization}.`,
        "",
        "Je reste disponible pour avancer simplement.",
        "",
        "Bien a vous,",
      ].join("\n"),
    };
  }

  if (template === "date-option") {
    return {
      subject: `Proposition - ${showTitle}`,
      body: [
        `Bonjour ${firstName},`,
        "",
        `Je souhaitais vous presenter ${showTitle} et voir si une collaboration pouvait etre pertinente avec ${organization}.`,
        nextDate ? `Notre prochaine representation est prevue le ${nextDate}.` : "",
        "",
        "Je peux vous transmettre le dossier, les informations pratiques et les prochaines disponibilites si cela vous semble utile.",
        "",
        "Bien a vous,",
      ].join("\n"),
    };
  }

  return {
      subject: show ? `Prise de contact - ${show.title}` : `Prise de contact - ${organization}`,
      body: [
        `Bonjour ${firstName},`,
        "",
        `Je me permets de vous contacter au sujet de ${showTitle}.`,
        `Votre activite au sein de ${organization} nous semble pertinente pour echanger autour de ce projet.`,
        "",
        "Si vous le souhaitez, je peux vous envoyer les elements utiles et proposer un court echange.",
        "",
        "Bien a vous,",
      ].join("\n"),
  };
}
