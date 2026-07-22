"use server";

import { z } from "zod";
import { askWilliam } from "@/lib/ai/governed";

const questionSchema = z.string().trim().min(3).max(12_000);
const emailDraftSchema = z.object({
  contactName: z.string().trim().min(1).max(200),
  organization: z.string().trim().max(200),
  showTitle: z.string().trim().max(200),
  currentBody: z.string().trim().max(12_000),
  instruction: z.string().trim().min(3).max(2_000),
  attachmentLabels: z.array(z.string().trim().max(100)).max(12),
});

export async function askWilliamAction(question: string) {
  const parsed = questionSchema.safeParse(question);
  if (!parsed.success) return { ok: false as const, message: "Votre question doit contenir entre 3 et 12 000 caracteres." };
  try {
    const answer = await askWilliam({ question: parsed.data, requestKind: "assistant" });
    return { ok: true as const, answer };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "William est indisponible." };
  }
}

export async function draftWilliamEmailAction(input: z.input<typeof emailDraftSchema>) {
  const parsed = emailDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Les informations du brouillon sont invalides." };
  const { contactName, organization, showTitle, currentBody, instruction, attachmentLabels } = parsed.data;
  const prompt = [
    "Redige le corps d'un email professionnel de diffusion pour une compagnie de spectacle vivant.",
    `Destinataire : ${contactName}${organization ? `, ${organization}` : ""}.`,
    showTitle ? `Spectacle : ${showTitle}.` : "Aucun spectacle n'est rattache au message.",
    attachmentLabels.length ? `Pieces qui seront jointes : ${attachmentLabels.join(", ")}. Mentionne-les naturellement.` : "Aucune piece jointe selectionnee.",
    `Demande de l'utilisateur : ${instruction}`,
    "Ameliore le brouillon ci-dessous avec un ton humain, precis et chaleureux. N'invente aucune information absente.",
    "Retourne uniquement le corps du message, sans objet, sans Markdown et sans commentaire.",
    "Brouillon actuel :",
    currentBody,
  ].join("\n");
  try {
    const answer = await askWilliam({ question: prompt, requestKind: "email_draft", maxOutputTokens: 900 });
    return { ok: true as const, answer };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "William est indisponible." };
  }
}
