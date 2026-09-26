import "server-only";

export type AiProvider = "deepseek" | "openai" | "anthropic" | "mistral";

export type GenerateAiTextInput = {
  provider: AiProvider;
  model: string;
  systemPrompt: string;
  question: string;
  context: string;
  maxOutputTokens?: number;
};

export type AiGenerationResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

export type AiProviderErrorCode = "rate_limit" | "configuration" | "unavailable" | "timeout" | "invalid_response" | "request_failed";

const providerErrorMessages: Record<AiProviderErrorCode, string> = {
  rate_limit: "Le service IA utilisé par William a atteint sa limite de requêtes. Ce blocage est distinct de votre quota TaDiff. Réessayez plus tard ; s’il persiste, contactez l’équipe TaDiff.",
  configuration: "La connexion de William au service IA doit être vérifiée par l’équipe TaDiff. Vous pouvez continuer à utiliser les autres outils.",
  unavailable: "Le service IA de William est temporairement indisponible. Réessayez dans quelques instants.",
  timeout: "William n’a pas répondu dans le délai prévu. Réessayez dans quelques instants.",
  invalid_response: "Le service IA de William n’a pas renvoyé de réponse exploitable. Réessayez dans quelques instants.",
  request_failed: "Le service IA de William n’a pas pu traiter cette demande. Réessayez ou contactez l’équipe TaDiff si le problème persiste.",
};

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly status?: number;

  constructor(code: AiProviderErrorCode, status?: number) {
    super(providerErrorMessages[code]);
    this.name = "AiProviderError";
    this.code = code;
    this.status = status;
  }
}

export async function generateAiText(input: GenerateAiTextInput): Promise<AiGenerationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    if (input.provider === "openai") return await callOpenAi(input, controller.signal);
    if (input.provider === "anthropic") return await callAnthropic(input, controller.signal);
    if (input.provider === "mistral") return await callMistral(input, controller.signal);
    return await callDeepSeek(input, controller.signal);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (controller.signal.aborted || isAbortError(error)) throw new AiProviderError("timeout");
    // Fetch failures can contain URLs or credentials. Keep upstream details server-side.
    throw new AiProviderError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAi(input: GenerateAiTextInput, signal: AbortSignal) {
  const apiKey = requireSecret("OPENAI_API_KEY");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      store: false,
      instructions: input.systemPrompt,
      input: buildUserPrompt(input),
      max_output_tokens: input.maxOutputTokens ?? 1200,
    }),
    signal,
  });
  const payload = await readJson(response);
  const output = Array.isArray(payload.output) ? payload.output : [];
  const texts = output.flatMap((item) => isRecord(item) && Array.isArray(item.content) ? item.content : [])
    .filter(isRecord)
    .map((item) => item.text)
    .filter((value): value is string => typeof value === "string");
  if (!texts.some((text) => text.trim())) throw new AiProviderError("invalid_response");
  const usage = isRecord(payload.usage) ? payload.usage : {};
  return {
    text: texts.join("\n"),
    inputTokens: readTokenCount(usage.input_tokens),
    outputTokens: readTokenCount(usage.output_tokens),
  };
}

async function callDeepSeek(input: GenerateAiTextInput, signal: AbortSignal) {
  const apiKey = requireSecret("DEEPSEEK_API_KEY");
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: buildUserPrompt(input) },
      ],
      max_tokens: input.maxOutputTokens ?? 1200,
      stream: false,
    }),
    signal,
  });
  const payload = await readJson(response);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const first = choices[0];
  const message = isRecord(first) && isRecord(first.message) ? first.message.content : null;
  if (typeof message !== "string" || !message.trim()) throw new AiProviderError("invalid_response");
  const usage = isRecord(payload.usage) ? payload.usage : {};
  return {
    text: message,
    inputTokens: readTokenCount(usage.prompt_tokens),
    outputTokens: readTokenCount(usage.completion_tokens),
  };
}

async function callAnthropic(input: GenerateAiTextInput, signal: AbortSignal) {
  const apiKey = requireSecret("ANTHROPIC_API_KEY");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      system: input.systemPrompt,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
      max_tokens: input.maxOutputTokens ?? 1200,
    }),
    signal,
  });
  const payload = await readJson(response);
  const content = Array.isArray(payload.content) ? payload.content : [];
  const texts = content.filter(isRecord).map((item) => item.text).filter((value): value is string => typeof value === "string");
  if (!texts.some((text) => text.trim())) throw new AiProviderError("invalid_response");
  const usage = isRecord(payload.usage) ? payload.usage : {};
  return {
    text: texts.join("\n"),
    inputTokens: readTokenCount(usage.input_tokens),
    outputTokens: readTokenCount(usage.output_tokens),
  };
}

async function callMistral(input: GenerateAiTextInput, signal: AbortSignal) {
  const apiKey = requireSecret("MISTRAL_API_KEY");
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: buildUserPrompt(input) },
      ],
      max_tokens: input.maxOutputTokens ?? 1200,
      stream: false,
    }),
    signal,
  });
  const payload = await readJson(response);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const first = choices[0];
  const message = isRecord(first) && isRecord(first.message) ? first.message.content : null;
  if (typeof message !== "string" || !message.trim()) throw new AiProviderError("invalid_response");
  const usage = isRecord(payload.usage) ? payload.usage : {};
  return {
    text: message,
    inputTokens: readTokenCount(usage.prompt_tokens),
    outputTokens: readTokenCount(usage.completion_tokens),
  };
}

function buildUserPrompt(input: GenerateAiTextInput) {
  return `Contexte disponible :\n${input.context || "Aucune donnee disponible."}\n\nQuestion :\n${input.question}\n\nUtilise l'etat operationnel pour les faits propres au compte et les sources documentaires pour les connaissances externes. Signale clairement les informations manquantes ou a verifier.`;
}

function requireSecret(name: "OPENAI_API_KEY" | "DEEPSEEK_API_KEY" | "ANTHROPIC_API_KEY" | "MISTRAL_API_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new AiProviderError("configuration");
  return value;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    if (response.status === 429) throw new AiProviderError("rate_limit", response.status);
    if (response.status === 401 || response.status === 403) throw new AiProviderError("configuration", response.status);
    if (response.status === 408 || response.status === 504) throw new AiProviderError("timeout", response.status);
    if (response.status >= 500) throw new AiProviderError("unavailable", response.status);
    throw new AiProviderError("request_failed", response.status);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new AiProviderError("invalid_response");
  }
  if (!isRecord(payload)) throw new AiProviderError("invalid_response");
  return payload;
}

function isAbortError(error: unknown) {
  return isRecord(error) && (error.name === "AbortError" || error.name === "TimeoutError");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTokenCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
