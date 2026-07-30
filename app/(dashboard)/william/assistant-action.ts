"use server";

import { z } from "zod";
import { extractWilliamResponseContent } from "@/lib/ai/conversation-suggestions";
import { askWilliam } from "@/lib/ai/governed";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

const questionSchema = z.string().trim().min(3).max(12_000);
const chatQuestionSchema = z.object({
  question: z.string().trim().min(3).max(4_000),
  sessionId: z.string().uuid().nullable().optional(),
});

export type WilliamChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  suggestedQuestions: string[];
  createdAt: string;
};

export type WilliamChatSnapshot = {
  sessionId: string | null;
  messages: WilliamChatMessage[];
};

export async function askWilliamAction(question: string) {
  const parsed = questionSchema.safeParse(question);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: "Votre question doit contenir entre 3 et 12 000 caractères.",
    };
  }

  try {
    const answer = await askWilliam({ question: parsed.data, requestKind: "assistant" });
    return { ok: true as const, answer };
  } catch (error) {
    return {
      ok: false as const,
      message: getErrorMessage(error),
    };
  }
}

export async function loadWilliamChatAction() {
  try {
    const workspace = await getChatWorkspace();
    const session = await findActiveSession(workspace);
    if (!session) {
      return {
        ok: true as const,
        conversation: { sessionId: null, messages: [] } satisfies WilliamChatSnapshot,
      };
    }

    return {
      ok: true as const,
      conversation: {
        sessionId: session.id,
        messages: await readChatMessages(workspace, session.id),
      } satisfies WilliamChatSnapshot,
    };
  } catch (error) {
    return { ok: false as const, message: normalizeChatError(getErrorMessage(error)) };
  }
}

export async function sendWilliamChatMessageAction(input: z.input<typeof chatQuestionSchema>) {
  const parsed = chatQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Votre question doit contenir entre 3 et 4 000 caractères." };
  }

  try {
    const workspace = await getChatWorkspace();
    const session = await getOrCreateActiveSession(workspace, parsed.data.sessionId);
    const previousMessages = await readChatMessages(workspace, session.id);
    const { error: userMessageError } = await workspace.supabase.from("william_chat_messages").insert({
      session_id: session.id,
      company_id: workspace.companyId,
      user_id: workspace.userId,
      role: "user",
      content: parsed.data.question,
    });
    if (userMessageError) throw new Error(userMessageError.message);

    const answer = await askWilliam({
      question: parsed.data.question,
      requestKind: "assistant_conversation",
      additionalContext: buildRecentConversationContext(previousMessages),
      additionalInstructions: [
        "Tiens compte de l'historique récent de cette conversation lorsqu'il est fourni.",
        "Ne répète pas une question à laquelle l'utilisateur vient de répondre.",
        "À la fin de ta réponse, si une suite utile existe, ajoute entre une et trois questions courtes que l'utilisateur pourrait t'envoyer.",
        "Utilise exactement ce format sur une ligne séparée : <questions_suivantes>[\"Question 1 ?\",\"Question 2 ?\"]</questions_suivantes>",
        "Ces questions doivent être autonomes, directement utiles et ne jamais déclencher une action sans confirmation.",
      ].join(" "),
    });
    const content = extractWilliamResponseContent(answer.text);
    const { data: assistantMessage, error: assistantMessageError } = await workspace.supabase
      .from("william_chat_messages")
      .insert({
        session_id: session.id,
        company_id: workspace.companyId,
        user_id: workspace.userId,
        role: "assistant",
        content: content.text.slice(0, 12_000),
        metadata: { suggestedQuestions: content.suggestedQuestions },
      })
      .select("id,created_at")
      .single();
    if (assistantMessageError || !assistantMessage) {
      throw new Error(assistantMessageError?.message || "La réponse de William n'a pas pu être enregistrée.");
    }

    await workspace.supabase
      .from("william_chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", session.id);

    return {
      ok: true as const,
      sessionId: session.id,
      answer: {
        ...answer,
        text: content.text,
        suggestedQuestions: content.suggestedQuestions,
        messageId: assistantMessage.id,
        createdAt: assistantMessage.created_at,
      },
    };
  } catch (error) {
    return { ok: false as const, message: normalizeChatError(getErrorMessage(error)) };
  }
}

