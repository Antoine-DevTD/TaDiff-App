import "server-only";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createOpenAiEmbeddings, serializeEmbedding } from "@/lib/ai/embeddings";
import type { Json } from "@/types/database.types";

export type RagResult = {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceUrl: string;
  metadata: Json;
  score: number;
};

export async function searchRagKnowledge(query: string, companyId: string | null, limit = 8): Promise<RagResult[]> {
  if (!hasSupabaseEnv() || query.trim().length < 2) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_rag_documents", {
    search_query: query.trim(),
    target_company_id: companyId,
    match_count: Math.min(Math.max(limit, 1), 30),
  });
  if (error) throw new Error("La recherche documentaire William est indisponible.");
  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    sourceType: item.source_type,
    sourceUrl: item.source_url ?? "",
    metadata: item.metadata,
    score: item.rank,
  }));
}

export async function searchHybridRagKnowledge(query: string, companyId: string | null, limit = 8): Promise<RagResult[]> {
  const lexical = await searchRagKnowledge(query, companyId, limit);
  if (!process.env.OPENAI_API_KEY || !hasSupabaseEnv()) return lexical;

  const supabase = await getSupabaseServerClient();
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("embedding_provider,embedding_model")
    .eq("id", true)
    .maybeSingle();
  if (!settings || settings.embedding_provider !== "openai") return lexical;

  try {
    const [embedding] = await createOpenAiEmbeddings([query], settings.embedding_model);
    const { data } = await supabase.rpc("match_rag_documents", {
      query_embedding: serializeEmbedding(embedding),
      target_company_id: companyId,
      match_threshold: 0.55,
      match_count: Math.min(Math.max(limit, 1), 30),
    });
    const semantic = (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      sourceType: item.source_type,
      sourceUrl: item.source_url ?? "",
      metadata: item.metadata,
      score: item.similarity,
    }));
    return mergeResults(semantic, lexical, limit);
  } catch {
    return lexical;
  }
}

export function formatRagContext(results: RagResult[]) {
  return results.map((result, index) => [
    `[Source ${index + 1}] ${result.title}`,
    result.content,
    result.sourceUrl ? `URL : ${result.sourceUrl}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}

function mergeResults(primary: RagResult[], secondary: RagResult[], limit: number) {
  const merged = new Map<string, RagResult>();
  for (const result of [...primary, ...secondary]) if (!merged.has(result.id)) merged.set(result.id, result);
  return [...merged.values()].slice(0, limit);
}
