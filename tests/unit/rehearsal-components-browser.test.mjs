import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const productionFile = (name, file) => readFileSync(new URL(`./cjs/${file}.production.js`, `file:///${require.resolve(`${name}/package.json`).replaceAll("\\", "/")}`), "utf8");
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, root), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;

function browserBundle() {
  const modules = {
    react: productionFile("react", "react"),
    "react/jsx-runtime": productionFile("react", "react-jsx-runtime"),
    "react-dom": productionFile("react-dom", "react-dom"),
    "react-dom/client": productionFile("react-dom", "react-dom-client"),
    scheduler: productionFile("scheduler", "scheduler"),
    "next/navigation": "exports.useRouter = () => ({refresh: () => window.renderWorkspace()});",
    "next/link": "exports.__esModule=true; exports.default=(props)=>require('react').createElement('a',props);",
    "lucide-react": "for (const name of ['CalendarCheck','Check','Clock3','Copy','MapPin','Plus','Trash2','HelpCircle','X']) exports[name]=()=>null;",
    "@/lib/utils": "exports.cn=(...values)=>values.filter(Boolean).join(' ');",
    "@/components/ui/button": compile("components/ui/button.tsx"),
    "@/components/ui/input": compile("components/ui/input.tsx"),
    "@/components/ui/select": compile("components/ui/select.tsx"),
    "@/components/ui/badge": compile("components/ui/badge.tsx"),
    "@/app/(dashboard)/shows/[id]/rehearsal-actions": `
      exports.confirmRehearsalSlots=async(show,poll,ids)=>{ window.fixture.slots.forEach(slot=>{if(ids.includes(slot.id))slot.confirmed=true;}); return {ok:true,message:'Répétition confirmée'}; };
      exports.setRehearsalPollStatus=async(show,poll,status)=>{window.fixture.status=status;return {ok:true,message:'Statut enregistré'};};
      exports.createRehearsalPoll=async()=>({ok:false,message:'Hors parcours'});
      exports.updateRehearsalSlotLocations=async()=>({ok:false,message:'Hors parcours'});`,
    "./actions": "exports.submitRehearsalResponse=async(input)=>{window.lastResponse=input;return {ok:true,participantId:input.participantId||'new-id',message:'Vos disponibilités ont bien été transmises à la compagnie.'};};",
    workspace: compile("components/shows/rehearsal-workspace.tsx"),
    publicForm: compile("app/(public)/repetitions/[token]/response-form.tsx"),
  };
  return `const modules={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:(module,exports,require)=>{${code}\n}`).join(",")}};const cache={};function require(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;modules[name](module,module.exports,require);return module.exports;}window.React=require('react');window.uiRoot=require('react-dom/client').createRoot(document.getElementById('root'));window.RehearsalWorkspace=require('workspace').RehearsalWorkspace;window.ResponseForm=require('publicForm').ResponseForm;`;
}

test("répétitions : états de confirmation/fermeture au clavier et réponse extérieure conservée", { timeout: 30_000 }, async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.route("http://127.0.0.1:3199/**", (route) => route.fulfill({ contentType: "text/html", body: '<html lang="fr"><div id="root"></div></html>' }));
    await page.goto("http://127.0.0.1:3199/");
    await page.addScriptTag({ content: browserBundle() });
    await page.evaluate(() => {
      window.fixture = { id: "poll", title: "Répétitions de novembre", token: "token", status: "open", deadline: "", showResponses: true,
        slots: [{ id: "slot", date: "2027-11-01", startTime: "10:00", endTime: "13:00", location: "Studio principal", confirmed: false }],
        participants: [{ id: "person", name: "Camille", respondedAt: "2026-09-26", comment: "Départ à midi" }], responses: [{ participantId: "person", slotId: "slot", availability: "yes" }] };
      window.renderWorkspace = () => window.uiRoot.render(window.React.createElement(window.RehearsalWorkspace, { showId: "show", team: [], initialPolls: [{ ...window.fixture }] }));
      window.renderWorkspace();
    });
    await expect(page.getByText("Départ à midi", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nouveau sondage" })).toBeDisabled();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirmer dans l’agenda" }).click();
    await expect(page.getByText("Confirmé dans l’agenda", { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await expect(page.getByRole("checkbox")).toBeDisabled();
    await page.getByRole("button", { name: "Fermer le sondage" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Rouvrir le sondage" })).toBeVisible();
    await page.getByRole("button", { name: "Rouvrir le sondage" }).click();
    await expect(page.getByRole("button", { name: "Fermer le sondage" })).toBeVisible();

    await page.evaluate(() => window.uiRoot.render(window.React.createElement(window.ResponseForm, { token: "token", slots: window.fixture.slots, participants: [], responses: [] })));
    await page.getByLabel("Qui êtes-vous ?").selectOption("new");
    await page.getByLabel("Votre nom", { exact: true }).fill("Régie invitée");
    await page.getByRole("button", { name: "Tout marquer disponible" }).click();
    await page.getByRole("button", { name: "Envoyer mes disponibilités" }).click();
    await expect(page.getByText(/disponibilités ont bien été transmises/)).toBeVisible();
    await expect(page.getByLabel("Qui êtes-vous ?")).toHaveValue("new-id");
    await page.getByRole("button", { name: "Envoyer mes disponibilités" }).click();
    assert.equal(await page.evaluate(() => window.lastResponse.participantId), "new-id");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
