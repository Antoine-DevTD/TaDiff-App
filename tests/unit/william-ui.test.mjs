import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const { webpack } = require("next/dist/compiled/webpack/webpack");
const root = process.cwd();

// Render the real client component, replacing only its framework/server boundary.
// No environment file, authentication, remote database or AI provider is used.
test("William : question libre, accès explicite, clavier mobile et reprise après erreur", { timeout: 120_000 }, async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), "tadiff-william-ui-"));
  let browser;
  try {
    const stubs = {
      "navigation.js": `export const usePathname = () => '/dashboard'; export const useSearchParams = () => new URLSearchParams();`,
      "link.js": `import React from 'react'; export default function Link(props) { return React.createElement('a', props); }`,
      "image.js": `import React from 'react'; export default function Image(props) { return React.createElement('img', props); }`,
      "dynamic.js": `import React from 'react'; export default function dynamic() { return ({children}) => React.createElement('div', null, children); }`,
      "actions.js": `
        export async function loadWilliamChatAction() {
          window.calls.load++;
          if (window.failLoad) throw new Error('Network interrupted');
          return { ok: true, conversation: { sessionId: null, messages: [] } };
        }
        export async function sendWilliamChatMessageAction(input) {
          window.calls.send.push(input);
          if (window.failSend) throw new Error('Network interrupted');
          if (window.sendError) return { ok: false, message: window.sendError };
          return { ok: true, sessionId: 'chat-fixture', answer: {
            messageId: 'answer-' + window.calls.send.length,
            text: 'Préparez les disponibilités de votre équipe avant de confirmer la répétition.',
            remainingTokens: 1000, sources: [], suggestedQuestions: ['Comment recueillir les disponibilités ?'],
          } };
        }
        export async function startNewWilliamChatAction() {
          window.calls.reset++;
          if (window.failReset) throw new Error('Network interrupted');
          return { ok: true };
        }
      `,
      "entry.jsx": `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { WilliamBubble } from '${path.join(root, "components/william/william-bubble.tsx").replaceAll("\\", "/")}';
        window.calls = { load: 0, send: [], reset: 0 };
        createRoot(document.getElementById('root')).render(React.createElement(WilliamBubble, {
          aiEnabled: window.fixtureEnabled,
          unavailableReason: window.fixtureReason,
          tips: [{ id: 'tip', tone: 'warning', title: 'Préparer la répétition', detail: 'Confirmer les disponibilités', href: '/calendar' }],
        }));
      `,
      "typescript-loader.cjs": `const ts = require(${JSON.stringify(require.resolve("typescript"))}); module.exports = function(source) { return ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText; };`,
    };
    await Promise.all(Object.entries(stubs).map(([name, contents]) => writeFile(path.join(directory, name), contents)));
    const alias = Object.fromEntries(["navigation", "link", "image", "dynamic"].map((name) => [`next/${name}$`, path.join(directory, `${name}.js`)]));
    await new Promise((resolve, reject) => {
      const compiler = webpack({
        mode: "development", devtool: false, target: "web",
        entry: path.join(directory, "entry.jsx"),
        output: { path: directory, filename: "bundle.js", publicPath: "http://localhost/" },
        resolve: {
          extensions: [".tsx", ".ts", ".jsx", ".js"],
          modules: [path.join(root, "node_modules"), "node_modules"],
          alias: { ...alias, "@/app/(dashboard)/william/assistant-action$": path.join(directory, "actions.js"), "@": root },
        },
        module: { rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, use: path.join(directory, "typescript-loader.cjs") }] },
      });
      compiler.run((error, stats) => compiler.close(() => {
        if (error) reject(error);
        else if (stats.hasErrors()) reject(new Error(stats.toString({ all: false, errors: true })));
        else resolve();
      }));
    });
    const bundle = await readFile(path.join(directory, "bundle.js"), "utf8");
    const globals = await readFile(path.join(root, "app/globals.css"), "utf8");
    const theme = globals.match(/@theme\s*\{[\s\S]*?\}/)[0];
    const css = (await postcss([tailwindcss({ base: root })]).process(`@import "tailwindcss" source(none); @source "./components/william"; @source "./components/brand"; ${theme}`, { from: path.join(root, "william-test.css") })).css;
    browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: "chrome" });
    await mkdir(path.join(root, "tmp"), { recursive: true });

    async function createPage({ enabled, reason, failLoad = false, width = 390, height = 844 }) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      page.on("pageerror", (error) => console.error("William UI fixture:", error.message));
      page.setDefaultTimeout(8000);
      await page.route("**/*", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" />' }));
      await page.setContent('<html lang="fr"><head><base href="http://localhost/"></head><body><div id="root"></div></body></html>');
      await page.addStyleTag({ content: css });
      await page.evaluate((fixture) => { window.fixtureEnabled = fixture.enabled; window.fixtureReason = fixture.reason; window.failLoad = fixture.failLoad; }, { enabled, reason, failLoad });
      await page.addScriptTag({ content: bundle });
      await page.getByRole("button", { name: "Ouvrir William", exact: true }).click();
      return page;
    }

    await t.test("accès désactivé : la question reste visible et l’envoi est expliqué", async () => {
      const page = await createPage({ enabled: false, reason: "William n’est pas activé pour ce compte actuellement." });
      const panel = page.getByRole("region", { name: "Assistant William" });
      await expect(panel).toBeFocused();
      await expect(page.getByRole("status")).toContainText("William n’est pas activé pour ce compte actuellement.");
      await expect(page.getByRole("link", { name: "Consulter mon accès dans les paramètres" })).toHaveAttribute("href", "/settings");
      const question = page.getByLabel("Votre question", { exact: true });
      await question.fill("Comment organiser une répétition ?");
      await question.press("Enter");
      await expect(question).toHaveValue("Comment organiser une répétition ?");
      await expect(page.getByRole("button", { name: "Envoyer à William" })).toBeDisabled();
      assert.deepEqual(await page.evaluate(() => window.calls), { load: 0, send: [], reset: 0 });
      assert.ok((await question.boundingBox()).y + (await question.boundingBox()).height < 844 - 75);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(root, "tmp/william-disabled-mobile.png") });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Ouvrir William", exact: true })).toBeFocused();
      await page.close();
    });

    await t.test("question libre au clavier, réponse, suggestions facultatives et nouvelle conversation", async () => {
      const page = await createPage({ enabled: true });
      const question = page.getByLabel("Votre question", { exact: true });
      await expect(page.getByText("Que voulez-vous faire avancer ?", { exact: true })).toBeVisible();
      await question.fill("Comment organiser");
      await question.press("Shift+Enter");
      await question.pressSequentially("une répétition ?");
      await question.press("Enter");
      await expect(page.getByText("Préparez les disponibilités de votre équipe avant de confirmer la répétition.", { exact: true })).toBeVisible();
      assert.equal(await page.evaluate(() => window.calls.send[0].question), "Comment organiser\nune répétition ?");
      await expect(question).toBeVisible();
      await page.screenshot({ path: path.join(root, "tmp/william-question-mobile.png") });
      await page.getByRole("button", { name: "Comment recueillir les disponibilités ?", exact: true }).click();
      await expect(question).toBeFocused();
      await expect(question).toHaveValue("Comment recueillir les disponibilités ?");
      assert.equal(await page.evaluate(() => window.calls.send.length), 1, "Suggestion prepares a draft without sending it");
      await page.getByRole("button", { name: "Nouvelle conversation" }).click();
      await expect(question).toHaveValue("");
      await expect(page.getByText("Que voulez-vous faire avancer ?", { exact: true })).toBeVisible();
      await page.close();
    });

    await t.test("erreur réseau ou refus serveur : brouillon conservé et nouvel envoi possible", async () => {
      const page = await createPage({ enabled: true, width: 1280, height: 900 });
      const question = page.getByLabel("Votre question", { exact: true });
      await expect(page.getByText("Que voulez-vous faire avancer ?", { exact: true })).toBeVisible();
      await page.evaluate(() => { window.failSend = true; });
      await question.fill("Prépare ma prochaine répétition.");
      await question.press("Enter");
      await expect(page.getByRole("alert")).toContainText("Votre question est conservée");
      await expect(question).toHaveValue("Prépare ma prochaine répétition.");
      await expect(page.getByRole("button", { name: "Envoyer à William" })).toBeEnabled();
      await page.evaluate(() => { window.failSend = false; window.sendError = "Votre quota William est épuisé."; });
      await question.press("Enter");
      await expect(page.getByRole("alert")).toHaveText("Votre quota William est épuisé.");
      await expect(question).toHaveValue("Prépare ma prochaine répétition.");
      await page.evaluate(() => { window.sendError = null; });
      await question.press("Enter");
      await expect(page.getByText("Préparez les disponibilités de votre équipe avant de confirmer la répétition.", { exact: true })).toBeVisible();
      await page.evaluate(() => { window.failReset = true; });
      await page.getByRole("button", { name: "Nouvelle conversation" }).click();
      await expect(page.getByRole("alert")).toContainText("Votre échange est conservé");
      await expect(page.getByText("Préparez les disponibilités de votre équipe avant de confirmer la répétition.", { exact: true })).toBeVisible();
      await page.close();
    });

    await t.test("historique indisponible : erreur explicite et reprise en rouvrant William", async () => {
      const page = await createPage({ enabled: true, failLoad: true });
      await expect(page.getByRole("alert")).toContainText("La conversation n’a pas pu être chargée");
      await page.evaluate(() => { window.failLoad = false; });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Ouvrir William", exact: true }).click();
      await expect(page.getByText("Que voulez-vous faire avancer ?", { exact: true })).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      assert.equal(await page.evaluate(() => window.calls.load), 2);
      await page.close();
    });
  } finally {
    await browser?.close();
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith("tadiff-william-ui-"));
    await rm(directory, { recursive: true, force: true });
  }
});
