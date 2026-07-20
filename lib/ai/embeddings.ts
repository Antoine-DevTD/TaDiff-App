import "server-only";

export async function createOpenAiEmbeddings(inputs: string[], model: string): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY n'est pas configuree cote serveur.");
  if (inputs.length === 0) return [];

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: inputs, encoding_format: "float" }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok || !isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error(`La generation d'embeddings a echoue (${response.status}).`);
  }

  return payload.data
    .filter(isRecord)
    .sort((left, right) => Number(left.index ?? 0) - Number(right.index ?? 0))
    .map((item) => Array.isArray(item.embedding) ? item.embedding.map(Number) : []);
}

export function serializeEmbedding(embedding: number[]) {
  if (embedding.length !== 1536 || embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Le modele d'embedding doit retourner exactement 1536 dimensions.");
  }
  return `[${embedding.join(",")}]`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
