import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const { webpack } = require("next/dist/compiled/webpack/webpack");
const root = fileURLToPath(new URL("../../", import.meta.url));
const artifacts = path.join(root, "tmp/resources-reader-ui");
const assetId = "abababab-abab-4bab-8bab-abababababab";
const block = (id, type, properties) => ({ id, type, tone: "plain", ...properties });
const article = {
  id: "page-1", published_at: "2026-10-21T09:00:00Z", updated_at: "2026-10-21T09:00:00Z",
  document: {
    version: 1, title: "Préparer la diffusion de son spectacle", slug: "preparer-sa-diffusion", description: "Un guide pour présenter votre création et préparer vos échanges avec les lieux.", category: "Diffusion", visibility: "public", featured: true, coverAssetId: null,
    blocks: [
      block("presenter", "heading", { text: "Présenter le spectacle", level: 2 }),
      block("introduction", "text", { text: "Rassemblez une présentation claire, quelques visuels et les informations pratiques de votre création.\n\nUn dossier lisible accompagne la rencontre avec le lieu." }),
      block("documents", "heading", { text: "Préparer ses documents", level: 2 }),
      block("document", "file", { assetId, label: "La liste des documents à préparer", description: "Un modèle à télécharger" }),
      block("columns", "columns", { ratio: "wide-left", columns: [[block("contact", "heading", { text: "Contacter les lieux", level: 3 }), block("contact-text", "text", { text: "Présentez votre spectacle et les dates envisagées." })], [block("link", "link", { url: "https://example.test/contact", label: "Consulter la référence" })]] }),
    ],
  },
};
const resources = [article,
  { ...article, id: "page-2", document: { ...article.document, title: "Construire son budget prévisionnel", slug: "budget", description: "Un modèle à télécharger pour préparer ses financements.", category: "Financements", visibility: "members", featured: false } },
  { ...article, id: "page-3", document: { ...article.document, title: "Comprendre le mécénat", slug: "mecenat", description: "Des liens utiles pour votre compagnie.", category: "Mécénat", featured: false } },
];

