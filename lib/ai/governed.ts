import "server-only";

import { generateAiText, type AiProvider } from "@/lib/ai/provider";
import { formatRagContext, searchHybridRagKnowledge } from "@/lib/ai/rag";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type AskWilliamInput = {
  question: string;
  requestKind?: string;
  maxOutputTokens?: number;
};

export type WilliamAnswer = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  remainingTokens: number | null;
  sources: Array<{ title: string; sourceUrl: string | null }>;
};

export async function askWilliam(input: AskWilliamInput): Promise<WilliamAnswer> {
  const question = input.question.trim();
  if (!question || question.length > 12_000) throw new Error("La demande envoyee a William est invalide.");

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Vous devez etre connecte pour utiliser William.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile?.company_id) throw new Error("Aucune compagnie n'est rattachee a ce compte.");

  const { data: settings, error: settingsError } = await supabase
    .from("ai_settings")
    .select("enabled,provider,model,rag_top_k,system_prompt")
    .eq("id", true)
    .single();
  if (settingsError || !settings?.enabled) throw new Error("William est temporairement indisponible.");

  const sources = await searchHybridRagKnowledge(question, profile.company_id, settings.rag_top_k);
  const context = formatRagContext(sources);
  const maxOutputTokens = Math.min(Math.max(input.maxOutputTokens ?? 900, 100), 2_000);
  const reservationBudget = estimateReservationTokens(settings.system_prompt, question, context, maxOutputTokens);
  const { data: reservationId, error: reservationError } = await supabase.rpc("reserve_my_ai_tokens", {
    p_requested_tokens: reservationBudget,
  });

  if (reservationError || !reservationId) {
    throw new Error(normalizeQuotaError(reservationError?.message));
  }

  const admin = getSupabaseAdminClient();
  try {
    const result = await generateAiText({
      provider: settings.provider as AiProvider,
      model: settings.model,
      systemPrompt: settings.system_prompt,
      question,
      context,
      maxOutputTokens,
    });
    const inputTokens = result.inputTokens || estimateTextTokens(`${settings.system_prompt}\n${question}\n${context}`);
    const outputTokens = result.outputTokens || estimateTextTokens(result.text);
    const { error: finalizeError } = await admin.rpc("finalize_ai_token_reservation", {
      p_reservation_id: reservationId,
      p_provider: settings.provider,
      p_model: settings.model,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_request_kind: input.requestKind ?? "chat",
    });
    if (finalizeError) throw new Error("La consommation IA n'a pas pu etre comptabilisee.");

    const { data: entitlement } = await supabase.rpc("get_my_ai_entitlement");
    const remaining = entitlement?.[0]?.remaining_tokens;

    return {
      text: result.text,
      inputTokens,
      outputTokens,
      remainingTokens: typeof remaining === "number" && remaining >= 0 ? remaining : null,
      sources: sources.map((source) => ({ title: source.title, sourceUrl: source.sourceUrl })),
    };
  } catch (error) {
    await admin.rpc("release_ai_token_reservation", { p_reservation_id: reservationId });
    throw error;
  }
}
function estimateReservationTokens(systemPrompt: string, question: string, context: string, maxOutputTokens: number) {
  return Math.min(200_000, estimateTextTokens(`${systemPrompt}\n${question}\n${context}`) + maxOutputTokens + 256);
}

function estimateTextTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 3));
}

function normalizeQuotaError(message?: string) {
  if (message?.includes("Quota William insuffisant")) return "Votre quota William est epuise. Vous pouvez ajouter des credits depuis les parametres.";
  if (message?.includes("pas active")) return "William n'est pas encore active pour ce compte.";
  return "William ne peut pas traiter cette demande pour le moment.";
}
