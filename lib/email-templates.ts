import type { Contact } from "@/types";

export type ContactEmailTemplate = "first-touch" | "follow-up" | "date-option";

export type ContactEmailDraft = {
  subject: string;
  body: string;
};

const templateLabels: Record<ContactEmailTemplate, string> = {
  "first-touch": "Premier contact",
  "follow-up": "Relance dossier",
  "date-option": "Date possible",
};

export const contactEmailTemplateOptions = Object.entries(templateLabels).map(([value, label]) => ({
  value: value as ContactEmailTemplate,
  label,
}));

export function buildContactEmailDraft(
  contact: Contact,
  template: ContactEmailTemplate,
): ContactEmailDraft {
  const firstName = contact.name.split(" ")[0] || contact.name;
  const organization = contact.organization || "votre structure";
  const roleLine = contact.role ? ` en tant que ${contact.role.toLowerCase()}` : "";

  if (template === "follow-up") {
    return {
      subject: `Relance dossier - ${organization}`,
      body: [
        `Bonjour ${firstName},`,
        "",
        "Je me permets de revenir vers vous concernant le dossier de diffusion transmis.",
        `Si le projet peut trouver sa place dans la programmation de ${organization}, je peux vous renvoyer les elements utiles ou caler un court echange.`,
        "",
        "Je reste disponible pour avancer simplement.",
        "",
        "Bien a vous,",
      ].join("\n"),
    };
  }

  if (template === "date-option") {
    return {
      subject: `Proposition de date - ${organization}`,
      body: [
        `Bonjour ${firstName},`,
        "",
        "Nous regardons actuellement les prochaines dates de diffusion possibles.",
        `Comme vous suivez la programmation${roleLine}, je voulais voir avec vous si une fenetre pouvait s'ouvrir pour votre lieu ou votre reseau.`,
        "",
        "Je peux vous envoyer le dossier artistique, la fiche technique et une proposition chiffree si cela vous semble pertinent.",
        "",
        "Bien a vous,",
      ].join("\n"),
    };
  }

  return {
    subject: `Presentation spectacle - ${organization}`,
    body: [
      `Bonjour ${firstName},`,
      "",
      `Je me permets de vous contacter pour vous presenter notre spectacle et voir s'il pourrait correspondre a la ligne de ${organization}.`,
      "L'idee est de vous transmettre un dossier clair, avec les elements artistiques, techniques et financiers utiles pour decider rapidement si cela vaut un echange.",
      "",
      "Si vous le souhaitez, je peux vous envoyer le dossier complet et quelques pistes de dates.",
      "",
      "Bien a vous,",
    ].join("\n"),
  };
}
