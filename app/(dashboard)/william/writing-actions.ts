"use server";

import { z } from "zod";
import { askWilliam } from "@/lib/ai/governed";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

const objectiveSchema = z.enum(["logline", "synopsis", "intention", "email_pitch"]);
const modeSchema = z.enum(["interview", "documents"]);
const excerptSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(20).max(15_000),
});
const startSchema = z.object({
  showId: z.string().uuid(),
  objective: objectiveSchema,
  mode: modeSchema,
  excerpts: z.array(excerptSchema).max(4),
});
const messageSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(2).max(4_000),
});

type WritingObjective = z.infer<typeof objectiveSchema>;
type WritingMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isDraft: boolean;
  createdAt: string;
};

export type WritingConversation = {
  id: string;
  objective: WritingObjective;
  mode: "interview" | "documents";
  messages: WritingMessage[];
};

const objectiveLabels: Record<WritingObjective, string> = {
  logline: "la logline",
  synopsis: "le synopsis",
  intention: "la note d'intention",
  email_pitch: "la présentation de diffusion",
};

const firstQuestions: Record<WritingObjective, string> = {
  logline: "Racontez-moi d'abord ce qui arrive dans le spectacle : qui suit-on, que cherche cette personne ou ce groupe, et qu'est-ce qui vient bouleverser la situation ?",
  synopsis: "Commençons par le parcours du spectacle. Quelles sont les grandes étapes, du point de départ jusqu'à la dernière image, sans chercher encore à bien rédiger ?",
  intention: "Pourquoi avez-vous besoin de porter ce spectacle aujourd'hui ? Partez d'une expérience, d'une question ou d'une nécessité très concrète.",
  email_pitch: "Si un lieu ne devait retenir qu'une raison de programmer ce spectacle, laquelle serait-ce ? Pensez à la rencontre avec son public plutôt qu'à une formule publicitaire.",
};

export async function loadShowWritingConversationAction(showId: string) {
  const parsedShowId = z.string().uuid().safeParse(showId);
  if (!parsedShowId.success) return { ok: false as const, message: "Spectacle invalide." };
  try {
    const workspace = await getWritingWorkspace(parsedShowId.data);
    const { data: conversation, error } = await workspace.supabase
      .from("william_conversations")
      .select("id,objective,mode")
      .eq("company_id", workspace.companyId)
      .eq("show_id", parsedShowId.data)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(normalizeWritingError(error.message));
    if (!conversation) return { ok: true as const, conversation: null };
    return { ok: true as const, conversation: await readConversation(workspace.supabase, conversation) };
  } catch (error) {
    return { ok: false as const, message: getErrorMessage(error) };
  }
}

export async function startShowWritingConversationAction(input: z.input<typeof startSchema>) {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Les paramètres de l'atelier sont invalides." };
  if (parsed.data.mode === "documents" && parsed.data.excerpts.length === 0) {
    return { ok: false as const, message: "Aucun texte lisible n'a été extrait des documents choisis." };
  }
  if (parsed.data.excerpts.reduce((total, excerpt) => total + excerpt.text.length, 0) > 40_000) {
    return { ok: false as const, message: "Le contenu sélectionné est trop volumineux. Choisissez moins de documents." };
  }

  try {
    const workspace = await getWritingWorkspace(parsed.data.showId);
    const sourceContext = parsed.data.excerpts
      .map((excerpt) => `[${excerpt.title}]\n${excerpt.text}`)
      .join("\n\n");
    await workspace.supabase
      .from("william_conversations")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("company_id", workspace.companyId)
      .eq("show_id", parsed.data.showId)
      .eq("status", "active");

    const { data: conversation, error } = await workspace.supabase
      .from("william_conversations")
      .insert({
        company_id: workspace.companyId,
        user_id: workspace.userId,
        show_id: parsed.data.showId,
        objective: parsed.data.objective,
        mode: parsed.data.mode,
        source_context: sourceContext,
      })
      .select("id,objective,mode")
      .single();
    if (error || !conversation) throw new Error(normalizeWritingError(error?.message));

    const introduction = parsed.data.mode === "documents"
      ? `J'ai lu les ${parsed.data.excerpts.length === 1 ? "éléments du document choisi" : "éléments des documents choisis"}. Je vais m'en servir comme matière, sans inventer ce qui n'y figure pas.\n\n${firstQuestions[parsed.data.objective]}`
      : `Nous allons construire ${objectiveLabels[parsed.data.objective]} ensemble. Je vous poserai une question à la fois, puis vous pourrez demander une proposition.\n\n${firstQuestions[parsed.data.objective]}`;
    const { error: messageError } = await workspace.supabase.from("william_messages").insert({
      conversation_id: conversation.id,
      company_id: workspace.companyId,
      user_id: workspace.userId,
      role: "assistant",
      content: introduction,
      metadata: { kind: "question" },
    });
    if (messageError) throw new Error(normalizeWritingError(messageError.message));

    return { ok: true as const, conversation: await readConversation(workspace.supabase, conversation) };
  } catch (error) {
    return { ok: false as const, message: getErrorMessage(error) };
  }
}

