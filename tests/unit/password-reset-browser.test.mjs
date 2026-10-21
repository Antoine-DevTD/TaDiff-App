import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url), root = new URL("../../", import.meta.url);
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, root), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const runtime = (name, file) => readFileSync(join(require.resolve(`${name}/package.json`), "..", "cjs", `${file}.production.js`), "utf8");
const token = "a".repeat(64);
function bundle() {
  const modules = {
    react: runtime("react", "react"), "react/jsx-runtime": runtime("react", "react-jsx-runtime"), "react-dom": runtime("react-dom", "react-dom"), "react-dom/client": runtime("react-dom", "react-dom-client"), scheduler: runtime("scheduler", "scheduler"),
    "next/link": "exports.__esModule=true;exports.default=(props)=>require('react').createElement('a',props);",
    "@/lib/utils": "exports.cn=(...v)=>v.filter(Boolean).join(' ');",
    "@/components/ui/button": compile("components/ui/button.tsx"), "@/components/ui/input": compile("components/ui/input.tsx"),
    "@/lib/password-reset-validation": compile("lib/password-reset-validation.ts"),
    "@/components/forms/reset-password-form": "exports.ResetPasswordForm=()=>require('react').createElement('p',null,'Ancien parcours conservé');",
    entry: compile("components/forms/reusable-password-reset-form.tsx"),
  };
  return `const modules={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:(module,exports,require)=>{${code}\n}`).join(",")}};const cache={};function require(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;modules[name](module,module.exports,require);return module.exports;}require('react-dom/client').createRoot(document.getElementById('root')).render(require('react').createElement(require('entry').PasswordResetEntry,{nextPath:'/dashboard'}));`;
}

for (const width of [390, 1280]) test(`lien de 7 jours : ouvertures répétées, erreurs, clavier, fin de validité à ${width}px`, { timeout: 45_000 }, async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  let state = "ready", inspectError = false, completeError = false, delayed = false, completeCount = 0, inspections = 0;
  const errors = [], paths = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const cssDir = new URL(".next/static/css/", root);
    const css = readdirSync(cssDir).filter((f) => f.endsWith(".css")).map((f) => readFileSync(new URL(f, cssDir), "utf8")).join("\n");
    await page.route("http://127.0.0.1:3197/**", async (route) => {
      const request = route.request(); paths.push(request.url());
      if (new URL(request.url()).pathname === "/api/auth/password-reset") {
        const input = request.postDataJSON(); assert.equal(input.token, token);
        if (input.action === "inspect") {
          inspections++; if (inspectError) { inspectError = false; return route.abort(); }
          return route.fulfill({ json: { status: state, expiresAt: "2026-10-28T14:00:00Z" } });
        }
        completeCount++;
        if (completeError) { completeError = false; return route.fulfill({ json: { status: "error", message: "Choisissez un mot de passe différent de l’ancien." } }); }
        if (delayed) await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(input.password, "mot-de-passe-qa"); assert.equal(input.confirmPassword, input.password);
        state = "used"; return route.fulfill({ json: { status: "changed" } });
      }
      return route.fulfill({ contentType: "text/html", body: `<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><style>${css}</style></head><body><main style="max-width:448px;margin:24px auto;padding:16px"><h1>Choisissez un nouveau mot de passe</h1><div id="root"></div></main><script>${bundle()}</script></body></html>` });
    });
    const url = `http://127.0.0.1:3197/reset-password#recovery=${token}`;
    await page.goto(url);
    await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
    assert.equal(completeCount, 0); assert.equal(state, "ready"); assert.ok(inspections >= 2);
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("mot-de-passe-qa");
    await page.getByLabel("Confirmer le mot de passe").fill("différent");
    await page.getByRole("button", { name: "Enregistrer le nouveau mot de passe", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Les deux mots de passe"); assert.equal(completeCount, 0);
    await page.getByLabel("Confirmer le mot de passe").fill("mot-de-passe-qa");
    completeError = true;
    await page.getByLabel("Confirmer le mot de passe").press("Enter");
    await expect(page.getByRole("alert")).toContainText("différent de l’ancien");
    await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toHaveValue("mot-de-passe-qa"); assert.equal(state, "ready");
    delayed = true;
    await page.getByRole("button", { name: "Enregistrer le nouveau mot de passe", exact: true }).dblclick();
    await expect(page.getByRole("status")).toContainText("nouveau mot de passe est enregistré");
    assert.equal(completeCount, 2);
    await expect(page.getByRole("link", { name: "Se connecter à TaDiff" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("désactivé après un changement");
    await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toHaveCount(0);
    state = "expired"; await page.reload(); await expect(page.getByRole("alert")).toContainText("expiré au bout de 7 jours");
    state = "ready"; inspectError = true; await page.reload();
    await expect(page.getByRole("alert")).toContainText("n’a pas pu être vérifié");
    await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (process.env.TADIFF_QA_SCREENSHOTS) { mkdirSync(process.env.TADIFF_QA_SCREENSHOTS, { recursive: true }); await page.screenshot({ path: join(process.env.TADIFF_QA_SCREENSHOTS, `reset-password-${width}.png`) }); }
    assert.ok(paths.every((path) => !path.includes(token)), "aucun secret dans les URLs des requêtes HTTP");
    await page.goto("http://127.0.0.1:3197/reset-password#recovery=bad"); await expect(page.getByRole("alert")).toContainText("lien n’est pas valide");
    await page.goto("http://127.0.0.1:3197/reset-password"); await expect(page.getByText("Ancien parcours conservé")).toBeVisible();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
