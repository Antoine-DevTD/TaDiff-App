import type { Json } from "@/types/database.types";
import type { Contact, Show } from "@/types";

export type EmailVariable = {
  token: string;
  label: string;
  group: "Contact" | "Spectacle";
  optional?: boolean;
};

export const emailVariables: EmailVariable[] = [
  { token: "@prenom_contact", label: "Prenom du contact", group: "Contact" },
  { token: "@nom_contact", label: "Nom du contact", group: "Contact" },
  { token: "@structure", label: "Structure", group: "Contact" },
  { token: "@titre_spectacle", label: "Titre du spectacle", group: "Spectacle" },
  { token: "@logline", label: "Logline", group: "Spectacle", optional: true },
  { token: "@synopsis", label: "Presentation courte", group: "Spectacle", optional: true },
  { token: "@thematiques", label: "Thematiques", group: "Spectacle", optional: true },
  { token: "@public", label: "Public", group: "Spectacle", optional: true },
  { token: "@prochaine_date", label: "Prochaine date", group: "Spectacle", optional: true },
];

export type EmailTemplateContext = {
  contact: Contact;
  recipientCount?: number;
  show?: Show;
};

export function getEmailVariableValues({ contact, recipientCount = 1, show }: EmailTemplateContext) {
  const names = contact.name.trim().split(/\s+/);
  const firstName = names[0] || contact.name;
  const lastName = names.slice(1).join(" ") || contact.name;

  return {
    "@prenom_contact": recipientCount > 1 ? "toutes et tous" : firstName,
    "@nom_contact": recipientCount > 1 ? "" : lastName,
    "@structure": recipientCount > 1 ? "vos structures" : contact.organization || "votre structure",
    "@titre_spectacle": show?.title || "notre spectacle",
    "@logline": show?.logline?.trim() || "",
    "@synopsis": show?.emailPitch?.trim() || "",
    "@thematiques": show?.themes?.length ? formatFrenchList(show.themes) : "",
    "@public": show?.targetAudience?.trim() || "",
    "@prochaine_date": show?.nextDate
      ? new Date(show.nextDate).toLocaleDateString("fr-FR")
      : "",
  } satisfies Record<string, string>;
}

export function renderTemplateText(template: string, context: EmailTemplateContext) {
  const values = getEmailVariableValues(context);
  return replaceTokens(template, values).replace(/\s{2,}/g, " ").trim();
}

export function renderTemplateDocument(document: Json, context: EmailTemplateContext): Json {
  const values = getEmailVariableValues(context);
  return renderNode(document, values) ?? { type: "doc", content: [] };
}

export function emailDocumentToPlainText(document: Json): string {
  if (!document || typeof document !== "object" || Array.isArray(document)) return "";
  const record = document as Record<string, Json | undefined>;
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.content)) return "";
  const separator = record.type === "doc" || record.type === "paragraph" || record.type === "listItem" ? "\n" : "";
  return record.content.map(emailDocumentToPlainText).filter(Boolean).join(separator).replace(/\n{3,}/g, "\n\n").trim();
}

function renderNode(node: Json, values: Record<string, string>): Json | null {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;
  const record = node as Record<string, Json | undefined>;
  const content = Array.isArray(record.content) ? record.content : undefined;

  if (record.type === "paragraph" && content) {
    const paragraphText = collectText(content);
    const missingOptional = emailVariables.some(
      (variable) => variable.optional && paragraphText.includes(variable.token) && !values[variable.token],
    );
    if (missingOptional) return null;
  }

  const rendered: Record<string, Json | undefined> = { ...record };
  if (typeof record.text === "string") rendered.text = replaceTokens(record.text, values);
  if (content) {
    rendered.content = content
      .map((child) => renderNode(child, values))
      .filter((child): child is Json => child !== null);
  }
  return rendered;
}

function collectText(nodes: Json[]): string {
  return nodes.map((node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return "";
    const record = node as Record<string, Json | undefined>;
    if (typeof record.text === "string") return record.text;
    return Array.isArray(record.content) ? collectText(record.content) : "";
  }).join("");
}

function replaceTokens(value: string, values: Record<string, string>) {
  return emailVariables.reduce(
    (result, variable) => result.split(variable.token).join(values[variable.token] ?? ""),
    value,
  );
}

function formatFrenchList(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} et ${values.at(-1)}`;
}

export function paragraph(text: string, marks?: Array<{ type: string; attrs?: Record<string, Json> }>): Json {
  return { type: "paragraph", content: text ? [{ type: "text", text, marks }] : [] };
}