export async function sendShowWritingMessageAction(input: z.input<typeof messageSchema>) {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Votre réponse est invalide." };
  try {
    const context = await getConversationContext(parsed.data.conversationId);
    const { error: insertError } = await context.supabase.from("william_messages").insert({
      conversation_id: context.conversation.id,
      company_id: context.companyId,
      user_id: context.userId,
      role: "user",
      content: parsed.data.message,
    });
    if (insertError) throw new Error(normalizeWritingError(insertError.message));

    const history = await readMessageRows(context.supabase, context.conversation.id);
    const answer = await askWilliam({
      question: parsed.data.message,
      requestKind: "show_writing_interview",
      maxOutputTokens: 650,
      additionalContext: buildWritingContext(context, history),
      additionalInstructions: [
        `Tu accompagnes l'utilisateur pour rédiger ${objectiveLabels[context.conversation.objective]}.`,
        "Conduis un entretien éditorial bienveillant, concret et exigeant sur un spectacle vivant.",
        "Tiens compte de tout l'historique. Pose une seule question utile à la fois.",
        "Ne rédige pas encore la version finale sauf si l'utilisateur le demande explicitement.",
        "Ne prétends jamais avoir lu un document absent du contexte autorisé.",
      ].join(" "),
    });
    await insertAssistantMessage(context, answer.text, { kind: "question" });
    return {
      ok: true as const,
      conversation: await readConversation(context.supabase, context.conversation),
      remainingTokens: answer.remainingTokens,
    };
  } catch (error) {
    return { ok: false as const, message: getErrorMessage(error) };
  }
}

export async function generateShowWritingDraftAction(conversationId: string) {
  const parsed = z.string().uuid().safeParse(conversationId);
  if (!parsed.success) return { ok: false as const, message: "Conversation invalide." };
  try {
    const context = await getConversationContext(parsed.data);
    const history = await readMessageRows(context.supabase, context.conversation.id);
    const answer = await askWilliam({
      question: `À partir de notre échange, propose maintenant ${objectiveLabels[context.conversation.objective]}.`,
      requestKind: "show_writing_draft",
      maxOutputTokens: context.conversation.objective === "logline" ? 180 : 1_100,
      additionalContext: buildWritingContext(context, history),
      additionalInstructions: [
        `Rédige uniquement ${objectiveLabels[context.conversation.objective]} demandée.`,
        "Retourne le texte prêt à retravailler, sans titre, sans Markdown, sans préambule et sans commentaire.",
        "N'invente aucun fait. Préserve une voix artistique naturelle et évite le langage publicitaire générique.",
      ].join(" "),
    });
    await insertAssistantMessage(context, answer.text, {
      kind: "draft",
      objective: context.conversation.objective,
    });
    return {
      ok: true as const,
      conversation: await readConversation(context.supabase, context.conversation),
      remainingTokens: answer.remainingTokens,
    };
  } catch (error) {
    return { ok: false as const, message: getErrorMessage(error) };
  }
}

