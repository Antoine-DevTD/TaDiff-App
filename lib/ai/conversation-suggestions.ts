const suggestionsPattern = /<questions_suivantes>\s*([\s\S]*?)\s*<\/questions_suivantes>/i;

export type WilliamResponseContent = {
  text: string;
  suggestedQuestions: string[];
};

export function extractWilliamResponseContent(value: string): WilliamResponseContent {
  const match = value.match(suggestionsPattern);
  if (!match) return { text: value.trim(), suggestedQuestions: [] };

  const text = value.replace(match[0], "").trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return { text: text || value.trim(), suggestedQuestions: [] };
  }

  const validQuestions = Array.isArray(parsed)
    ? parsed
      .filter((question): question is string => typeof question === "string")
      .map((question) => question.replace(/\s+/g, " ").trim())
      .filter((question) => question.length >= 3 && question.length <= 180)
    : [];
  const suggestedQuestions = [...new Set(validQuestions)].slice(0, 3);

  return {
    text: text || value.trim(),
    suggestedQuestions,
  };
}