// Real React components, URL validators and CSS. Local synthetic documents only;
// Next navigation is simulated and every network request is intercepted.
test("ressources : bibliothèque, lecture, accès public, clavier, mobile et contenu sûr", { timeout: 150_000 }, async (suite) => {
  const directory = await mkdtemp(path.join(tmpdir(), "tadiff-resource-reader-"));
  let browser;
  const errors = [];
  try {
    const files = {
      "link.js": "import React from 'react'; export default function Link({prefetch,...props}) { return React.createElement('a', props); }",
      "navigation.js": "export const useRouter=()=>({refresh:()=>window.refreshCount++});",
      "image.js": "import React from 'react'; export default function Image(props) { return React.createElement('img',props); }",
      "entry.jsx": `import React from 'react'; import { createRoot } from 'react-dom/client';
        import { ResourceLibrary } from '@/components/resources/resource-library';
        import { ResourceArticle } from '@/components/resources/resource-article';
        import { ResourceBlocks } from '@/components/resources/resource-blocks';
        import PublicLayout from '@/app/(resource-public)/layout';
        import ResourceError from '@/app/(resource-public)/ressources/error';
        const components={library:ResourceLibrary,article:ResourceArticle,blocks:ResourceBlocks,error:ResourceError};
        const uiRoot=createRoot(document.getElementById('root')); let mount=0;
        window.refreshCount=0; window.resetCount=0;
        window.mountFixture=(fixture)=>{window.fixture=fixture; const children=React.createElement(components[fixture.kind],{...fixture.props,reset:()=>window.resetCount++,key:++mount});uiRoot.render(fixture.layout?React.createElement(PublicLayout,null,children):children);};
        window.mountFixture(window.fixture);`,
      "typescript-loader.cjs": `const ts=require(${JSON.stringify(require.resolve("typescript"))}); module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;};`,
    };
    await Promise.all(Object.entries(files).map(([name, value]) => writeFile(path.join(directory, name), value)));
    await new Promise((resolve, reject) => {
      const compiler = webpack({ mode: "development", devtool: false, target: "web", entry: path.join(directory, "entry.jsx"), output: { path: directory, filename: "bundle.js" },
        resolve: { extensions: [".tsx", ".ts", ".jsx", ".js"], modules: [path.join(root, "node_modules"), "node_modules"], alias: { "next/link$": path.join(directory, "link.js"), "next/navigation$": path.join(directory, "navigation.js"), "next/image$": path.join(directory, "image.js"), "@": root } },
        module: { rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, use: path.join(directory, "typescript-loader.cjs") }] },
      });
      compiler.run((error, stats) => compiler.close(() => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({ all: false, errors: true }))) : resolve()));
    });
    const bundle = await readFile(path.join(directory, "bundle.js"), "utf8");
    const globals = await readFile(path.join(root, "app/globals.css"), "utf8");
    const cssInput = globals.replace(/@import "tailwindcss"(?: source\(none\))?;/, '@import "tailwindcss" source(none); @source "./components/resources"; @source "./components/ui"; @source "./app/(resource-public)";');
    const css = (await postcss([tailwindcss({ base: root })]).process(cssInput, { from: path.join(root, "resources-reader-test.css") })).css;
    await mkdir(artifacts, { recursive: true });
    browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: "chrome" });
    async function open({ kind = "library", props = { resources }, width = 390, layout = false } = {}) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      page.setDefaultTimeout(6000);
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        if (new URL(route.request().url()).pathname === "/icons/tadiff-mark.svg") return route.fulfill({ contentType: "image/svg+xml", body: await readFile(path.join(root, "public/icons/tadiff-mark.svg")) });
        return route.fulfill({ contentType: "text/html; charset=utf-8", body: '<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>' });
      });
      await page.goto("http://127.0.0.1:3194/");
      await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: "body{margin:0;font-family:Arial,sans-serif}#root{max-width:1280px;margin:auto}#root>section,#root>article{padding:24px}" });
      await page.evaluate((fixture) => { window.fixture = fixture; }, { kind, props, layout });
      await page.addScriptTag({ content: bundle });
      await expect(page.locator("#root")).not.toBeEmpty();
      return page;
    }
    async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }

    await suite.test("recherche sans accents, catégories au clavier et retour depuis aucun résultat", async () => {
      const page = await open({ props: { resources, canEdit: true }, width: 1280 });
      await expect(page.getByRole("link", { name: "Gérer les ressources" })).toHaveAttribute("href", "/resources/manage");
      await expect(page.getByText("À la une", { exact: true })).toBeVisible();
      await page.getByRole("searchbox", { name: "Rechercher une ressource" }).fill("mecenat");
      await expect(page.getByRole("heading", { name: "Comprendre le mécénat" })).toBeVisible();
      await expect(page.getByRole("heading", { name: article.document.title })).toHaveCount(0);
      await page.getByRole("searchbox").fill("");
      await page.getByRole("button", { name: "Financements", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "Financements", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("heading", { name: "Construire son budget prévisionnel" })).toBeVisible();
      await page.getByRole("searchbox").fill("inexistant");
      await expect(page.getByRole("heading", { name: /Aucune ressource ne correspond/ })).toBeVisible();
      await page.getByRole("button", { name: "Effacer les filtres" }).click();
      await expect(page.getByRole("searchbox")).toHaveValue("");
      await expect(page.getByRole("status")).toHaveText("3 ressources trouvées");
      await noOverflow(page);
      await page.screenshot({ path: path.join(artifacts, "library-desktop.png"), fullPage: true });
      await page.close();
    });
    await suite.test("index public : aucune page membres, cartes accessibles sur mobile", async () => {
      const page = await open({ props: { resources, publicOnly: true }, layout: true });
      await expect(page.getByRole("heading", { name: "Construire son budget prévisionnel" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Financements", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Gérer les ressources" })).toHaveCount(0);
      await expect(page.getByRole("status")).toHaveText("2 ressources trouvées");
      await expect(page.getByRole("link", { name: /Lire la ressource/ })).toHaveAttribute("href", "/ressources/preparer-sa-diffusion");
      await page.getByRole("button", { name: "Mécénat", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Comprendre le mécénat" })).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: path.join(artifacts, "library-mobile.png"), fullPage: true });
      await page.close();
    });
    await suite.test("vide, panne et reprise conservent des actions explicites", async () => {
      const page = await open({ props: { resources: [], canEdit: true } });
      await expect(page.getByRole("heading", { name: "Les premières ressources arrivent bientôt" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Créer une ressource" })).toHaveAttribute("href", "/resources/manage");
      await page.evaluate(() => window.mountFixture({ kind: "library", props: { resources: [], error: "Diagnostic privé à ne pas exposer" } }));
      await expect(page.getByRole("alert")).toContainText("Le chargement n’a pas abouti");
      await expect(page.getByText("Diagnostic privé à ne pas exposer")).toHaveCount(0);
      await page.getByRole("button", { name: "Réessayer" }).focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => window.refreshCount), 1);
      await page.evaluate(() => window.mountFixture({ kind: "error", props: {} }));
      await page.getByRole("button", { name: "Réessayer" }).click();
      assert.equal(await page.evaluate(() => window.resetCount), 1);
      await page.close();
    });
    await suite.test("lecture mobile : sommaire replié, ancre clavier et téléchargement protégé", async () => {
      const page = await open({ kind: "article", props: { resource: article }, layout: true });
      const summary = page.locator("summary");
      await expect(summary).toBeVisible();
      await expect(page.locator("details")).not.toHaveAttribute("open", "");
      await summary.focus(); await page.keyboard.press("Enter");
      await expect(page.locator("details")).toHaveAttribute("open", "");
      await page.locator("details").getByRole("link", { name: "Préparer ses documents" }).focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#resource-section-documents$/);
      await expect(page.getByRole("link", { name: /Télécharger : La liste/ })).toHaveAttribute("href", `/api/resources/assets/${assetId}?download=1`);
      await expect(page.getByRole("link", { name: /Consulter la référence/ })).toHaveAttribute("rel", "noopener noreferrer");
      await noOverflow(page);
      await page.screenshot({ path: path.join(artifacts, "article-mobile.png"), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(page.locator("aside")).toBeVisible();
      await expect(summary).toBeHidden();
      await noOverflow(page);
      await page.screenshot({ path: path.join(artifacts, "article-desktop.png"), fullPage: true });
      await page.evaluate(() => { document.getElementById("root").style.width = "390px"; });
      await expect(page.locator("aside")).toBeHidden();
      await expect(summary).toBeVisible();
      assert.equal(await page.getByRole("heading", { level: 1 }).evaluate((element) => getComputedStyle(element).fontSize), "30px");
      await page.close();
    });
    await suite.test("huit blocs, texte échappé, liens et vidéos sûrs, aperçu sans navigation", async () => {
      const unsafe = block("unsafe-link", "link", { label: "Lien hostile", url: "javascript:window.compromised=true" });
      const allBlocks = [...article.document.blocks,
        block("unsafe-text", "text", { text: '<img src=x onerror="window.compromised=true">' }), unsafe,
        block("picture", "image", { assetId, alt: "Le plateau en répétition", caption: "Vue de la scène" }),
        block("gallery", "gallery", { images: [{ assetId, alt: "L’équipe", caption: "" }] }),
        block("video", "video", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Présentation du spectacle" }),
        block("bad-video", "video", { url: "https://evil.example.test/embed/12", title: "Vidéo invalide" }),
      ];
      const page = await open({ kind: "blocks", props: { blocks: allBlocks } });
      await expect(page.getByText('<img src=x onerror="window.compromised=true">')).toBeVisible();
      await expect(page.getByRole("button", { name: "Lien hostile" })).toBeDisabled();
      assert.equal(await page.evaluate(() => window.compromised), undefined);
      await expect(page.locator("img")).toHaveCount(2);
      await expect(page.locator("iframe")).toHaveCount(1);
      await expect(page.locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
      await expect(page.locator("iframe")).toHaveAttribute("referrerpolicy", "no-referrer");
      await page.evaluate((blocks) => window.mountFixture({ kind: "blocks", props: { blocks, preview: true } }), allBlocks);
      await expect(page.locator("iframe")).toHaveCount(0);
      await expect(page.getByRole("link")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Télécharger" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Consulter la référence" })).toBeDisabled();
      await noOverflow(page);
      await page.close();
    });
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    // Verify the exact fresh temporary folder before recursive cleanup on Windows.
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^tadiff-resource-reader-/);
    await rm(directory, { recursive: true, force: true });
  }
});