async function getWritingWorkspace(showId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Vous devez être connecté pour utiliser William.");
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", auth.user.id).maybeSingle();
  if (!profile?.company_id) throw new Error("Aucune compagnie n'est rattachée à ce compte.");
  const { data: show } = await supabase
    .from("shows")
    .select("id,title,discipline,notes,logline,synopsis_text,intention_note_text,themes,target_audience,email_pitch")
    .eq("id", showId)
    .eq("company_id", profile.company_id)
    .maybeSingle();
  if (!show) throw new Error("Ce spectacle est introuvable ou inaccessible.");
  return { supabase, userId: auth.user.id, companyId: profile.company_id, show };
}

async function getConversationContext(conversationId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Vous devez être connecté pour utiliser William.");
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", auth.user.id).maybeSingle();
  if (!profile?.company_id) throw new Error("Aucune compagnie n'est rattachée à ce compte.");
  const { data: conversation, error } = await supabase
    .from("william_conversations")
    .select("id,company_id,show_id,objective,mode,source_context")
    .eq("id", conversationId)
    .eq("company_id", profile.company_id)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(normalizeWritingError(error.message));
  if (!conversation) throw new Error("Cette conversation n'est plus disponible.");
  const workspace = await getWritingWorkspace(conversation.show_id);
  return { ...workspace, conversation };
}

function buildWritingContext(
  context: Awaited<ReturnType<typeof getConversationContext>>,
  messages: WritingMessage[],
) {
  const show = context.show;
  const profile = [
    `Spectacle : ${show.title}`,
    `Discipline : ${show.discipline}`,
    show.notes ? `Notes : ${show.notes}` : "",
    show.logline ? `Logline actuelle : ${show.logline}` : "",
    show.synopsis_text ? `Synopsis actuel : ${show.synopsis_text}` : "",
    show.intention_note_text ? `Note d'intention actuelle : ${show.intention_note_text}` : "",
    show.themes?.length ? `Thèmes : ${show.themes.join(", ")}` : "",
    show.target_audience ? `Public : ${show.target_audience}` : "",
    show.email_pitch ? `Présentation actuelle : ${show.email_pitch}` : "",
  ].filter(Boolean).join("\n");
  const history = messages.slice(-16).map((message) => `${message.role === "user" ? "Utilisateur" : "William"} : ${message.content}`).join("\n\n");
  return [
    `[SPECTACLE]\n${profile}`,
    context.conversation.source_context ? `[DOCUMENTS EXPLICITEMENT AUTORISÉS]\n${context.conversation.source_context}` : "",
    `[HISTORIQUE DE L'ATELIER]\n${history}`,
  ].filter(Boolean).join("\n\n");
}

async function insertAssistantMessage(
  context: Awaited<ReturnType<typeof getConversationContext>>,
  content: string,
  metadata: Json,
) {
  const { error } = await context.supabase.from("william_messages").insert({
    conversation_id: context.conversation.id,
    company_id: context.companyId,
    user_id: context.userId,
    role: "assistant",
    content: content.slice(0, 12_000),
    metadata,
  });
  if (error) throw new Error(normalizeWritingError(error.message));
  await context.supabase.from("william_conversations").update({ updated_at: new Date().toISOString() }).eq("id", context.conversation.id);
}

async function readMessageRows(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  conversationId: string,
): Promise<WritingMessage[]> {
  const { data, error } = await supabase
    .from("william_messages")
    .select("id,role,content,metadata,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(normalizeWritingError(error.message));
  return (data ?? []).map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    isDraft: isDraftMetadata(message.metadata),
    createdAt: message.created_at,
  }));
}

async function readConversation(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  conversation: { id: string; objective: WritingObjective; mode: "interview" | "documents" },
): Promise<WritingConversation> {
  return { ...conversation, messages: await readMessageRows(supabase, conversation.id) };
}

function isDraftMetadata(metadata: Json) {
  return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && metadata.kind === "draft");
}

function normalizeWritingError(message?: string) {
  return message?.includes("schema cache") || message?.includes("william_conversations")
    ? "Appliquez la migration 051_william_show_writing.sql pour activer cet atelier."
    : message || "L'atelier William est indisponible.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "L'atelier William est indisponible.";
}
