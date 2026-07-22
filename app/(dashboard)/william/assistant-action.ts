"use server";

import { askWilliam } from "@/lib/ai/governed";

export async function askWilliamAction(question: string) {
  const normalizedQuestion = typeof question === "string" ? question.trim() : "";

  if (normalizedQuestion.length < 3 || normalizedQuestion.length > 12_000) {
    return {
      ok: false as const,
      message: "Votre question doit contenir entre 3 et 12 000 caracteres.",
    };
  }

  try {
    const answer = await askWilliam({ question: normalizedQuestion, requestKind: "assistant" });
    return { ok: true as const, answer };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "William est indisponible.",
    };
  }
}
