import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const source = (file) => readFileSync(new URL(file, root), "utf8");
const compile = (file) => ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const runtime = (name, file) => readFileSync(path.join(path.dirname(require.resolve(`${name}/package.json`)), "cjs", `${file}.production.js`), "utf8");
const signup = { id: "suzanne", companyName: "Compagnie annoncée par Suzanne", contactName: "Suzanne Bussy", email: "suzanne@example.test", phone: "", city: "La Rochelle", discipline: "Théâtre", mainNeed: "Diffusion", status: "reserved", position: 1, isDemo: false, createdAt: "2026-10-04T08:00:00Z", paymentEmailSentAt: null, paymentConfirmedAt: null, paymentReference: "", invitationSentAt: null, invitedUserId: null, accountCreatedAt: null, lastAccessError: "", williamBetaCreditedAt: null, accessGrantedAt: null, accessGrantNote: "", linkedCompanyId: null, linkedCompanyName: null, billingStatus: null, compedUntil: null, memberCount: 0, hasAccess: false, accountExists: false, emailConfirmedAt: null, lastSignInAt: null };
const paid = { ...signup, id: "julien", contactName: "Julien Martin", email: "julien@example.test", companyName: "Ancien nom de la compagnie", linkedCompanyName: "Compagnie des Éclats", linkedCompanyId: "company-paid", paymentConfirmedAt: "2026-10-04T09:00:00Z", paymentReference: "Paiement vérifié", accountExists: true, accountCreatedAt: "2026-10-04T09:15:00Z", billingStatus: "active", hasAccess: true, memberCount: 3, emailConfirmedAt: "2026-10-04T09:14:00Z", lastSignInAt: "2026-10-05T08:30:00Z" };
const offeredPending = { ...signup, id: "lena", contactName: "Léna Martin", email: "lena@example.test", companyName: "Compagnie du Lointain", accessGrantedAt: "2026-10-05T09:00:00Z", accessGrantNote: "Collaboration artistique", lastAccessError: "L’invitation précédente n’a pas abouti." };
const offeredOpen = { ...signup, id: "camille", contactName: "Camille Rhône", email: "camille.longue-adresse-pour-verifier-la-largeur-sur-mobile@example.test", companyName: "Nom déclaré à l’inscription", linkedCompanyName: "Compagnie rattachée avec un nom suffisamment long pour éprouver le mobile", linkedCompanyId: "company-offered", accountExists: true, accountCreatedAt: "2026-10-04T08:15:00Z", billingStatus: "comped", hasAccess: true, memberCount: 2, emailConfirmedAt: "2026-10-04T08:14:00Z" };
const waitlist = { ...signup, id: "waiting", contactName: "Nina Liste d’attente", email: "nina@example.test", status: "waitlist" };
const demo = { ...paid, id: "demo", contactName: "Compte démonstration", email: "demo@example.test", companyName: "Compagnie Démonstration", linkedCompanyName: "Compagnie Démonstration", linkedCompanyId: "company-demo", isDemo: true };
const historicalGrant = { ...offeredOpen, id: "historical", contactName: "Ancien accès offert", email: "ancien@example.test", accessGrantedAt: "2026-10-01T08:00:00Z", accessGrantNote: "Ancienne collaboration", billingStatus: "cancelled", hasAccess: false };
const suzanneExisting = { ...signup, invitedUserId: "suzanne-user", linkedCompanyId: "suzanne-company", linkedCompanyName: "Suzanne Bussy", billingStatus: "comped", hasAccess: true, memberCount: 1, accountExists: true, accountCreatedAt: "2026-10-07T18:00:00Z" };
const signups = [signup, paid, offeredPending, offeredOpen, waitlist, demo];
const actions = { grantBetaComplimentaryAccess: "grant", inviteBetaSignups: "invite", confirmBetaPayment: "confirm-payment", sendBetaPaymentEmails: "send-payment", markBetaPaymentEmailsSent: "mark-payment", resendBetaInvitation: "resend", creditBetaWilliam: "credit" };

