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
const member = { userId: "suzanne", fullName: "Suzanne Théâtre", email: "suzanne.longue-adresse@example.test", role: "readonly", createdAt: "2026-10-04T10:00:00Z", lastLogin: "2026-10-05T08:30:00Z", lastActivity: "2026-10-05T08:35:00Z" };
const company = { id: "one", name: "Compagnie des Éclats", billingStatus: "comped", planCode: "beta", compedUntil: null, billingNotes: "", createdAt: member.createdAt, ownerName: "Suzanne", ownerEmail: member.email, memberCount: 2, showCount: 1, contactCount: 2, dealCount: 0, lastActivity: null, hasAccess: true, members: [member, { ...member, userId: "camille", fullName: "Camille", email: "camille@example.test", role: "owner", lastLogin: null, lastActivity: null }] };
const snapshot = { status: "ready", canViewAccess: true, loadedAt: "2026-10-05T09:00:00Z", companies: [company, { ...company, id: "two", name: "Compagnie en attente", billingStatus: "pending_payment", hasAccess: false, memberCount: 0, members: [] }] };

function bundle() {
  const modules = {
    react: runtime("react", "react"), "react/jsx-runtime": runtime("react", "react-jsx-runtime"), "react-dom": runtime("react-dom", "react-dom"), "react-dom/client": runtime("react-dom", "react-dom-client"), scheduler: runtime("scheduler", "scheduler"),
    "next/link": "exports.__esModule=true;exports.default=(props)=>require('react').createElement('a',props);",
    "next/navigation": "exports.useRouter=()=>({refresh:()=>window.refreshCount++});",
    "lucide-react": "for(const name of ['ChevronDown','RefreshCw','Search'])exports[name]=(props)=>require('react').createElement('svg',props);",
    "@/lib/utils": "exports.cn=(...values)=>values.filter(Boolean).join(' ');",
    "react-hook-form": readFileSync(require.resolve("react-hook-form"), "utf8"),
    "@hookform/resolvers/zod": "exports.zodResolver=()=>async(values)=>({values,errors:{}});",
    "@/lib/validation/admin": "exports.billingStatuses=['pending_payment','trial','active','comped','past_due','cancelled'];exports.adminBillingSchema={};",
    "@/app/(dashboard)/admin/actions": "exports.adminUpdateCompanyBilling=(...values)=>window.saveBilling(...values);",
    "@/components/ui/button": compile("components/ui/button.tsx"), "@/components/ui/input": compile("components/ui/input.tsx"), "@/components/ui/select": compile("components/ui/select.tsx"), "@/components/ui/badge": compile("components/ui/badge.tsx"),
    "@/components/admin/company-billing-form": compile("components/admin/company-billing-form.tsx"),
    "@/lib/admin-supervision": compile("lib/admin-supervision.ts"), component: compile("components/admin/company-supervision.tsx"),
  };
  return `const modules={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:(module,exports,require)=>{${code}\n}`).join(",")}};const cache={};function require(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;modules[name](module,module.exports,require);return module.exports;}const React=require('react');const root=require('react-dom/client').createRoot(document.getElementById('root'));window.renderSnapshot=(snapshot)=>root.render(React.createElement(require('component').CompanySupervision,{snapshot}));window.renderSnapshot(window.fixture);`;
}

// Real UI/CSS with local read snapshots only. No database, email or paid service.
test("supervision companies and members: search, expansion, permissions, empty/error, keyboard and mobile", { timeout: 90_000 }, async (t) => {
  const theme = source("app/globals.css").match(/@theme\s*\{[\s\S]*?\}/)[0];
  const css = (await postcss([tailwindcss({ base: process.cwd() })]).process(`@import "tailwindcss" source(none); @source "./components/admin/company-supervision.tsx"; @source "./components/ui"; ${theme} body{margin:0;padding:16px;background:#e8eef7;color:#0f172a;font-family:sans-serif} #root{max-width:1180px;margin:auto}`, { from: path.join(process.cwd(), "admin-supervision-test.css") })).css;
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: "chrome" });
  const errors = [];
  await mkdir("tmp", { recursive: true });
  async function fixture(data = snapshot, width = 390, canManageBilling = false) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.setDefaultTimeout(5000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: '<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>' }));
    await page.goto("http://127.0.0.1:3196/");
    await page.addStyleTag({ content: css });
    await page.evaluate(({ data, canManageBilling }) => {
      window.fixture = data; window.refreshCount = 0; window.billingCalls = []; window.billingResponses = [];
      window.canManageBilling = canManageBilling;
      window.saveBilling = async (...values) => { window.billingCalls.push(values); const result = window.billingResponses.shift(); if (!result) throw Error("No local response"); if (result.reject) throw Error("Local network error"); return result; };
    }, { data, canManageBilling });
    await page.addScriptTag({ content: bundle().replace("{snapshot}));", "{snapshot,canManageBilling:window.canManageBilling}));") });
    await expect(page.getByRole("heading", { name: "Compagnies et membres" })).toBeVisible();
    return page;
  }
  try {
    await t.test("search by member/email without accents opens actual membership; all roles remain visible", async () => {
      const page = await fixture();
      await page.getByRole("textbox", { name: "Rechercher une compagnie ou un membre" }).fill("suzanne");
      await expect(page.getByText("Compagnie des Éclats", { exact: true })).toBeVisible();
      await expect(page.getByText("Compagnie en attente", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Suzanne Théâtre", { exact: true })).toBeVisible();
      await expect(page.getByText("Camille", { exact: true })).toBeVisible();
      await expect(page.getByText("Lecture seule", { exact: true })).toBeVisible();
      await expect(page.getByText("Responsable", { exact: true })).toBeVisible();
      await expect(page.getByText("05/10/2026 10:30", { exact: true })).toBeVisible();
      await page.getByRole("textbox").fill("theatre"); await expect(page.getByText("Suzanne Théâtre", { exact: true })).toBeVisible();
      await page.getByRole("textbox").fill(member.email); await expect(page.getByText("Suzanne Théâtre", { exact: true })).toBeVisible();
      await page.close();
    });
    await t.test("access filter, empty criteria recovery and explicit refresh", async () => {
      const page = await fixture();
      await page.getByLabel("Filtrer les accès").selectOption("closed");
      await expect(page.getByText("Compagnie en attente", { exact: true })).toBeVisible();
      await expect(page.getByText("En attente de paiement", { exact: true })).toBeVisible();
      await expect(page.getByText("Compagnie des Éclats", { exact: true })).toHaveCount(0);
      await page.getByRole("textbox").fill("missing");
      await expect(page.getByText("Aucune compagnie ne correspond à ces critères.")).toBeVisible();
      await page.getByRole("button", { name: "Effacer les filtres" }).click();
      await expect(page.getByText("Compagnie des Éclats", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Actualiser", exact: true }).click();
      assert.equal(await page.evaluate(() => window.refreshCount), 1);
      await page.close();
    });
    await t.test("permission to see companies does not expose member activity without view_access", async () => {
      const page = await fixture({ ...snapshot, canViewAccess: false });
      await page.getByRole("button", { name: /Compagnie des Éclats/ }).click();
      await expect(page.getByText("Suzanne Théâtre", { exact: true })).toBeVisible();
      await expect(page.getByText("Dernière connexion", { exact: true })).toHaveCount(0);
      await expect(page.getByText("05/10/2026 10:30", { exact: true })).toHaveCount(0);
      await expect(page.getByText(/Le droit de consulter les connexions est nécessaire/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Accès et facturation", exact: true })).toHaveCount(0);
      await page.close();
    });
    await t.test("billing controls preserve real form action, company attribution, error retry and refreshed values", async () => {
      const page = await fixture(snapshot, 390, true);
      await page.getByRole("button", { name: /Compagnie des Éclats/ }).click();
      const open = page.getByRole("button", { name: "Accès et facturation", exact: true });
      await open.focus(); await page.keyboard.press("Enter");
      await expect(page.getByRole("form", { name: "Accès et facturation de Compagnie des Éclats" })).toBeVisible();
      await page.getByLabel("Offre", { exact: true }).fill("offre-partenaire");
      await page.getByLabel("Note interne", { exact: true }).fill("Travaille avec notre équipe");
      await page.evaluate(() => window.billingResponses.push({ reject: true }, { ok: true, message: "Accès enregistré." }));
      await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(page.getByRole("alert")).toHaveText(/votre saisie est conservée/);
      await expect(page.getByLabel("Offre", { exact: true })).toHaveValue("offre-partenaire");
      await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: "Accès enregistré." })).toBeVisible();
      const calls = await page.evaluate(() => window.billingCalls);
      assert.equal(calls.length, 2); assert.equal(calls[1][0], company.id);
      assert.equal(calls[1][1].billingStatus, "comped"); assert.equal(calls[1][1].planCode, "offre-partenaire");
      assert.equal(calls[1][1].billingNotes, "Travaille avec notre équipe");
      assert.equal(await page.evaluate(() => window.refreshCount), 1);
      await page.evaluate((data) => window.renderSnapshot(data), { ...snapshot, companies: [{ ...company, planCode: "offre-partenaire", billingNotes: "Travaille avec notre équipe" }] });
      await page.getByRole("button", { name: "Accès et facturation", exact: true }).click();
      await expect(page.getByLabel("Offre", { exact: true })).toHaveValue("offre-partenaire");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
    });
    await t.test("empty companies versus failed collection stay distinct", async () => {
      const empty = await fixture({ ...snapshot, companies: [] });
      await expect(empty.getByText(/Aucun espace compagnie n’a encore été créé/)).toBeVisible();
      await expect(empty.getByRole("textbox")).toHaveCount(0); await empty.close();
      const error = await fixture({ status: "error", message: "Chargement incomplet. Actualisez pour réessayer." });
      await expect(error.getByRole("alert")).toHaveText("Chargement incomplet. Actualisez pour réessayer.");
      await expect(error.getByText("0 compagnies", { exact: false })).toHaveCount(0);
      await error.getByRole("button", { name: "Actualiser" }).click(); assert.equal(await error.evaluate(() => window.refreshCount), 1);
      await error.close();
    });
    await t.test("keyboard disclosure, zero-member company and mobile/desktop layout", async () => {
      for (const width of [390, 1440]) {
        const page = await fixture(snapshot, width);
        const search = page.getByRole("textbox"); await search.focus(); await page.keyboard.press("Tab");
        await expect(page.getByLabel("Filtrer les accès")).toBeFocused(); await page.keyboard.press("Tab");
        const toggle = page.getByRole("button", { name: /Compagnie des Éclats/ }); await expect(toggle).toBeFocused();
        await page.keyboard.press("Enter"); await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(page.getByText("Suzanne Théâtre", { exact: true })).toBeVisible();
        await page.keyboard.press("Enter"); await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(page.getByText("Suzanne Théâtre", { exact: true })).toHaveCount(0);
        await page.getByRole("button", { name: /Compagnie en attente/ }).click();
        await expect(page.getByText("Aucun membre rattaché à cette compagnie.")).toBeVisible();
        await toggle.click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `tmp/admin-supervision-${width === 390 ? "mobile" : "desktop"}.png`, fullPage: true });
        await page.close();
      }
    });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
