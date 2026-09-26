import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync(new URL("../../lib/ai/provider.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

const input = { provider: "mistral", model: "test-model", systemPrompt: "Aider une compagnie.", question: "Comment préparer une répétition ?", context: "Contexte autorisé", maxOutputTokens: 250 };
const secret = "private-test-api-key";

function harness(fetchMock, env = { MISTRAL_API_KEY: secret }) {
  const calls = [];
  const timers = new Set();
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => { assert.equal(name, "server-only"); return {}; },
    process: { env },
    AbortController,
    setTimeout(callback, delay) { const timer = { callback, delay }; timers.add(timer); return timer; },
    clearTimeout(timer) { timers.delete(timer); },
    fetch: async (...args) => { calls.push(args); return fetchMock(...args); },
  });
  return { ...exports, calls, timers, expire() { for (const timer of timers) timer.callback(); } };
}

function assertSafeError(error, code, status) {
  assert.equal(error.name, "AiProviderError");
  assert.equal(error.code, code);
  assert.equal(error.status, status);
  assert.doesNotMatch(error.message, /private-test-api-key|private-upstream|api\.mistral|MISTRAL_API_KEY/);
  return true;
}

test("les erreurs fournisseur sont distinctes du quota TaDiff, sans détail distant ni réessai automatique", async (t) => {
  for (const [status, code] of [[429, "rate_limit"], [401, "configuration"], [403, "configuration"], [503, "unavailable"], [500, "unavailable"], [408, "timeout"], [504, "timeout"], [400, "request_failed"]]) {
    await t.test(`${status} : ${code}`, async () => {
      let bodyReads = 0;
      const h = harness(async () => ({ ok: false, status, json: async () => { bodyReads++; return { message: `private-upstream ${secret}` }; } }));
      await assert.rejects(h.generateAiText(input), (error) => {
        assertSafeError(error, code, status);
        if (status === 429) {
          assert.match(error.message, /limite de requêtes/);
          assert.match(error.message, /distinct de votre quota TaDiff/);
          assert.doesNotMatch(error.message, /ajouter des crédits|quota.*épuisé/);
        }
        return true;
      });
      assert.equal(h.calls.length, 1);
      assert.equal(bodyReads, 0);
      assert.equal(h.timers.size, 0);
    });
  }
});

test("une clé absente est une erreur de configuration sans requête réseau", async () => {
  const h = harness(() => { throw Error("fetch ne doit pas être appelé"); }, { MISTRAL_API_KEY: "   " });
  await assert.rejects(h.generateAiText(input), (error) => assertSafeError(error, "configuration"));
  assert.equal(h.calls.length, 0);
  assert.equal(h.timers.size, 0);
});

test("un échec réseau ne révèle ni URL ni secret", async () => {
  const h = harness(async () => { throw Error(`private-upstream https://api.mistral.ai/${secret}`); });
  await assert.rejects(h.generateAiText(input), (error) => assertSafeError(error, "unavailable"));
  assert.equal(h.calls.length, 1);
  assert.equal(h.timers.size, 0);
});

test("le délai de 45 secondes interrompt la requête et rend une erreur compréhensible", async () => {
  const h = harness((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("private-upstream", "AbortError")), { once: true });
  }));
  const pending = h.generateAiText(input);
  const rejected = assert.rejects(pending, (error) => assertSafeError(error, "timeout"));
  assert.equal([...h.timers][0].delay, 45_000);
  h.expire();
  await rejected;
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][1].signal.aborted, true);
  assert.equal(h.timers.size, 0);
});

test("une interruption pendant la lecture du corps reste une expiration", async () => {
  const h = harness(async () => ({ ok: true, status: 200, json: async () => { throw new DOMException("private-upstream", "AbortError"); } }));
  await assert.rejects(h.generateAiText(input), (error) => assertSafeError(error, "timeout"));
  assert.equal(h.timers.size, 0);
});

test("les réponses illisibles ou vides ne sont pas présentées comme des réponses de William", async (t) => {
  for (const [label, json] of [
    ["JSON invalide", async () => { throw Error("private-upstream JSON"); }],
    ["tableau JSON", async () => []],
    ["message absent", async () => ({})],
    ["message blanc", async () => ({ choices: [{ message: { content: " \n " } }] })],
  ]) {
    await t.test(label, async () => {
      const h = harness(async () => ({ ok: true, status: 200, json }));
      await assert.rejects(h.generateAiText(input), (error) => assertSafeError(error, "invalid_response"));
      assert.equal(h.timers.size, 0);
    });
  }
});

test("les quatre fournisseurs conservent leur requête et leur résultat en cas de succès", async (t) => {
  const cases = [
    ["mistral", "MISTRAL_API_KEY", "https://api.mistral.ai/v1/chat/completions", { choices: [{ message: { content: "Préparez les créneaux." } }], usage: { prompt_tokens: 15, completion_tokens: 8 } }],
    ["deepseek", "DEEPSEEK_API_KEY", "https://api.deepseek.com/chat/completions", { choices: [{ message: { content: "Préparez les créneaux." } }], usage: { prompt_tokens: 15, completion_tokens: 8 } }],
    ["openai", "OPENAI_API_KEY", "https://api.openai.com/v1/responses", { output: [{ content: [{ text: "Préparez les créneaux." }] }], usage: { input_tokens: 15, output_tokens: 8 } }],
    ["anthropic", "ANTHROPIC_API_KEY", "https://api.anthropic.com/v1/messages", { content: [{ text: "Préparez les créneaux." }], usage: { input_tokens: 15, output_tokens: 8 } }],
  ];
  for (const [provider, key, endpoint, payload] of cases) {
    await t.test(provider, async () => {
      const h = harness(async () => ({ ok: true, status: 200, json: async () => payload }), { [key]: secret });
      const result = await h.generateAiText({ ...input, provider });
      assert.equal(result.text, "Préparez les créneaux.");
      assert.equal(result.inputTokens, 15);
      assert.equal(result.outputTokens, 8);
      assert.equal(h.calls.length, 1);
      const [url, options] = h.calls[0];
      assert.equal(url, endpoint);
      const body = JSON.parse(options.body);
      assert.equal(body.model, input.model);
      assert.equal(body.max_output_tokens ?? body.max_tokens, 250);
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.headers.Authorization ?? options.headers["x-api-key"], provider === "anthropic" ? secret : `Bearer ${secret}`);
      assert.equal(h.timers.size, 0);
    });
  }
});
