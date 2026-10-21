// Contrôle explicite : crée puis supprime uniquement son propre compte QA.
// Aucun email envoyé, aucun compte réel modifié, aucun secret dans les sorties.
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.argv[2] || "http://127.0.0.1:3113").origin;
if (!process.argv.includes("--allow-qa-user")) throw new Error("L’option --allow-qa-user est nécessaire pour ce contrôle explicite.");
if (!["tadiff.com", "127.0.0.1", "localhost"].includes(new URL(origin).hostname)) throw new Error("Origine QA non autorisée.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const email = `password-reset-qa-${randomUUID()}@example.test`;
const oldPassword = "TaDiffQA!" + randomBytes(24).toString("hex"), newPassword = "TaDiffQA!" + randomBytes(24).toString("hex");
const must = (result) => { if (result.error) throw new Error(result.error.code || "Supabase QA failure"); return result.data; };
let userId = null, browser;
const checks = {};
const post = async (body, from = origin) => {
  const response = await fetch(origin + "/api/auth/password-reset", { method: "POST", headers: { origin: from, "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
};
try {
  assert.equal((await post({}, "https://outside.example")).status, 403);
  const user = must(await db.auth.admin.createUser({ email, password: oldPassword, email_confirm: true })).user;
  userId = user.id;
  const token = randomBytes(32).toString("hex"), tokenHash = createHash("sha256").update(`tadiff:password-reset:v1:${token}`).digest("hex");
  const issued = must(await db.rpc("issue_password_reset_link", { p_email: email, p_token_hash: tokenHash }));
  assert.equal(issued.status, "issued");
  const record = must(await db.from("password_reset_links").select("created_at,expires_at").eq("token_hash", tokenHash).single());
  assert.ok(Math.abs(Date.parse(record.expires_at) - Date.parse(record.created_at) - 604800000) < 1000);
  checks.sevenDaysOnServer = true;
  for (let i = 0; i < 3; i++) { const result = await post({ action: "inspect", token }); assert.equal(result.body.status, "ready"); assert.equal(result.cache, "no-store"); }
  checks.repeatedReads = true;
  browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const second = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = []; page.on("pageerror", (error) => pageErrors.push(error.message));
  const url = origin + "/reset-password#recovery=" + token;
  await page.goto(url); await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
  await second.goto(url); await expect(second.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
  checks.reopenedInTwoBrowsers = true;
  must(await db.from("password_reset_links").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("token_hash", tokenHash));
  await page.reload(); await expect(page.getByRole("alert").filter({ hasText: "expiré au bout de 7 jours" })).toBeVisible();
  must(await db.from("password_reset_links").update({ expires_at: issued.expiresAt }).eq("token_hash", tokenHash));
  await page.reload(); await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
  checks.expiryEnforced = true;
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirmer le mot de passe").fill("different-password");
  await page.getByRole("button", { name: "Enregistrer le nouveau mot de passe", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Les deux mots de passe" })).toBeVisible();
  assert.equal((await post({ action: "inspect", token })).body.status, "ready");
  checks.validationDoesNotConsume = true;
  await page.getByLabel("Confirmer le mot de passe").fill(newPassword);
  await page.getByLabel("Confirmer le mot de passe").press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "nouveau mot de passe est enregistré" })).toBeVisible();
  assert.equal((await post({ action: "inspect", token })).body.status, "used");
  checks.realPasswordChangeConsumes = true;
  const stored = must(await db.from("password_reset_links").select("claim_id,applied_at").eq("token_hash", tokenHash).single());
  assert.ok(stored.applied_at);
  assert.equal(must(await db.rpc("password_reset_claim_applied", { p_claim_id: stored.claim_id })), true);
  checks.atomicAuthReceipt = true;
  const replay = await post({ action: "complete", token, password: oldPassword, confirmPassword: oldPassword });
  assert.equal(replay.body.status, "used"); checks.replayBlocked = true;
  await second.reload(); await expect(second.getByRole("alert").filter({ hasText: "désactivé après un changement" })).toBeVisible();
  const fresh = must(await db.auth.admin.getUserById(userId)).user;
  assert.equal(fresh.app_metadata.tadiff_password_reset_claim, undefined); checks.noClaimInUserMetadata = true;
  assert.ok((await anon.auth.signInWithPassword({ email, password: oldPassword })).error);
  must(await anon.auth.signInWithPassword({ email, password: newPassword })); checks.newPasswordWorksOldRefused = true;
  const denied = await anon.from("password_reset_links").select("id"); assert.ok(denied.error || denied.data.length === 0); checks.recoveryTablePrivate = true;
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(pageErrors, []);
  console.log(JSON.stringify({ origin, checks, emailSent: false }));
} finally {
  if (browser) await browser.close();
  if (userId) { must(await db.auth.admin.deleteUser(userId)); console.log(JSON.stringify({ temporaryQaUserDeleted: true })); }
}