export async function startNewWilliamChatAction(sessionId: string | null) {
  const parsedSessionId = z.string().uuid().nullable().safeParse(sessionId);
  if (!parsedSessionId.success) return { ok: false as const, message: "Conversation invalide." };

  try {
    const workspace = await getChatWorkspace();
    if (parsedSessionId.data) {
      const { error } = await workspace.supabase
        .from("william_chat_sessions")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", parsedSessionId.data)
        .eq("company_id", workspace.companyId)
        .eq("user_id", workspace.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: normalizeChatError(getErrorMessage(error)) };
  }
}

async function getChatWorkspace() {
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Vous devez être connecté pour utiliser William.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile?.company_id) throw new Error("Aucune compagnie n'est rattachée à ce compte.");

  return { supabase, userId: auth.user.id, companyId: profile.company_id };
}

type ChatWorkspace = Awaited<ReturnType<typeof getChatWorkspace>>;

async function findActiveSession(workspace: ChatWorkspace) {
  const { data, error } = await workspace.supabase
    .from("william_chat_sessions")
    .select("id")
    .eq("company_id", workspace.companyId)
    .eq("user_id", workspace.userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function getOrCreateActiveSession(workspace: ChatWorkspace, requestedSessionId?: string | null) {
  if (requestedSessionId) {
    const { data, error } = await workspace.supabase
      .from("william_chat_sessions")
      .select("id")
      .eq("id", requestedSessionId)
      .eq("company_id", workspace.companyId)
      .eq("user_id", workspace.userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Cette conversation n'est plus disponible.");
    return data;
  }

  const current = await findActiveSession(workspace);
  if (current) return current;

  const { data, error } = await workspace.supabase
    .from("william_chat_sessions")
    .insert({ company_id: workspace.companyId, user_id: workspace.userId })
    .select("id")
    .single();
  if (!error && data) return data;

  if (error?.code === "23505") {
    const concurrentSession = await findActiveSession(workspace);
    if (concurrentSession) return concurrentSession;
  }
  throw new Error(error?.message || "La conversation n'a pas pu être créée.");
}

async function readChatMessages(workspace: ChatWorkspace, sessionId: string): Promise<WilliamChatMessage[]> {
  const { data, error } = await workspace.supabase
    .from("william_chat_messages")
    .select("id,role,content,metadata,created_at")
    .eq("session_id", sessionId)
    .eq("company_id", workspace.companyId)
    .eq("user_id", workspace.userId)
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw new Error(error.message);

  return (data ?? []).reverse().map((message) => ({
    id: message.id,
    role: message.role,
    text: message.content,
    suggestedQuestions: readSuggestedQuestions(message.metadata),
    createdAt: message.created_at,
  }));
}

function readSuggestedQuestions(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const value = metadata.suggestedQuestions;
  if (!Array.isArray(value)) return [];
  return value
    .filter((question): question is string => typeof question === "string")
    .map((question) => question.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildRecentConversationContext(messages: WilliamChatMessage[]) {
  const selected: WilliamChatMessage[] = [];
  let remainingCharacters = 18_000;

  for (const message of [...messages].reverse()) {
    const content = message.text.trim();
    if (!content) continue;
    const cost = content.length + 32;
    if (cost > remainingCharacters && selected.length > 0) break;
    selected.push(message);
    remainingCharacters -= Math.min(cost, remainingCharacters);
    if (selected.length >= 12 || remainingCharacters <= 0) break;
  }

  if (selected.length === 0) return "";
  return `[HISTORIQUE RÉCENT DE LA CONVERSATION]\n${selected
    .reverse()
    .map((message) => `${message.role === "user" ? "Utilisateur" : "William"} : ${message.text}`)
    .join("\n\n")}`;
}

function normalizeChatError(message: string) {
  return message.includes("schema cache") || message.includes("william_chat_")
    ? "Appliquez la migration 062_william_chat_memory.sql pour activer la mémoire de William."
    : message;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "William est indisponible.";
}