function bundle() {
  const modules = {
    react: runtime("react", "react"), "react/jsx-runtime": runtime("react", "react-jsx-runtime"), "react-dom": runtime("react-dom", "react-dom"), "react-dom/client": runtime("react-dom", "react-dom-client"), scheduler: runtime("scheduler", "scheduler"),
    "next/link": "exports.__esModule=true;exports.default=(props)=>require('react').createElement('a',props);",
    "next/navigation": "exports.useRouter=()=>({refresh:()=>window.refreshCount++});",
    "lucide-react": "for(const name of ['Coins','Gift','RefreshCw','Search','Send'])exports[name]=(props)=>require('react').createElement('svg',props);",
    "@/lib/utils": "exports.cn=(...values)=>values.filter(Boolean).join(' ');",
    "@/app/(dashboard)/admin/beta/actions": Object.entries(actions).map(([exportName, actionName]) => `exports.${exportName}=(input)=>window.invoke(${JSON.stringify(actionName)},input);`).join(""),
    "@/lib/beta-access": compile("lib/beta-access.ts"),
    "@/components/ui/button": compile("components/ui/button.tsx"), "@/components/ui/input": compile("components/ui/input.tsx"), "@/components/ui/badge": compile("components/ui/badge.tsx"), "@/components/ui/select": compile("components/ui/select.tsx"),
    component: compile("components/admin/beta-access-manager.tsx"),
  };
  return `const modules={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:(module,exports,require)=>{${code}\n}`).join(",")}};const cache={};function require(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;modules[name](module,module.exports,require);return module.exports;}const React=require('react');const root=require('react-dom/client').createRoot(document.getElementById('root'));window.renderFixture=(props)=>root.render(React.createElement(require('component').BetaAccessManager,props));window.renderFixture(window.fixture);`;
}

// Real React components and Tailwind, local action doubles only: no database, account, email or payment.
test("bêta : accès offert, supervision, droits, reprise, clavier et mobile", { timeout: 120_000 }, async (t) => {
  const theme = source("app/globals.css").match(/@theme\s*\{[\s\S]*?\}/)[0];
  const css = (await postcss([tailwindcss({ base: process.cwd() })]).process(`@import "tailwindcss" source(none); @source "./components/admin/beta-access-manager.tsx"; @source "./components/ui"; ${theme} body{margin:0;padding:16px;background:#e8eef7;color:#0f172a;font-family:sans-serif} #root{max-width:1180px;margin:auto}`, { from: path.join(process.cwd(), "beta-supervision-test.css") })).css;
  const javascript = bundle();
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: "chrome" });
  const errors = [];
  await mkdir("tmp", { recursive: true });
  async function fixture(props = { canManage: true, signups }, responses = {}, width = 390) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.setDefaultTimeout(5000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: '<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>' }));
    await page.goto("http://127.0.0.1:3197/");
    await page.addStyleTag({ content: css });
    await page.evaluate(({ props, responses }) => {
      window.fixture = props; window.responses = responses; window.calls = []; window.refreshCount = 0; window.releaseActions = {};
      window.invoke = async (name, input) => {
        window.calls.push({ name, input });
        const response = window.responses[name]?.shift();
        if (!response) throw new Error(`Unexpected local test action: ${name}`);
        if (response.reject) throw new Error("Local network failure");
        if (response.hold) return new Promise((resolve) => { window.releaseActions[name] = () => resolve(response.result); });
        return response.result;
      };
    }, { props, responses });
    await page.addScriptTag({ content: javascript });
    await expect(page.getByRole("button", { name: "Actualiser", exact: true })).toBeVisible();
    return page;
  }
  const row = (page, person) => page.getByRole("article").filter({ has: page.getByRole("heading", { name: person, exact: true }) });
  const grant = (page) => row(page, signup.contactName).getByRole("button", { name: "Offrir l’accès", exact: true });
  const note = (page) => page.getByRole("textbox", { name: `Motif de l’accès offert pour ${signup.contactName}`, exact: true });
  try {
    await t.test("offrir sans motif ne confirme pas de paiement et n’envoie aucun message", async () => {
      const page = await fixture({ canManage: true, signups: [signup] }, { grant: [{ result: { ok: true, message: "Accès offert enregistré. Aucune invitation n’a été envoyée." } }] });
      await grant(page).click();
      await expect(page.getByRole("status")).toContainText("Accès offert enregistré");
      assert.deepEqual(await page.evaluate(() => window.calls), [{ name: "grant", input: { signupId: signup.id, note: "" } }]);
      assert.equal(await page.evaluate(() => window.refreshCount), 1);
      const updated = { ...signup, accessGrantedAt: "2026-10-05T09:30:00Z" };
      await page.evaluate((updated) => window.renderFixture({ canManage: true, signups: [updated] }), updated);
      await expect(grant(page)).toHaveCount(0);
      await expect(row(page, signup.contactName).getByText("Offert sans limite", { exact: true })).toBeVisible();
      await expect(row(page, signup.contactName).getByText("Compte à créer", { exact: true })).toBeVisible();
      const invite = row(page, signup.contactName).getByRole("button", { name: "Envoyer l’invitation", exact: true });
      await expect(invite).toBeEnabled();
      assert.equal((await page.evaluate(() => window.calls)).length, 1);
      await page.evaluate(() => { window.responses.invite = [{ result: { ok: true, message: "Invitation envoyée." } }]; });
      await invite.click();
      await expect(page.getByRole("status")).toHaveText("Invitation envoyée.");
      assert.deepEqual((await page.evaluate(() => window.calls))[1], { name: "invite", input: { signupIds: [signup.id] } });
      await page.close();
    });
    await t.test("pendant l’activation, double clic et autres mutations sont bloqués", async () => {
      const page = await fixture({ canManage: true, signups: [signup, offeredPending] }, { grant: [{ hold: true, result: { ok: true, message: "Accès offert enregistré." } }] });
      await note(page).fill("Collaboration avec l’équipe");
      await grant(page).evaluate((button) => { button.click(); button.click(); });
      await expect(grant(page)).toBeDisabled();
      await expect(note(page)).toBeDisabled();
      await expect(row(page, offeredPending.contactName).getByRole("button", { name: "Envoyer l’invitation", exact: true })).toBeDisabled();
      assert.deepEqual(await page.evaluate(() => window.calls), [{ name: "grant", input: { signupId: signup.id, note: "Collaboration avec l’équipe" } }]);
      await page.evaluate(() => window.releaseActions.grant());
      await expect(page.getByRole("status")).toHaveText("Accès offert enregistré.");
      await expect(grant(page)).toBeEnabled();
      await page.close();
    });
    await t.test("Suzanne : compte et compagnie offerts existants, invitation puis renvoi explicites sans faux paiement", async () => {
      const page = await fixture({ canManage: true, signups: [suzanneExisting] }, {
        invite: [{ result: { ok: true, message: "Invitation envoyée." } }],
        resend: [{ result: { ok: true, message: "Invitation renouvelée." } }],
      });
      const suzanne = row(page, suzanneExisting.contactName);
      await expect(suzanne.getByText("Compte existant · email à confirmer", { exact: true })).toBeVisible();
      await expect(suzanne.getByText("Offert sans limite", { exact: true })).toBeVisible();
      await expect(suzanne.getByRole("button", { name: "Offrir l’accès", exact: true })).toHaveCount(0);
      const invite = suzanne.getByRole("button", { name: "Envoyer l’invitation", exact: true });
      await expect(invite).toBeEnabled();
      assert.deepEqual(await page.evaluate(() => window.calls), []);
      await invite.focus(); await page.keyboard.press("Enter");
      await expect(page.getByRole("status")).toHaveText("Invitation envoyée.");
      assert.deepEqual(await page.evaluate(() => window.calls), [{ name: "invite", input: { signupIds: [suzanneExisting.id] } }]);
      const invited = { ...suzanneExisting, invitationSentAt: "2026-10-08T10:00:00Z" };
      await page.evaluate((entry) => window.renderFixture({ canManage: true, signups: [entry] }), invited);
      await expect(suzanne.getByRole("button", { name: "Envoyer l’invitation", exact: true })).toHaveCount(0);
      const resend = suzanne.getByRole("button", { name: "Renvoyer l’invitation", exact: true });
      await expect(resend).toBeEnabled();
      await resend.click(); await expect(page.getByRole("status")).toHaveText("Invitation renouvelée.");
      assert.deepEqual(await page.evaluate(() => window.calls), [
        { name: "invite", input: { signupIds: [suzanneExisting.id] } },
        { name: "resend", input: { signupId: suzanneExisting.id } },
      ]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
    });
    await t.test("emails confirmés et anciennes offres terminées ne proposent pas de nouvelle invitation", async () => {
      const confirmed = { ...suzanneExisting, id: "confirmed", contactName: "Personne confirmée", emailConfirmedAt: "2026-10-08T09:00:00Z" };
      const alreadyConfirmedInvite = { ...confirmed, id: "confirmed-invited", contactName: "Invitation déjà confirmée", invitationSentAt: "2026-10-07T18:00:00Z" };
      const expired = { ...suzanneExisting, id: "expired", contactName: "Ancienne offre expirée", compedUntil: "2026-09-30", hasAccess: false };
      const closed = { ...suzanneExisting, id: "closed", contactName: "Ancienne offre résiliée", billingStatus: "cancelled", hasAccess: false };
      const page = await fixture({ canManage: true, signups: [confirmed, alreadyConfirmedInvite, expired, closed] });
      for (const entry of [confirmed, alreadyConfirmedInvite, expired, closed]) {
        await expect(row(page, entry.contactName).getByRole("button", { name: /^(Envoyer|Renvoyer) l’invitation$/ })).toHaveCount(0);
      }
      await expect(row(page, expired.contactName).getByText("La période offerte est terminée. Gérez la durée depuis la supervision des compagnies.", { exact: true })).toBeVisible();
      assert.deepEqual(await page.evaluate(() => window.calls), []);
      await page.close();
    });
    await t.test("invitation groupée : un compte existant non confirmé reste éligible sans confondre création et confirmation", async () => {
      const paidExisting = { ...paid, id: "paid-existing-unconfirmed", contactName: "Compte payant à confirmer", emailConfirmedAt: null };
      const page = await fixture({ canManage: true, signups: [paidExisting, paid] }, {
        invite: [{ result: { ok: true, message: "Invitation du compte existant envoyée." } }],
      });
      await page.getByText("Paiements manuels et envois groupés", { exact: true }).click();
      const group = page.locator("details").filter({ has: page.getByText("Paiements manuels et envois groupés", { exact: true }) });
      await group.getByRole("checkbox", { name: "Sélectionner les inscriptions affichées", exact: true }).check();
      await group.getByRole("button", { name: "Envoyer les invitations éligibles", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Invitation du compte existant envoyée.");
      assert.deepEqual(await page.evaluate(() => window.calls), [{ name: "invite", input: { signupIds: [paidExisting.id] } }]);
      await page.close();
    });
    await t.test("panne réseau : motif conservé et réessai avec les mêmes choix", async () => {
      const page = await fixture({ canManage: true, signups: [signup] }, { grant: [{ reject: true }, { result: { ok: true, message: "Accès offert enregistré." } }] });
      const reason = "Elle travaille avec notre équipe.";
      await note(page).fill(reason); await grant(page).click();
      await expect(page.getByRole("alert")).toContainText("Vos choix sont conservés");
      await expect(note(page)).toHaveValue(reason); await expect(grant(page)).toBeEnabled();
      assert.equal(await page.evaluate(() => window.refreshCount), 0);
      await grant(page).click(); await expect(page.getByRole("status")).toHaveText("Accès offert enregistré.");
      assert.deepEqual(await page.evaluate(() => window.calls), [1, 2].map(() => ({ name: "grant", input: { signupId: signup.id, note: reason } })));
      await page.close();
    });
    await t.test("refus serveur affiché sans annoncer un accès offert", async () => {
      const page = await fixture({ canManage: true, signups: [signup] }, { grant: [{ result: { ok: false, message: "Un paiement Stripe est déjà en cours. Vérifiez la facturation." } }] });
      await note(page).fill("Collaboration"); await grant(page).click();
      await expect(page.getByRole("alert")).toContainText("paiement Stripe est déjà en cours");
      await expect(note(page)).toHaveValue("Collaboration");
      await expect(row(page, signup.contactName).getByText("Offert sans limite", { exact: true })).toHaveCount(0);
      await expect(row(page, signup.contactName).getByRole("button", { name: "Envoyer l’invitation", exact: true })).toHaveCount(0);
      await page.close();
    });
    await t.test("paiement confirmé, abonnement actif, lecture seule, démo et attente : pas de nouvel accès offert", async () => {
      const activeUnconfirmed = { ...paid, id: "active", contactName: "Responsable actif", paymentConfirmedAt: null };
      const paidUnlinked = { ...signup, id: "paid-unlinked", contactName: "Paiement sans compagnie", paymentConfirmedAt: paid.paymentConfirmedAt };
      const page = await fixture({ canManage: true, signups: [paid, activeUnconfirmed, paidUnlinked, waitlist, demo] });
      await expect(page.getByRole("button", { name: "Offrir l’accès", exact: true })).toHaveCount(0);
      for (const person of [waitlist.contactName, demo.contactName]) await expect(row(page, person).getByRole("button")).toHaveCount(0);
      await expect(row(page, paidUnlinked.contactName).getByRole("button", { name: "Envoyer l’invitation", exact: true })).toBeEnabled();
      assert.deepEqual(await page.evaluate(() => window.calls), []); await page.close();
      const readonly = await fixture({ canManage: false, signups });
      await expect(readonly.getByRole("button", { name: /Offrir|invitation|paiement|William/ })).toHaveCount(0);
      await expect(readonly.getByText("Paiements manuels et envois groupés", { exact: true })).toHaveCount(0);
      await readonly.getByRole("textbox", { name: "Rechercher une inscription" }).fill("Suzanne");
      await expect(row(readonly, signup.contactName)).toBeVisible();
      assert.deepEqual(await readonly.evaluate(() => window.calls), []); await readonly.close();
    });
    await t.test("ancien accès offert retiré : le statut actuel prévaut, aucun nouvel octroi ou paiement", async () => {
      const page = await fixture({ canManage: true, signups: [historicalGrant] });
      const historicalRow = row(page, historicalGrant.contactName);
      await expect(page.getByLabel("Suivi des inscriptions")).toHaveText("1 inscriptions0 accès ouverts0 accès offerts1 accès à activer");
      await expect(historicalRow.getByText("Offert sans limite", { exact: true })).toHaveCount(0);
      await expect(historicalRow.getByText("Accès à activer", { exact: true })).toBeVisible();
      await expect(historicalRow.getByText("Un accès offert a déjà été accordé. Le statut actuel se gère depuis la supervision des compagnies.", { exact: true })).toBeVisible();
      await expect(historicalRow.getByRole("button", { name: "Offrir l’accès", exact: true })).toHaveCount(0);
      await historicalRow.locator("summary").click();
      await expect(historicalRow.getByRole("button", { name: "Confirmer le paiement", exact: true })).toHaveCount(0);
      await page.getByText("Paiements manuels et envois groupés", { exact: true }).click();
      await expect(page.getByRole("checkbox")).toHaveCount(0);
      await page.getByRole("combobox", { name: "Filtrer les accès" }).selectOption("offered");
      await expect(page.getByRole("article")).toHaveCount(0);
      await expect(page.getByText("Aucune inscription ne correspond à ce filtre.", { exact: true })).toBeVisible();
      assert.deepEqual(await page.evaluate(() => window.calls), []); await page.close();
    });
    await t.test("les dates de connexion exigent leurs propres droits, indépendamment de la gestion", async () => {
      const restricted = await fixture({ canManage: true, canViewAccess: false, signups: [paid, signup] });
      await expect(row(restricted, paid.contactName).getByText("Connexions non visibles avec vos droits", { exact: true })).toBeVisible();
      await expect(restricted.getByText(/Dernière connexion :/)).toHaveCount(0);
      await expect(restricted.getByText("Aucune connexion connue", { exact: true })).toHaveCount(0);
      await expect(grant(restricted)).toBeEnabled(); await restricted.close();
      const viewer = await fixture({ canManage: false, canViewAccess: true, signups: [paid] });
      await expect(viewer.getByText("Dernière connexion : 05/10/2026 10:30", { exact: true })).toBeVisible();
      await expect(viewer.getByRole("button", { name: /Offrir|invitation|paiement|William/ })).toHaveCount(0); await viewer.close();
      const defaultRestricted = await fixture({ canManage: false, signups: [paid] });
      await expect(defaultRestricted.getByText("Connexions non visibles avec vos droits", { exact: true })).toBeVisible();
      await expect(defaultRestricted.getByText(/Dernière connexion :/)).toHaveCount(0); await defaultRestricted.close();
    });
    await t.test("sélection mixte : paiement après aperçu pour les impayés seuls, invitations pour les payés éligibles", async () => {
      const paidUnlinked = { ...signup, id: "paid-unlinked", contactName: "Paiement sans compagnie", email: "paye@example.test", paymentConfirmedAt: paid.paymentConfirmedAt };
      const alreadyInvited = { ...paidUnlinked, id: "already-invited", contactName: "Personne déjà invitée", email: "invite@example.test", invitationSentAt: "2026-10-05T08:00:00Z" };
      const page = await fixture({ canManage: true, signups: [signup, paidUnlinked, paid, alreadyInvited, offeredPending, offeredOpen, historicalGrant, waitlist, demo] }, {
        "send-payment": [{ result: { ok: true, message: "Paiement envoyé aux inscriptions impayées." } }],
        "mark-payment": [{ result: { ok: true, message: "Envois manuels enregistrés." } }],
        invite: [{ result: { ok: true, message: "Invitations éligibles envoyées." } }],
      }, 1280);
      await page.getByText("Paiements manuels et envois groupés", { exact: true }).click();
      const group = page.locator("details").filter({ has: page.getByText("Paiements manuels et envois groupés", { exact: true }) });
      const selectAll = group.getByRole("checkbox", { name: "Sélectionner les inscriptions affichées", exact: true });
      const sendPayment = group.getByRole("button", { name: "Envoyer le paiement", exact: true });
      const preview = group.getByRole("button", { name: "Aperçu final", exact: true });
      await expect(group.getByRole("checkbox")).toHaveCount(5);
      for (const excluded of [offeredPending, offeredOpen, historicalGrant, waitlist, demo]) {
        await expect(group.getByRole("checkbox", { name: `${excluded.contactName} · ${excluded.companyName}`, exact: true })).toHaveCount(0);
      }
      await expect(sendPayment).toBeDisabled(); await expect(preview).toBeDisabled();
      await selectAll.check();
      await expect(group.getByText("4 inscription(s) sélectionnée(s)", { exact: true })).toBeVisible();
      await expect(sendPayment).toBeDisabled(); await preview.click(); await expect(sendPayment).toBeEnabled();
      await expect(group.getByText(/Bonjour Suzanne/)).toContainText(signup.email);
      await group.getByRole("textbox", { name: "Objet", exact: true }).fill("Votre accès @prenom");
      await expect(sendPayment).toBeDisabled(); await preview.click(); await expect(sendPayment).toBeEnabled();
      assert.deepEqual(await page.evaluate(() => window.calls), []);
      await sendPayment.click(); await expect(page.getByRole("status")).toHaveText("Paiement envoyé aux inscriptions impayées.");
      const paymentCall = (await page.evaluate(() => window.calls))[0];
      assert.equal(paymentCall.name, "send-payment"); assert.deepEqual(paymentCall.input.signupIds, [signup.id]); assert.equal(paymentCall.input.subject, "Votre accès @prenom");
      await expect(group.getByText("0 inscription(s) sélectionnée(s)", { exact: true })).toBeVisible();
      await selectAll.check();
      await group.getByRole("button", { name: "Mails déjà envoyés manuellement", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Envois manuels enregistrés.");
      assert.deepEqual((await page.evaluate(() => window.calls))[1], { name: "mark-payment", input: { signupIds: [signup.id] } });
      await selectAll.check();
      await group.getByRole("button", { name: "Envoyer les invitations éligibles", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Invitations éligibles envoyées.");
      assert.deepEqual((await page.evaluate(() => window.calls))[2], { name: "invite", input: { signupIds: [paidUnlinked.id] } });
      assert.equal((await page.evaluate(() => window.calls)).length, 3); await page.close();
    });
    await t.test("comptages indépendants, identité rattachée et filtres ne confondent pas compte et accès", async () => {
      const page = await fixture();
      await expect(page.getByLabel("Suivi des inscriptions")).toHaveText("5 inscriptions2 accès ouverts2 accès offerts3 accès à activer");
      await expect(row(page, paid.contactName).getByText("Compagnie des Éclats · 3 membres", { exact: true })).toBeVisible();
      await expect(row(page, paid.contactName).getByText("Compte existant · email confirmé", { exact: true })).toBeVisible();
      await expect(row(page, signup.contactName).getByText(/espace compagnie à créer/)).toBeVisible();
      await expect(row(page, signup.contactName).getByText("Compte à créer", { exact: true })).toBeVisible();
      await page.getByRole("combobox", { name: "Filtrer les accès" }).selectOption("offered");
      await expect(page.getByRole("article")).toHaveCount(2);
      await expect(row(page, offeredPending.contactName).getByText("Accès à activer", { exact: true })).toBeVisible();
      await expect(row(page, offeredOpen.contactName).getByText("Accès ouvert", { exact: true })).toBeVisible();
      await page.getByRole("combobox", { name: "Filtrer les accès" }).selectOption("pending");
      await expect(page.getByRole("article")).toHaveCount(3);
      await page.getByRole("combobox", { name: "Filtrer les accès" }).selectOption("open");
      await expect(page.getByRole("article")).toHaveCount(2);
      await page.getByRole("combobox", { name: "Filtrer les accès" }).selectOption("error");
      await expect(page.getByRole("article")).toHaveCount(1);
      await expect(row(page, offeredPending.contactName).getByRole("alert")).toHaveText(offeredPending.lastAccessError);
      await page.getByRole("combobox", { name: "Filtrer les accès" }).selectOption("all");
      const search = page.getByRole("textbox", { name: "Rechercher une inscription" });
      for (const identity of ["Julien Martin", paid.email, "ÉCLATS"]) {
        await search.fill(identity); await expect(page.getByRole("article")).toHaveCount(1); await expect(row(page, paid.contactName)).toBeVisible();
      }
      await search.fill("Personne inconnue");
      await expect(page.getByText("Aucune inscription ne correspond à ce filtre.", { exact: true })).toBeVisible();
      await search.fill(""); await expect(page.getByRole("article")).toHaveCount(signups.length);
      await page.close();
    });
    await t.test("erreur de chargement distincte d’une liste vide, reprise explicite", async () => {
      const failed = await fixture({ canManage: true, signups, error: "Chargement indisponible. Actualisez pour réessayer." });
      await expect(failed.getByRole("alert")).toContainText("Chargement indisponible");
      await expect(failed.getByText("Aucune inscription bêta pour le moment.", { exact: true })).toHaveCount(0);
      await expect(failed.getByLabel("Suivi des inscriptions")).toHaveCount(0);
      await expect(failed.getByRole("article")).toHaveCount(0);
      await failed.getByRole("button", { name: "Actualiser", exact: true }).click();
      assert.equal(await failed.evaluate(() => window.refreshCount), 1);
      assert.deepEqual(await failed.evaluate(() => window.calls), []); await failed.close();
      const empty = await fixture({ canManage: true, signups: [] });
      await expect(empty.getByText("Aucune inscription bêta pour le moment.", { exact: true })).toBeVisible();
      await expect(empty.getByRole("alert")).toHaveCount(0);
      await expect(empty.getByLabel("Suivi des inscriptions")).toContainText("0 inscriptions"); await empty.close();
    });
    await t.test("clavier, motifs et dispositions à 390 et 1280 px", async () => {
      for (const width of [390, 1280]) {
        const page = await fixture(undefined, {}, width);
        await page.getByRole("textbox", { name: "Rechercher une inscription" }).focus();
        await page.keyboard.press("Tab"); await expect(page.getByRole("combobox", { name: "Filtrer les accès" })).toBeFocused();
        await page.keyboard.press("Tab"); await expect(note(page)).toBeFocused();
        await note(page).fill("Collaboration avec l’équipe");
        await page.keyboard.press("Tab"); await expect(grant(page)).toBeFocused();
        const details = row(page, signup.contactName).locator("summary");
        await details.focus(); await page.keyboard.press("Enter");
        await expect(row(page, signup.contactName).getByRole("textbox", { name: `Référence de paiement pour ${signup.contactName}`, exact: true })).toBeVisible();
        await page.keyboard.press("Tab");
        await expect(row(page, signup.contactName).getByRole("textbox", { name: `Référence de paiement pour ${signup.contactName}`, exact: true })).toBeFocused();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `tmp/beta-supervision-${width === 390 ? "mobile" : "desktop"}.png`, fullPage: true });
        assert.deepEqual(await page.evaluate(() => window.calls), []); await page.close();
      }
    });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
