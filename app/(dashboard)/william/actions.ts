"use server";

import { z } from "zod";
import { askWilliam } from "@/lib/ai/governed";

const questionSchema = z.string().trim().min(3).max(12_000);

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
