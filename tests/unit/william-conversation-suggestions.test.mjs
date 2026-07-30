import assert from "node:assert/strict";
import test from "node:test";
import { extractWilliamResponseContent } from "../../lib/ai/conversation-suggestions.ts";

test("separe la reponse de William de ses questions suivantes", () => {
  const result = extractWilliamResponseContent([
    "Commencez par compléter le dossier artistique.",
    "",
    "<questions_suivantes>[\"Quel document manque ?\",\"Prépare-moi un email de relance.\"]</questions_suivantes>",
  ].join("\n"));

  assert.equal(result.text, "Commencez par compléter le dossier artistique.");
  assert.deepEqual(result.suggestedQuestions, [
    "Quel document manque ?",
    "Prépare-moi un email de relance.",
  ]);
});

test("borne, nettoie et deduplique les questions proposees", () => {
  const result = extractWilliamResponseContent(
    "Réponse.\n<questions_suivantes>[\"  Et ensuite ?  \",\"Et ensuite ?\",\"Deuxième étape ?\",\"Troisième étape ?\"]</questions_suivantes>",
  );

  assert.deepEqual(result.suggestedQuestions, [
    "Et ensuite ?",
    "Deuxième étape ?",
    "Troisième étape ?",
  ]);
});

test("masque un bloc de suggestions mal forme", () => {
  const result = extractWilliamResponseContent(
    "Réponse utile.\n<questions_suivantes>pas du json</questions_suivantes>",
  );

  assert.equal(result.text, "Réponse utile.");
  assert.deepEqual(result.suggestedQuestions, []);
});
