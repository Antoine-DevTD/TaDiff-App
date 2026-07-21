import { getShowDocumentTypeLabel } from "@/lib/show-documents";
import type { Contact, Show, ShowDocumentType } from "@/types";

export type ContactEmailTemplate = "first-touch" | "follow-up" | "date-option";

export type ContactEmailDraft = {
  subject: string;
  body: string;
};

export type ContactEmailDraftOptions = {
  attachmentTypes?: ShowDocumentType[];
};

const templateLabels: Record<ContactEmailTemplate, string> = {
  "first-touch": "Premier contact",
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
  options: ContactEmailDraftOptions = {},
): ContactEmailDraft {
  const firstName = contact.name.split(" ")[0] || contact.name;
  const organization = contact.organization || "votre structure";
  const showTitle = show?.title || "notre spectacle";
  const nextDate = show?.nextDate
    ? new Date(show.nextDate).toLocaleDateString("fr-FR")
    : "";
  const presentation = buildShowPresentation(show);
  const attachmentCopy = buildAttachmentCopy(options.attachmentTypes ?? []);

  if (template === "follow-up") {
    return {
      subject: show ? `Relance - ${show.title}` : `Relance - ${organization}`,
      body: [
        `Bonjour ${firstName},`,
        "",
        `Je me permets de revenir vers vous concernant ${showTitle}.`,
        ...presentation,
        `Ce projet pourrait trouver sa place dans la programmation de ${organization}, et je serais heureux d'en echanger avec vous.`,
        attachmentCopy,
        "",
        "Auriez-vous un moment dans les prochains jours pour me faire un premier retour ?",
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
        ...presentation,
        nextDate ? `Notre prochaine representation est prevue le ${nextDate}.` : "",
        attachmentCopy,
        "",
        nextDate
          ? "Je serais ravi de vous y accueillir ou de convenir d'un court echange pour vous presenter la forme et ses conditions d'accueil."
          : "Je serais ravi de convenir d'un court echange pour vous presenter la forme et ses conditions d'accueil.",
        "",
        "Bien a vous,",
      ].join("\n"),
    };
  }

  return {
      subject: show ? `Premier contact - ${show.title}` : `Premier contact - ${organization}`,
      body: [
        `Bonjour ${firstName},`,
        "",
      `Je me permets de vous contacter au sujet de ${showTitle}.`,
      `Votre activite au sein de ${organization} nous semble pertinente pour echanger autour de ce projet.`,
      ...presentation,
      attachmentCopy,
      "",
      "Seriez-vous disponible pour un court echange afin de voir si ce projet peut correspondre a votre programmation ?",
        "",
        "Bien a vous,",
      ].join("\n"),
  };
}

function buildShowPresentation(show?: Show) {
  if (!show) return [];

  return [
    "",
    show.logline ? show.logline : "",
    show.themes?.length ? `Le spectacle traverse notamment les themes suivants : ${formatList(show.themes)}.` : "",
    show.targetAudience ? `Il s'adresse a ${lowercaseFirst(show.targetAudience)}` : "",
    show.emailPitch ?? "",
  ].filter(Boolean);
}

function buildAttachmentCopy(types: ShowDocumentType[]) {
  if (types.length === 0) return "";

  const labels = types.map(formatAttachmentLabel);
  return `Vous trouverez en pieces jointes ${formatList(labels)}. Ces documents precisent le projet et ses conditions d'accueil.`;
}

function formatAttachmentLabel(type: ShowDocumentType) {
  const articles: Partial<Record<ShowDocumentType, string>> = {
    Affiche: "l'",
    Budget: "le ",
    Devis: "le ",
    "Dossier artistique": "le ",
    "Fiche technique": "la ",
    "Note d'intention": "la ",
    Synopsis: "le ",
    Texte: "le ",
  };
  return `${articles[type] ?? "le "}${getShowDocumentTypeLabel(type).toLocaleLowerCase("fr-FR")}`;
}

function formatList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} et ${values.at(-1)}`;
}

function lowercaseFirst(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toLocaleLowerCase("fr-FR")}${trimmed.slice(1)}`;
}
