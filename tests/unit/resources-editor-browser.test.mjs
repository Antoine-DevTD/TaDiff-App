import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../", import.meta.url));
const source = (file) => readFileSync(path.join(root, file), "utf8");
const runtime = (name, file) => path.join(path.dirname(require.resolve(`${name}/package.json`)), `cjs/${file}.production.js`);
const overrides = {
  react: runtime("react", "react"), "react/jsx-runtime": runtime("react", "react-jsx-runtime"),
  "react-dom": runtime("react-dom", "react-dom"), "react-dom/client": runtime("react-dom", "react-dom-client"), scheduler: runtime("scheduler", "scheduler"),
};
const stubs = {
  "next/navigation": "exports.useRouter=()=>({push:(url)=>window.navigations.push(url),refresh:()=>window.refreshes++});",
  "next/link": "exports.__esModule=true;exports.default=(props)=>require('react').createElement('a',props);",
  "@/app/(dashboard)/admin/resources/actions": "for(const name of ['saveResourcePage','unpublishResourcePage','getResourceRevisions','restoreResourceRevision','archiveResourcePage','restoreArchivedResourcePage'])exports[name]=(...args)=>window.invoke(name,args);",
};

// Actual React, DnD, Zod and UI modules; only server actions/navigation are doubled.
// All browser requests stay inside this isolated fixture, with no real accounts or storage.
function bundle() {
  const modules = new Map();
  function resolve(name, parent) {
    if (stubs[name]) return name;
    if (overrides[name]) return overrides[name];
    if (name.startsWith("@/") || name.startsWith(".")) {
      const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(parent), name);
      for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}.js`, `${base}.cjs`, path.join(base, "index.js")]) if (existsSync(candidate)) return candidate;
    }
    return require.resolve(name, { paths: [path.dirname(parent), root] });
  }
  function add(id) {
    if (modules.has(id)) return;
    modules.set(id, null);
    let code = stubs[id] || readFileSync(id, "utf8");
    if (/\.tsx?$/.test(id)) code = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    if (id === path.join(root, "components/resources/resource-blocks.tsx")) code += "\nconst actualResourceBlocks=exports.ResourceBlocks;exports.ResourceBlocks=(props)=>{window.resourceContentRenders??={};for(const block of props.blocks)window.resourceContentRenders[block.id]=(window.resourceContentRenders[block.id]||0)+1;return actualResourceBlocks(props);};";
    const deps = {};
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) { deps[match[1]] = resolve(match[1], id); add(deps[match[1]]); }
    modules.set(id, { code, deps });
  }
  const editor = path.join(root, "components/resources/resource-editor.tsx");
  const manager = path.join(root, "components/resources/resource-manager.tsx");
  add(editor); add(manager); add(overrides["react-dom/client"]);
  return `const process={env:{NODE_ENV:'production'}};const modules={${[...modules].map(([name, { code, deps }]) => `${JSON.stringify(name)}:{deps:${JSON.stringify(deps)},run:(module,exports,require)=>{${code}\n}}`).join(",")}};const cache={};function load(id){if(cache[id])return cache[id].exports;const item=modules[id];if(!item)throw Error('Missing module '+id);const module={exports:{}};cache[id]=module;item.run(module,module.exports,(name)=>load(item.deps[name]));return module.exports;}const React=load(${JSON.stringify(overrides.react)});const root=load(${JSON.stringify(overrides["react-dom/client"])}).createRoot(document.getElementById('root'));root.render(React.createElement(window.kind==='manager'?load(${JSON.stringify(manager)}).ResourceManager:load(${JSON.stringify(editor)}).ResourceEditor,window.fixture));`;
}
const id = "33333333-3333-4333-8333-333333333333";
const headingId = "11111111-1111-4111-8111-111111111111";
const textId = "22222222-2222-4222-8222-222222222222";
const assetId = "44444444-4444-4444-8444-444444444444";
const document = { version: 1, title: "Préparer son dossier de diffusion", slug: "preparer-son-dossier", description: "Les repères et documents pour présenter votre spectacle.", category: "Diffusion", visibility: "members", featured: false, coverAssetId: null, blocks: [{ id: headingId, type: "heading", level: 2, text: "Un dossier qui donne envie", tone: "plain" }, { id: textId, type: "text", text: "Rassemblez votre présentation, vos photos et vos informations pratiques.", tone: "plain" }] };
const pageData = { id, draft: document, revision: 3, published_at: null, archived_at: null, updated_at: "2026-10-21T10:00:00Z", created_at: "2026-10-21T09:00:00Z" };
const asset = { id: assetId, page_id: id, name: "dossier-de-diffusion.pdf", mime_type: "application/pdf", size: 1024, storage_path: `${id}/${assetId}.pdf`, created_at: pageData.updated_at };
const css = (await postcss([tailwindcss({ base: root })]).process(`@import "tailwindcss" source(none); @source "./components/resources"; @source "./components/ui"; ${source("app/globals.css").match(/@theme\s*\{[\s\S]*?\}/)[0]} body{margin:0;padding:16px;background:var(--color-background);color:var(--color-foreground);font-family:Arial,sans-serif}#root{max-width:1440px;margin:auto}`, { from: path.join(root, "resources-editor-fixture.css") })).css;
const javascript = bundle();
mkdirSync(path.join(root, "tmp/resources"), { recursive: true });

test("ressources : éditeur réel, publication explicite, historique, médias et mobile", { timeout: 180_000 }, async (suite) => {
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: "chrome" });
  async function fixture({ kind = "editor", width = 1480, page = pageData, assets = [], responses = [], managerPages = [], managerError = null, uploadFailures = 0 } = {}) {
    const tab = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    tab.setDefaultTimeout(6000);
    const errors = [];
    tab.on("pageerror", (error) => errors.push(error.message));
    await tab.route("**/*", (route) => {
      if (route.request().url().endsWith("/api/resources/assets")) {
        if (uploadFailures-- > 0) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, message: "Envoi interrompu. Réessayez avec le même fichier." }) });
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, asset }) });
      }
      return route.fulfill({ contentType: "text/html", body: '<html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>' });
    });
    await tab.goto("http://127.0.0.1:3197/");
    await tab.addStyleTag({ content: css });
    await tab.evaluate(({ kind, page, assets, responses, managerPages, managerError }) => {
      window.kind = kind; window.fixture = kind === "manager" ? { pages: managerPages, error: managerError } : { initialPage: page, initialAssets: assets };
      window.calls = []; window.navigations = []; window.refreshes = 0; window.responses = responses;
      window.invoke = async (name, args) => {
        window.calls.push({ name, args });
        const response = window.responses.shift();
        if (response?.reject) throw Error("Local network failure");
        if (response?.hold) return new Promise((resolve) => window.release = () => resolve(response.result));
        if (response) return response.result;
        if (name === "getResourceRevisions") return { data: [], error: null };
        if (name === "saveResourcePage") return { ok: true, page: { ...page, id: args[0].id, revision: (args[0].expectedRevision || 0) + 1, draft: { ...args[0].document, title: args[0].document.title.trim(), category: args[0].document.category.trim() }, published_at: args[0].publish ? page.updated_at : page.published_at }, message: args[0].publish ? "Page publiée." : "Brouillon enregistré." };
        throw Error(`Unexpected action ${name}`);
      };
    }, { kind, page, assets, responses, managerPages, managerError });
    await tab.addScriptTag({ content: javascript });
    await expect(tab.locator("#root")).not.toBeEmpty();
    return { tab, close: async () => { assert.deepEqual(errors, []); await tab.close(); } };
  }
  try {
    await suite.test("brouillon, visibilité et publication sont des opérations distinctes", async () => {
      const f = await fixture(); const { tab } = f;
      await tab.getByLabel("Titre de la page", { exact: true }).fill("Les outils de la compagnie");
      await tab.getByRole("radio", { name: /Tout le monde/ }).check();
      await expect(tab.getByText("Modifications non enregistrées", { exact: true })).toBeVisible();
      await tab.getByRole("button", { name: "Enregistrer", exact: true }).click();
      assert.equal((await tab.evaluate(() => window.calls))[0].args[0].publish, false);
      assert.equal((await tab.evaluate(() => window.calls))[0].args[0].document.visibility, "public");
      await tab.getByRole("button", { name: "Publier", exact: true }).click();
      await expect(tab.getByRole("dialog")).toContainText("sans connexion");
      assert.equal(await tab.evaluate(() => window.calls.length), 1);
      await tab.getByRole("button", { name: "Publier pour tout le monde", exact: true }).click();
      await expect(tab.getByText("Page publiée.", { exact: true })).toBeVisible();
      const calls = await tab.evaluate(() => window.calls);
      assert.equal(calls[1].args[0].publish, true); assert.equal(calls[1].args[0].expectedRevision, 4);
      await expect(tab.getByText("Une version est publiée")).toBeVisible();
      await tab.screenshot({ path: path.join(root, "tmp/resources/editor-desktop.png"), fullPage: true });
      await f.close();
    });
    await suite.test("réseau et conflit préservent le texte ; nouvel essai sans écrasement forcé", async () => {
      const f = await fixture({ responses: [{ reject: true }, { result: { ok: false, conflict: true, message: "Une autre personne a modifié la page." } }] }); const { tab } = f;
      await tab.getByLabel("Titre de la page", { exact: true }).fill("À conserver même en cas d’erreur");
      await tab.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(tab.getByRole("alert")).toContainText("Vos modifications sont conservées");
      await expect(tab.getByLabel("Titre de la page", { exact: true })).toHaveValue("À conserver même en cas d’erreur");
      await tab.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(tab.getByRole("alert")).toContainText("autre personne");
      await expect(tab.getByRole("button", { name: "Recharger la version enregistrée" })).toBeVisible();
      assert.deepEqual((await tab.evaluate(() => window.calls)).map((call) => call.args[0].expectedRevision), [3, 3]);
      let confirmation = ""; tab.once("dialog", async (dialog) => { confirmation = dialog.message(); await dialog.dismiss(); });
      await tab.getByRole("button", { name: "Toutes les ressources", exact: true }).click();
      assert.match(confirmation, /sans enregistrer/); assert.deepEqual(await tab.evaluate(() => window.navigations), []);
      await f.close();
    });
    await suite.test("ordre au clavier, duplication, suppression annulable et contenu en colonnes", async () => {
      const f = await fixture(); const { tab } = f;
      await tab.getByRole("button", { name: "Monter le bloc 2", exact: true }).focus(); await tab.keyboard.press("Enter");
      assert.equal(await tab.locator("[data-resource-block]").first().getAttribute("data-resource-block"), textId);
      await expect(tab.locator(`[data-resource-block="${headingId}"]`)).toHaveCSS("transform", "none");
      const handle = tab.getByRole("button", { name: "Déplacer le bloc Titre 2", exact: true });
      await handle.focus(); await tab.keyboard.press("Space");
      await expect(handle).toHaveAttribute("aria-pressed", "true");
      // DnD installs its keyboard listener after the activation event and measures on a frame.
      await tab.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await tab.keyboard.press("ArrowUp");
      await expect(tab.locator(`[data-resource-block="${headingId}"]`)).toHaveCSS("transform", /matrix\(1, 0, 0, [\d.]+, 0, -/);
      await tab.keyboard.press("Space");
      await expect.poll(() => tab.locator("[data-resource-block]").first().getAttribute("data-resource-block")).toBe(headingId);
      await tab.getByRole("button", { name: "Dupliquer le bloc 1", exact: true }).click();
      assert.equal(await tab.locator("[data-resource-block]").count(), 3);
      await tab.getByRole("button", { name: "Supprimer le bloc 2", exact: true }).click();
      assert.equal(await tab.locator("[data-resource-block]").count(), 2);
      await tab.getByRole("button", { name: "Annuler la suppression" }).click();
      assert.equal(await tab.locator("[data-resource-block]").count(), 3);
      await tab.getByRole("button", { name: "2 colonnes", exact: true }).click();
      await tab.getByRole("button", { name: "Ajouter dans cette colonne", exact: true }).first().click();
      await tab.getByRole("button", { name: "Texte", exact: true }).first().click();
      await tab.getByLabel("Texte", { exact: true }).fill("Le contenu dans la première colonne");
      await tab.getByRole("button", { name: "Enregistrer", exact: true }).click();
      const doc = (await tab.evaluate(() => window.calls)).at(-1).args[0].document;
      assert.equal(doc.blocks.at(-1).type, "columns"); assert.equal(doc.blocks.at(-1).columns[0][0].text, "Le contenu dans la première colonne");
      const ids = doc.blocks.map((block) => block.id); assert.equal(new Set(ids).size, ids.length);
      await f.close();
    });
    await suite.test("enregistrement en cours verrouillé ; retrait conserve les changements non enregistrés", async () => {
      const published = { ...pageData, published_at: pageData.updated_at };
      const saved = { ...published, revision: 4, draft: { ...document, title: "Version enregistrée" } };
      const f = await fixture({ page: published, responses: [{ hold: true, result: { ok: true, page: saved, message: "Brouillon enregistré." } }, { result: { ok: true, page: { ...saved, revision: 5, published_at: null }, message: "Page retirée." } }] }); const { tab } = f;
      await tab.getByLabel("Titre de la page", { exact: true }).fill("Version enregistrée");
      await tab.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(tab.getByLabel("Titre de la page", { exact: true })).toBeDisabled();
      await expect(tab.getByRole("button", { name: "En cours…", exact: true })).toBeDisabled();
      assert.equal(await tab.evaluate(() => window.calls.length), 1);
      await tab.evaluate(() => window.release());
      await expect(tab.getByLabel("Titre de la page", { exact: true })).toBeEnabled();
      await tab.getByLabel("Titre de la page", { exact: true }).fill("Nouveau texte encore local");
      await tab.getByRole("button", { name: "Retirer la page publiée", exact: true }).click();
      await tab.getByRole("button", { name: "Retirer la page", exact: true }).click();
      await expect(tab.getByText("Page retirée.", { exact: true })).toBeVisible();
      await expect(tab.getByLabel("Titre de la page", { exact: true })).toHaveValue("Nouveau texte encore local");
      await expect(tab.getByText("Modifications non enregistrées", { exact: true })).toBeVisible();
      assert.deepEqual((await tab.evaluate(() => window.calls))[1], { name: "unpublishResourcePage", args: [id, 4] });
      await f.close();
    });
    await suite.test("média : enregistrer avant envoi, fichier joint puis aperçu mobile sans débordement", async () => {
      const f = await fixture({ width: 390, uploadFailures: 1 }); const { tab } = f;
      await tab.getByLabel("Titre de la page", { exact: true }).fill("  Titre à normaliser  ");
      await tab.getByRole("button", { name: "Document", exact: true }).click();
      await tab.getByRole("button", { name: "Choisir un fichier", exact: true }).click();
      await tab.getByLabel("Fichier à ajouter", { exact: true }).setInputFiles({ name: "dossier.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 test fixture") });
      await expect(tab.getByRole("dialog").getByRole("alert")).toContainText("Envoi interrompu");
      await tab.getByLabel("Fichier à ajouter", { exact: true }).setInputFiles({ name: "dossier.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 test fixture") });
      await expect(tab.getByRole("dialog")).toHaveCount(0);
      await expect(tab.getByText("Fichier ajouté.", { exact: false })).toBeVisible();
      assert.equal((await tab.evaluate(() => window.calls))[0].args[0].document.blocks.at(-1).assetId, null);
      await tab.getByRole("button", { name: "Enregistrer", exact: true }).click();
      assert.equal((await tab.evaluate(() => window.calls)).at(-1).args[0].document.blocks.at(-1).assetId, assetId);
      assert.equal((await tab.evaluate(() => window.calls)).at(-1).args[0].document.title, "Titre à normaliser");
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await tab.screenshot({ path: path.join(root, "tmp/resources/editor-mobile.png"), fullPage: true });
      await tab.getByRole("button", { name: "Aperçu", exact: true }).click();
      await tab.getByRole("button", { name: "Téléphone", exact: true }).click();
      await expect(tab.getByRole("dialog")).toContainText("réservé aux membres");
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await tab.keyboard.press("Escape"); await expect(tab.getByRole("dialog")).toHaveCount(0);
      await f.close();
    });
    await suite.test("historique restaure le brouillon après confirmation explicite", async () => {
      const old = { ...document, title: "Première version" };
      const f = await fixture({ responses: [{ result: { data: [{ id: headingId, page_id: id, revision: 1, document: old, created_at: pageData.created_at }], error: null } }, { result: { ok: true, page: { ...pageData, revision: 4, draft: old }, message: "Brouillon restauré." } }] }); const { tab } = f;
      await tab.getByLabel("Titre de la page", { exact: true }).fill("Modification locale");
      await tab.getByRole("button", { name: "Historique", exact: true }).click();
      await tab.getByRole("button", { name: "Restaurer", exact: true }).click();
      await expect(tab.getByText("Vos modifications non enregistrées seront remplacées par cette version.")).toBeVisible();
      assert.equal(await tab.evaluate(() => window.calls.length), 1);
      await tab.getByRole("button", { name: "Confirmer la restauration", exact: true }).click();
      await expect(tab.getByLabel("Titre de la page", { exact: true })).toHaveValue("Première version");
      assert.deepEqual((await tab.evaluate(() => window.calls))[1], { name: "restoreResourceRevision", args: [id, headingId, 3] });
      await f.close();
    });
    await suite.test("gestion : vide, recherche sans accents et création d’un brouillon unique", async () => {
      const failed = await fixture({ kind: "manager", width: 390, managerError: "Connexion indisponible." });
      await expect(failed.tab.getByRole("button", { name: "Créer une page", exact: true })).toBeDisabled();
      await expect(failed.tab.getByText("Votre première ressource commence ici")).toHaveCount(0);
      await expect(failed.tab.getByRole("alert")).toContainText("Connexion indisponible.");
      await failed.tab.getByRole("button", { name: "Réessayer le chargement", exact: true }).click();
      await expect.poll(() => failed.tab.evaluate(() => window.refreshes)).toBe(1);
      await failed.close();
      const f = await fixture({ kind: "manager", width: 390 }); const { tab } = f;
      await expect(tab.getByText("Votre première ressource commence ici")).toBeVisible();
      await tab.getByRole("button", { name: "Créer une page", exact: true }).click();
      await expect.poll(() => tab.evaluate(() => window.navigations.length)).toBe(1);
      const call = (await tab.evaluate(() => window.calls))[0];
      assert.equal(call.args[0].expectedRevision, null); assert.equal(call.args[0].document.visibility, "members");
      assert.match(call.args[0].document.slug, /^nouvelle-ressource-[a-f0-9]{8}$/);
      assert.match((await tab.evaluate(() => window.navigations))[0], /^\/resources\/manage\//);
      await f.close();
      const g = await fixture({ kind: "manager", managerPages: [pageData] });
      await g.tab.getByLabel("Rechercher une page", { exact: true }).fill("preparer");
      await expect(g.tab.getByRole("link", { name: "Modifier la page" })).toBeVisible();
      await g.tab.getByLabel("Rechercher une page", { exact: true }).fill("introuvable");
      await expect(g.tab.getByText("Aucune page ne correspond")).toBeVisible();
      await g.close();
    });
    await suite.test("archives : confirmation, erreur, attente verrouillée, restauration en brouillon", async () => {
      const active = { ...pageData, published_at: pageData.updated_at };
      const archived = { ...active, revision: 4, archived_at: pageData.updated_at, published_at: null };
      const restored = { ...archived, revision: 5, archived_at: null };
      const f = await fixture({ kind: "manager", width: 390, managerPages: [active], responses: [{ result: { ok: false, message: "La page reste publiée. Réessayez." } }, { hold: true, result: { ok: true, page: archived, message: "Page archivée." } }, { reject: true }, { result: { ok: true, page: restored, message: "Page restaurée en brouillon." } }] }); const { tab } = f;
      await tab.getByLabel("Filtrer les pages", { exact: true }).selectOption("published");
      await expect(tab.getByRole("link", { name: "Modifier la page" })).toHaveAttribute("href", `/resources/manage/${id}`);
      await tab.getByRole("button", { name: `Archiver ${document.title}`, exact: true }).click();
      assert.equal(await tab.evaluate(() => window.calls.length), 0);
      await tab.getByRole("button", { name: "Archiver la page", exact: true }).click();
      await expect(tab.getByRole("dialog").getByRole("alert")).toContainText("reste publiée");
      await tab.getByRole("button", { name: "Archiver la page", exact: true }).click();
      await expect(tab.getByRole("button", { name: "Archivage…", exact: true })).toBeDisabled();
      await tab.evaluate(() => window.release());
      await expect(tab.getByRole("dialog")).toHaveCount(0);
      await expect(tab.getByRole("link", { name: "Modifier la page" })).toHaveCount(0);
      await tab.getByRole("button", { name: "Voir les archives", exact: true }).click();
      await expect(tab.getByText("Archivée", { exact: true })).toBeVisible();
      await expect(tab.getByRole("link", { name: "Modifier la page" })).toHaveCount(0);
      await tab.getByRole("button", { name: "Restaurer la page", exact: true }).click();
      await expect(tab.getByRole("alert")).toContainText("reste dans les archives");
      await expect(tab.getByText("Archivée", { exact: true })).toBeVisible();
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await tab.screenshot({ path: path.join(root, "tmp/resources/manager-archives-mobile.png"), fullPage: true });
      await tab.getByRole("button", { name: "Restaurer la page", exact: true }).click();
      await expect(tab.getByRole("link", { name: "Ouvrir la page restaurée", exact: true })).toHaveAttribute("href", `/resources/manage/${id}`);
      assert.deepEqual((await tab.evaluate(() => window.calls)).map((call) => [call.name, call.args[1]]), [["archiveResourcePage", 3], ["archiveResourcePage", 3], ["restoreArchivedResourcePage", 4], ["restoreArchivedResourcePage", 4]]);
      await tab.getByLabel("Filtrer les pages", { exact: true }).selectOption("draft");
      await expect(tab.getByRole("link", { name: "Modifier la page" })).toBeVisible();
      await f.close();
      const locked = await fixture({ page: archived });
      await expect(locked.tab.getByText("Cette page est archivée", { exact: true })).toBeVisible();
      await expect(locked.tab.getByRole("button", { name: "Enregistrer", exact: true })).toHaveCount(0);
      await locked.close();
    });
    for (const width of [390, 1280]) await suite.test(`raccourcis et barre visible pendant la saisie à ${width}px`, async () => {
      const f = await fixture({ width }); const { tab } = f;
      await tab.getByLabel("Titre de la page", { exact: true }).fill("Enregistré au clavier");
      await tab.keyboard.press("Control+s");
      await expect.poll(() => tab.evaluate(() => window.calls.length)).toBe(1);
      assert.equal((await tab.evaluate(() => window.calls))[0].args[0].publish, false);
      await expect(tab.getByText("Brouillon enregistré", { exact: true })).toBeVisible();
      await tab.getByLabel("Titre de la page", { exact: true }).fill("Deuxième raccourci");
      await tab.keyboard.press("Meta+s");
      await expect.poll(() => tab.evaluate(() => window.calls.length)).toBe(2);
      await tab.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(tab.getByRole("button", { name: "Enregistrer", exact: true })).toBeVisible();
      assert.ok((await tab.locator("[data-editor-toolbar]").boundingBox()).y >= -1);
      if (width === 390) {
        await tab.getByRole("button", { name: "Voir la page", exact: true }).click();
        await expect(tab.getByRole("region", { name: "Composition de la page", exact: true })).toBeFocused();
        await tab.getByRole("button", { name: "Réglages", exact: true }).click();
        await expect(tab.getByLabel("Titre de la page", { exact: true })).toBeFocused();
      }
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await tab.screenshot({ path: path.join(root, `tmp/resources/editor-polish-scrolled-${width}.png`) });
      await tab.evaluate(() => window.scrollTo(0, 0));
      await tab.screenshot({ path: path.join(root, `tmp/resources/editor-polish-${width}.png`), fullPage: true });
      await f.close();
    });
    await suite.test("80 blocs : une frappe ne redessine que le contenu modifié", async () => {
      const blocks = Array.from({ length: 80 }, (_, index) => ({ id: `${index.toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`, type: "text", text: `Conseil ${index + 1}. ${"Préparez les informations utiles à votre compagnie. ".repeat(8)}`, tone: "plain" }));
      const f = await fixture({ width: 1280, page: { ...pageData, draft: { ...document, blocks } } }); const { tab } = f;
      await tab.getByRole("button", { name: "Modifier le bloc Texte 1", exact: true }).click();
      await expect(tab.getByLabel("Texte", { exact: true })).toBeFocused();
      await tab.evaluate(() => window.resourceContentRenders = {});
      const started = performance.now();
      await tab.getByLabel("Texte", { exact: true }).fill("Ce conseil vient d’être complété.");
      await expect(tab.locator(`[data-resource-block="${blocks[0].id}"]`).getByText("Ce conseil vient d’être complété.", { exact: true })).toBeVisible();
      const renders = await tab.evaluate(() => window.resourceContentRenders);
      assert.deepEqual(Object.keys(renders), [blocks[0].id]);
      assert.equal(renders[blocks[0].id], 1);
      console.log(`80 blocs : ${Object.values(renders).reduce((sum, value) => sum + value, 0)} contenu redessiné ; interaction locale ${Math.round(performance.now() - started)} ms (inclut Playwright).`);
      await f.close();
    });
  } finally { await browser.close(); }
});
