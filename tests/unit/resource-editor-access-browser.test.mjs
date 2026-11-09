import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const { webpack } = require("next/dist/compiled/webpack/webpack");
const root = fileURLToPath(new URL("../../", import.meta.url));
const artifacts = path.join(root, "tmp/resources-access");
const accounts = [
  { userId: "tony", fullName: "Tony Théâtre", email: "tony@example.test", companyName: "Compagnie des Éclats", isSuperAdmin: false, canEdit: true, grantedAt: "2026-10-21T09:00:00Z" },
  { userId: "suzanne", fullName: "Suzanne André", email: "suzanne.administration.longue-adresse@example.test", companyName: "Compagnie des Créations et des Rencontres", isSuperAdmin: false, canEdit: false, grantedAt: null },
  { userId: "admin", fullName: "Camille Régie", email: "admin@example.test", companyName: "Compagnie du Plateau", isSuperAdmin: true, canEdit: true, grantedAt: null },
];

test("console ressources : onglet réservé au superadmin et liste chargée à la demande", async () => {
  const source = readFileSync(path.join(root, "app/(dashboard)/admin/page.tsx"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  async function render(access, tab) {
    const calls = [];
    const rendered = [];
    const fixtureModule = { exports: {} };
    const component = () => null;
    const moduleRequire = (name) => {
      if (name === "react/jsx-runtime") return require(name);
      if (name === "next/navigation") return { notFound: () => { throw Error("not-found"); } };
      if (name === "@/lib/supabase/admin") return new Proxy({ getPlatformAdminAccess: async () => access }, { get: (target, key) => target[key] ?? (async () => { calls.push(key); return []; }) });
      if (name === "@/lib/resource-editors-server") return { listResourceEditorAccounts: async () => { calls.push("listResourceEditorAccounts"); return { data: accounts, error: null }; } };
      if (name === "@/components/admin/resource-editor-access-manager") return { ResourceEditorAccessManager: (props) => { rendered.push(props); return null; } };
      if (name === "@/lib/admin-supervision-server") return { getAdminCompanySupervision: async () => ({ status: "ready", companies: [] }) };
      if (name === "@/lib/admin-forecast") return { buildRevenueForecast: () => [] };
      if (name === "@/lib/finance") return { formatCurrency: (value) => String(value) };
      return new Proxy({ __esModule: true, default: component }, { get: (target, key) => target[key] ?? component });
    };
    new Function("require", "exports", "module", code)(moduleRequire, fixtureModule.exports, fixtureModule);
    const tree = await fixtureModule.exports.default({ searchParams: Promise.resolve({ tab }) });
    const links = [];
    async function visit(node) {
      if (Array.isArray(node)) { for (const child of node) await visit(child); return; }
      if (!node || typeof node !== "object") return;
      if (node.props?.href) links.push(node.props.href);
      if (typeof node.type === "function") await visit(await node.type(node.props));
      else await visit(node.props?.children);
    }
    await visit(tree);
    return { calls, rendered, links };
  }
  const editorAccess = await render({ isSuperAdmin: true, permissions: [] }, "ressources");
  assert.equal(editorAccess.calls.filter((name) => name === "listResourceEditorAccounts").length, 1);
  assert.deepEqual(editorAccess.rendered[0], { accounts, error: null });
  assert.ok(editorAccess.links.includes("/admin?tab=ressources"));
  const elsewhere = await render({ isSuperAdmin: true, permissions: [] }, "supervision");
  assert.ok(!elsewhere.calls.includes("listResourceEditorAccounts"));
  const delegated = await render({ isSuperAdmin: false, permissions: ["manage_catalogs"] }, "ressources");
  assert.ok(!delegated.calls.includes("listResourceEditorAccounts"));
  assert.ok(!delegated.links.includes("/admin?tab=ressources"));
  assert.deepEqual(delegated.rendered, []);
  await assert.rejects(() => render({ isSuperAdmin: false, permissions: [] }, "ressources"), /not-found/);
});

// Real component, Dialog and project CSS. Only the server action and Next
// navigation boundaries are simulated; no account or remote service is changed.
test("éditeurs de ressources : attribution, retrait, erreurs, recherche et mobile", { timeout: 150_000 }, async (suite) => {
  const directory = await mkdtemp(path.join(tmpdir(), "tadiff-resource-access-"));
  let browser;
  const errors = [];
  try {
    const files = {
      "link.js": "import React from 'react'; export default function Link({prefetch,...props}) { return React.createElement('a',props); }",
      "navigation.js": "export const useRouter=()=>({refresh:()=>window.refreshCount++});",
      "actions.js": `export async function setResourceEditorAccess(userId,canEdit) {
        window.calls.push({userId,canEdit});
        if(window.actionMode==='hold') return await new Promise(resolve=>{window.finishAction=resolve;});
        if(window.actionMode==='network') throw Error('Local network failure');
        if(window.actionMode==='denied') return {ok:false,message:'Vous ne pouvez pas modifier ce droit.'};
        return {ok:true,message:canEdit?'Droit d’édition accordé.':'Droit d’édition retiré.'};
      }`,
      "entry.jsx": `import React from 'react'; import {createRoot} from 'react-dom/client';
        import {ResourceEditorAccessManager} from '@/components/admin/resource-editor-access-manager';
        const uiRoot=createRoot(document.getElementById('root')); window.calls=[];window.refreshCount=0;
        window.renderFixture=(props)=>{window.fixture=props;uiRoot.render(React.createElement(ResourceEditorAccessManager,props));};
        window.renderFixture(window.fixture);`,
      "typescript-loader.cjs": `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;};`,
    };
    await Promise.all(Object.entries(files).map(([name, value]) => writeFile(path.join(directory, name), value)));
    await new Promise((resolve, reject) => {
      const compiler = webpack({ mode: "development", devtool: false, target: "web", entry: path.join(directory, "entry.jsx"), output: { path: directory, filename: "bundle.js" },
        resolve: { extensions: [".tsx", ".ts", ".jsx", ".js"], modules: [path.join(root, "node_modules"), "node_modules"], alias: { "next/link$": path.join(directory, "link.js"), "next/navigation$": path.join(directory, "navigation.js"), "@/app/(dashboard)/admin/resources/access-actions$": path.join(directory, "actions.js"), "@": root } },
        module: { rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, use: path.join(directory, "typescript-loader.cjs") }] },
      });
      compiler.run((error, stats) => compiler.close(() => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({ all: false, errors: true }))) : resolve()));
    });
    const bundle = await readFile(path.join(directory, "bundle.js"), "utf8");
    const globals = await readFile(path.join(root, "app/globals.css"), "utf8");
    const cssInput = globals.replace(/@import "tailwindcss"(?: source\(none\))?;/, '@import "tailwindcss" source(none); @source "./components/admin/resource-editor-access-manager.tsx"; @source "./components/ui";');
    const css = (await postcss([tailwindcss({ base: root })]).process(cssInput, { from: path.join(root, "resources-access-test.css") })).css;
    await mkdir(artifacts, { recursive: true });
    browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: "chrome" });
    async function open({ props = { accounts, error: null }, width = 390 } = {}) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      page.setDefaultTimeout(6000);
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: '<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>' }));
      await page.goto("http://127.0.0.1:3193/");
      await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: "body{margin:0;font-family:Arial,sans-serif}#root{max-width:1184px;margin:24px auto;padding:0 20px}" });
      await page.evaluate((fixture) => { window.fixture = fixture; }, props);
      await page.addScriptTag({ content: bundle });
      await expect(page.getByRole("heading", { name: "Éditeurs de ressources" })).toBeVisible();
      return page;
    }
    function row(page, name) { return page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) }); }
    async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }

    await suite.test("recherche nom, email et compagnie sans accents, filtre au clavier et accès permanent", async () => {
      const page = await open({ width: 1280 });
      await expect(page.getByRole("link", { name: "Ouvrir l’éditeur" })).toHaveAttribute("href", "/resources/manage");
      await expect(row(page, "Camille Régie").getByRole("button")).toHaveCount(0);
      await expect(row(page, "Camille Régie")).toContainText("Accès permanent");
      const search = page.getByRole("searchbox", { name: /Rechercher un compte/ });
      await search.fill("theatre"); await expect(page.getByRole("listitem")).toHaveCount(1); await expect(row(page, "Tony Théâtre")).toBeVisible();
      await search.fill("CREATIONS"); await expect(row(page, "Suzanne André")).toBeVisible();
      await search.fill("tony@example.test"); await expect(row(page, "Tony Théâtre")).toBeVisible();
      await search.fill("");
      await page.getByRole("button", { name: "Éditeurs", exact: true }).focus(); await page.keyboard.press("Enter");
      await expect(page.getByRole("listitem")).toHaveCount(2);
      await expect(row(page, "Suzanne André")).toHaveCount(0);
      await search.fill("inexistant"); await expect(page.getByRole("heading", { name: /Aucun compte ne correspond/ })).toBeVisible();
      await page.getByRole("button", { name: "Effacer les filtres" }).click();
      await expect(page.getByRole("listitem")).toHaveCount(3);
      await noOverflow(page); await page.screenshot({ path: path.join(artifacts, "desktop.png"), fullPage: true });
      await page.close();
    });
    await suite.test("attribution explicite : pas de double envoi ni de mise à jour avant réussite", async () => {
      const page = await open();
      await page.evaluate(() => { window.actionMode = "hold"; });
      await row(page, "Suzanne André").getByRole("button", { name: /Autoriser l’édition/ }).focus(); await page.keyboard.press("Enter");
      await expect(row(page, "Suzanne André").getByRole("button")).toBeDisabled();
      await expect(row(page, "Suzanne André")).toContainText("Sans droit d’édition");
      await page.keyboard.press("Enter");
      assert.deepEqual(await page.evaluate(() => window.calls), [{ userId: "suzanne", canEdit: true }]);
      await page.evaluate(() => window.finishAction({ ok: false, message: "Droit refusé pendant cette vérification locale." }));
      await expect(page.getByRole("alert")).toContainText("Droit refusé");
      await expect(row(page, "Suzanne André")).toContainText("Sans droit d’édition");
      assert.equal(await page.evaluate(() => window.refreshCount), 0);
      await page.evaluate(() => { window.actionMode = "success"; });
      await page.getByRole("button", { name: "Réessayer", exact: true }).click();
      await expect(row(page, "Suzanne André")).toContainText("Éditeur de ressources");
      await expect(row(page, "Suzanne André")).toContainText("Compagnie des Créations et des Rencontres");
      await expect(row(page, "Suzanne André").getByRole("button", { name: /Retirer le droit/ })).toBeVisible();
      assert.equal(await page.evaluate(() => window.refreshCount), 1);
      await noOverflow(page); await page.screenshot({ path: path.join(artifacts, "mobile.png"), fullPage: true });
      await page.evaluate((next) => window.renderFixture({ accounts: next, error: null }), accounts);
      await expect(row(page, "Suzanne André")).toContainText("Sans droit d’édition");
      await page.close();
    });
    await suite.test("retrait confirmé, annulation au clavier, échec réseau puis reprise", async () => {
      const page = await open();
      const remove = row(page, "Tony Théâtre").getByRole("button", { name: /Retirer le droit/ });
      await remove.click();
      const dialog = page.getByRole("dialog", { name: "Retirer le droit d’édition ?" });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("Les pages déjà créées sont conservées");
      assert.deepEqual(await page.evaluate(() => window.calls), []);
      await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(remove).toBeFocused();
      await remove.click();
      await page.evaluate(() => { window.actionMode = "network"; });
      await dialog.getByRole("button", { name: "Retirer le droit d’édition", exact: true }).click();
      await expect(dialog.getByRole("alert")).toContainText("Le droit n’a pas pu être modifié");
      await expect(row(page, "Tony Théâtre")).toContainText("Éditeur de ressources");
      await noOverflow(page); await page.screenshot({ path: path.join(artifacts, "revoke-mobile.png"), fullPage: true });
      await page.evaluate(() => { window.actionMode = "hold"; });
      await dialog.getByRole("button", { name: "Réessayer le retrait" }).click();
      await expect(dialog.getByRole("button", { name: "Annuler" })).toBeDisabled();
      await page.keyboard.press("Escape"); await expect(dialog).toBeVisible();
      await page.evaluate(() => window.finishAction({ ok: true, message: "Droit d’édition retiré." }));
      await expect(dialog).toHaveCount(0);
      await expect(row(page, "Tony Théâtre")).toContainText("Sans droit d’édition");
      await expect(row(page, "Tony Théâtre")).toContainText("Compagnie des Éclats");
      assert.deepEqual(await page.evaluate(() => window.calls), [{ userId: "tony", canEdit: false }, { userId: "tony", canEdit: false }]);
      await page.close();
    });
    await suite.test("filtre Éditeurs : la révocation enlève uniquement le droit et garde le compte", async () => {
      const page = await open({ width: 1280 });
      await page.getByRole("button", { name: "Éditeurs", exact: true }).click();
      await row(page, "Tony Théâtre").getByRole("button", { name: /Retirer le droit/ }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Retirer le droit d’édition", exact: true }).click();
      await expect(row(page, "Tony Théâtre")).toHaveCount(0);
      await expect(page.getByText("Droit d’édition retiré.", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Tous", exact: true }).click();
      await expect(row(page, "Tony Théâtre")).toContainText("Compagnie des Éclats");
      await expect(row(page, "Tony Théâtre").getByRole("button", { name: /Autoriser l’édition/ })).toBeVisible();
      await page.close();
    });
    await suite.test("panne de chargement sans actions sur données périmées et état vide distinct", async () => {
      const page = await open({ props: { accounts, error: "Erreur SQL privée" } });
      await expect(page.getByRole("alert")).toContainText("Les comptes n’ont pas pu être chargés");
      await expect(page.getByRole("listitem")).toHaveCount(0);
      await expect(page.getByText("Erreur SQL privée")).toHaveCount(0);
      await page.getByRole("button", { name: "Réessayer le chargement" }).click();
      assert.equal(await page.evaluate(() => window.refreshCount), 1);
      assert.deepEqual(await page.evaluate(() => window.calls), []);
      await page.evaluate(() => window.renderFixture({ accounts: [], error: null }));
      await expect(page.getByRole("heading", { name: "Aucun compte à afficher" })).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      await page.close();
    });
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^tadiff-resource-access-/);
    await rm(directory, { recursive: true, force: true });
  }
});
