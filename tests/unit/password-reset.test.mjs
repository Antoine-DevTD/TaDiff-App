import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(file, root), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: (name) => name.startsWith("@/") ? load(name.slice(2) + ".ts") : require(name), TextEncoder, URL, URLSearchParams }, { filename: file });
  cache.set(file, loadedModule.exports); return loadedModule.exports;
}
const { inspectResetLink, issueResetLink, completeReset, passwordResetHash, newPasswordResetToken } = load("lib/password-reset.ts");
const token = "a".repeat(64);

function fixture({ fail = null, unknown = false, applied = false, throwUpdate = false } = {}) {
  const calls = []; let state = "ready";
  const backend = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "issue_password_reset_link") return { data: unknown ? { status: "ignored" } : { status: "issued", email: "person@example.test", expiresAt: "2026-10-28T12:00:00Z" }, error: null };
      if (name === "inspect_password_reset_link") return { data: { status: state, expiresAt: "2026-10-28T12:00:00Z" }, error: null };
      if (name === "claim_password_reset_link") return { data: { status: state === "ready" ? "claimed" : state, userId: "bound-user", claimId: "claim" }, error: null };
      if (name === "password_reset_claim_applied") return { data: applied, error: null };
      return { data: null, error: null };
    },
    changePassword: async (...args) => { calls.push({ name: "changePassword", args }); if (applied || !fail) state = "used"; if (throwUpdate) throw new Error("Network"); return { error: fail ? { code: fail } : null }; },
  };
  return { backend, calls, setState: (value) => { state = value; } };
}

test("jetons aléatoires, empreintes distinctes et secret uniquement dans le fragment", async () => {
  assert.match(newPasswordResetToken(), /^[a-f0-9]{64}$/);
  assert.notEqual(newPasswordResetToken(), newPasswordResetToken());
  assert.notEqual(passwordResetHash(token), token);
  const f = fixture(); const link = await issueResetLink(f.backend, " PERSON@EXAMPLE.TEST ", "https://tadiff.com");
  const parsed = new URL(link.url);
  assert.equal(parsed.pathname, "/reset-password"); assert.equal(parsed.search, "");
  assert.match(parsed.hash, /^#recovery=[a-f0-9]{64}$/);
  assert.equal(f.calls[0].args.p_email, "person@example.test");
  assert.equal(f.calls[0].args.p_token_hash, passwordResetHash(parsed.hash.split("=")[1]));
  assert.equal(await issueResetLink(fixture({ unknown: true }).backend, "unknown@example.test", "https://tadiff.com"), null);
});
test("la consultation ne réserve ni ne change le compte", async () => {
  const f = fixture(); for (let i = 0; i < 5; i++) assert.equal((await inspectResetLink(f.backend, token)).status, "ready");
  assert.ok(f.calls.every((call) => call.name === "inspect_password_reset_link"));
  assert.equal((await inspectResetLink(f.backend, "bad")).status, "invalid");
});
test("validation avant la réservation, mot de passe faible et réessai sur le même lien", async () => {
  const f = fixture({ fail: "weak_password" });
  assert.equal((await completeReset(f.backend, token, "short", "short")).status, "error"); assert.equal(f.calls.length, 0);
  assert.equal((await completeReset(f.backend, token, "long-password", "different")).status, "error"); assert.equal(f.calls.length, 0);
  assert.equal((await completeReset(f.backend, token, "é".repeat(37), "é".repeat(37))).status, "error"); assert.equal(f.calls.length, 0);
  const result = await completeReset(f.backend, token, "long-password", "long-password");
  assert.match(result.message, /facile à deviner/);
  assert.equal(f.calls.at(-1).name, "release_password_reset_claim");
  assert.equal((await inspectResetLink(f.backend, token)).status, "ready");
});
test("seul l’utilisateur lié au jeton est modifié, pas l’utilisateur connecté dans le navigateur", async () => {
  const f = fixture(); assert.equal((await completeReset(f.backend, token, "new-password", "new-password")).status, "changed");
  assert.deepEqual(f.calls.find((c) => c.name === "changePassword").args, ["bound-user", "new-password", "claim"]);
  assert.equal((await completeReset(f.backend, token, "another-password", "another-password")).status, "used");
  assert.equal(f.calls.filter((c) => c.name === "changePassword").length, 1);
});
test("réponse perdue après validation récupérée sans libérer ou rejouer le changement", async () => {
  const f = fixture({ applied: true, throwUpdate: true });
  assert.equal((await completeReset(f.backend, token, "new-password", "new-password")).status, "changed");
  assert.ok(!f.calls.some((c) => c.name === "release_password_reset_claim"));
});
test("issue inconnue : réservation conservée jusqu’au délai, expiration et lien occupé respectés", async () => {
  const f = fixture({ fail: "network", throwUpdate: true });
  assert.match((await completeReset(f.backend, token, "new-password", "new-password")).message, /deux minutes/);
  assert.ok(!f.calls.some((c) => c.name === "release_password_reset_claim"));
  for (const state of ["busy", "expired", "used", "invalid"]) {
    const other = fixture(); other.setState(state);
    assert.equal((await completeReset(other.backend, token, "new-password", "new-password")).status, state);
    assert.ok(!other.calls.some((c) => c.name === "changePassword"));
  }
});
