import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";

test("répétitions : création, réponse publique, commentaire, agenda, fermeture et isolation", {
  skip: process.env.TADIFF_LOCAL_SUPABASE !== "1",
  timeout: 180_000,
}, async () => {
  const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const appUrl = process.env.TADIFF_TEST_APP_URL || "http://localhost:3104";
  assert.equal(dbUrl, "http://127.0.0.1:54321");
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(appUrl).hostname));
  assert.ok(!process.env.RESEND_API_KEY, "Aucune clé d’envoi autorisée pour ce test");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const db = createClient(dbUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anon = createClient(dbUrl, publicKey, options);
  const companyId = randomUUID();
  const otherCompanyId = randomUUID();
  const showId = randomUUID();
  const email = `repetitions-${randomUUID()}@tadiff.test`;
  const password = `Local!${randomUUID()}`;
  let userId;
  let browser;
  async function insert(table, values) {
    const result = await db.from(table).insert(values).select().single();
    assert.ifError(result.error);
    return result.data;
  }
  try {
    await insert("companies", { id: companyId, name: "Répétitions locales", billing_status: "active", plan_code: "beta" });
    await insert("companies", { id: otherCompanyId, name: "Autre compagnie locale" });
    const user = await db.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(user.error);
    userId = user.data.user.id;
    await insert("profiles", { id: userId, company_id: companyId, role: "owner", full_name: "Production locale" });
    await insert("shows", { id: showId, company_id: companyId, title: "Répétitions locales", discipline: "Théâtre", status: "Creation" });
    const person = await insert("contacts", { company_id: companyId, name: "Camille locale", contact_type: "person", status: "Partenaire" });
    await insert("show_team_members", { company_id: companyId, show_id: showId, contact_id: person.id, job_title: "Comédienne" });
    const foreignShow = await insert("shows", { company_id: otherCompanyId, title: "Autre spectacle", discipline: "Théâtre", status: "Creation" });
    await insert("rehearsal_polls", { company_id: otherCompanyId, show_id: foreignShow.id, title: "Autre sondage" });

    const owner = createClient(dbUrl, publicKey, options);
    assert.ifError((await owner.auth.signInWithPassword({ email, password })).error);
    const hidden = await owner.from("rehearsal_polls").select("id").eq("show_id", foreignShow.id);
    assert.ifError(hidden.error);
    assert.deepEqual(hidden.data, []);

    browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
    const route = `/shows/${showId}?tab=rehearsals`;
    await page.goto(`${appUrl}/login?next=${encodeURIComponent(route)}`);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await page.waitForURL(new RegExp(`/shows/${showId}`), { timeout: 30_000 });
    await page.getByLabel("Nom du sondage").fill("Création de novembre");
    await page.getByLabel("Lieu par défaut").fill("Studio principal");
    await page.getByLabel("Du", { exact: true }).fill("2027-11-01");
    await page.getByLabel("Au", { exact: true }).fill("2027-11-02");
    await page.getByRole("button", { name: "Créer et obtenir le lien" }).click();
    await expect(page.getByRole("heading", { name: "Création de novembre", exact: true })).toBeVisible();
    await expect(page.getByText("Studio principal", { exact: true })).toHaveCount(4);
    const { data: poll, error: pollError } = await db.from("rehearsal_polls").select("id,public_token").eq("show_id", showId).single();
    assert.ifError(pollError);
    const publicPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await publicPage.goto(`${appUrl}/repetitions/${poll.public_token}`);
    await publicPage.getByRole("combobox", { name: "Qui êtes-vous ?" }).fill("Camille locale");
    await publicPage.getByRole("option", { name: "Camille locale", exact: true }).click();
    await publicPage.getByRole("button", { name: "Tout marquer disponible" }).click();
    await publicPage.getByLabel("Un détail à transmettre ?", { exact: false }).fill("Départ à midi le mardi.");
    await publicPage.getByRole("button", { name: "Envoyer mes disponibilités" }).click();
    await expect(publicPage.getByText(/disponibilités ont bien été transmises/)).toBeVisible();
    assert.ok(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Aucun débordement de page sur mobile");

    // Execute the actual reader with an authenticated client to exercise its FK join and RLS.
    const exports = {};
    const compiled = ts.transpileModule(readFileSync(new URL("../../lib/rehearsals.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(compiled, { exports, require: (name) => name === "@/lib/env" ? { hasSupabaseEnv: () => true } : { getSupabaseServerClient: async () => owner } });
    const workspace = await exports.getShowRehearsalWorkspace(showId);
    assert.equal(workspace.error, null);
    assert.equal(workspace.polls[0].participants[0].comment, "Départ à midi le mardi.");
    assert.equal(workspace.polls[0].responses.length, 4);

    await page.reload();
    await expect(page.getByText("Départ à midi le mardi.", { exact: true })).toBeVisible();
    await page.getByRole("checkbox", { name: "Sélectionner le créneau du 2027-11-01" }).first().check();
    await page.getByRole("button", { name: "Confirmer dans l’agenda" }).click();
    await expect(page.getByText("Confirmé dans l’agenda", { exact: true })).toBeVisible();
    const slotId = workspace.polls[0].slots[0].id;
    const twice = await owner.rpc("confirm_rehearsal_slots", { p_show_id: showId, p_poll_id: poll.id, p_slot_ids: [slotId] });
    assert.ifError(twice.error);
    assert.equal(twice.data, 0);
    const events = await db.from("calendar_events").select("id,location,start_time,end_time").eq("related_show_id", showId);
    assert.ifError(events.error);
    assert.equal(events.data.length, 1);
    assert.equal(events.data[0].location, "Studio principal");

    await page.getByRole("button", { name: "Fermer le sondage" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Rouvrir le sondage" })).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByRole("heading", { name: "Ce sondage est fermé" })).toBeVisible();
    const rejected = await anon.rpc("submit_public_rehearsal_response", { p_token: poll.public_token, p_participant_id: workspace.polls[0].participants[0].id, p_display_name: "", p_comment: "", p_responses: workspace.polls[0].slots.map((slot) => ({ slotId: slot.id, availability: "yes" })) });
    assert.ok(rejected.error);
    await page.getByRole("button", { name: "Rouvrir le sondage" }).click();
    await expect(page.getByRole("button", { name: "Fermer le sondage" })).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByLabel("Qui êtes-vous ?")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: "tmp/rehearsal-readiness-mobile.png", fullPage: true });
  } finally {
    if (browser) await browser.close();
    assert.ifError((await db.from("companies").delete().in("id", [companyId, otherCompanyId])).error);
    if (userId) assert.ifError((await db.auth.admin.deleteUser(userId)).error);
  }
});
