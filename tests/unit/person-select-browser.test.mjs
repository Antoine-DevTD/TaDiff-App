import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const runtime = (name, file) => readFileSync(new URL(`./cjs/${file}.production.js`, `file:///${require.resolve(`${name}/package.json`).replaceAll("\\", "/")}`), "utf8");
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, root), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;

function bundle() {
  const modules = {
    react: runtime("react", "react"), "react/jsx-runtime": runtime("react", "react-jsx-runtime"), "react-dom": runtime("react-dom", "react-dom"), "react-dom/client": runtime("react-dom", "react-dom-client"), scheduler: runtime("scheduler", "scheduler"),
    "@/lib/utils": "exports.cn=(...values)=>values.filter(Boolean).join(' ');",
    "react-hook-form": readFileSync(require.resolve("react-hook-form"), "utf8"),
    "next/link": "exports.__esModule=true;exports.default=(props)=>require('react').createElement('a',props);",
    "@/components/ui/select": compile("components/ui/select.tsx"),
    "@/components/ui/button": compile("components/ui/button.tsx"),
    "@/components/ui/dialog": compile("components/ui/dialog.tsx"),
    "lucide-react": "exports.X=()=>null;",
    "@/components/contacts/searchable-contact-select": compile("components/contacts/searchable-contact-select.tsx"),
  };
  return `const modules={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:(module,exports,require)=>{${code}\n}`).join(",")}};const cache={};function require(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;if(!modules[name])throw new Error("Missing module "+name);modules[name](module,module.exports,require);return module.exports;}
  const React=require('react'), Select=require('@/components/ui/select').Select, Dialog=require('@/components/ui/dialog').Dialog;
  const root=require('react-dom/client').createRoot(document.getElementById('root'));
  const options=[['','Aucune personne'],['lea','Léa Dupont — Opéra · lea@example.test'],['lea2','Léa Dupont — Théâtre'],['suzanne','Suzanne Bussy'],['disabled','Personne indisponible'],...Array.from({length:500},(_,i)=>['extra-'+i,'Personne '+i])];
  const children=()=>options.map(([id,label])=>React.createElement('option',{key:id,value:id,disabled:id==='disabled'},label));
  function App(){
    const [value,setValue]=React.useState('suzanne'); const [show,setShow]=React.useState(true); const [dialog,setDialog]=React.useState(false);
    const form=require('react-hook-form').useForm({defaultValues:{person:'suzanne'}});
    const watched=form.watch('person');
    return React.createElement('div',null,
      React.createElement('form',{id:'plain',onSubmit:e=>{e.preventDefault();window.saved=new FormData(e.currentTarget).get('person');}},
        React.createElement('label',null,'Personne',React.createElement(Select,{searchable:true,name:'person',defaultValue:'suzanne'},children())),
        React.createElement('button',{type:'submit'},'Enregistrer'),React.createElement('button',{type:'reset'},'Réinitialiser')),
      React.createElement('label',null,'Responsable',React.createElement(Select,{searchable:true,value,onChange:e=>{window.proposed=e.target.value;if(window.accept!==false)setValue(e.target.value);}},children())),
      React.createElement('button',{onClick:()=>setValue('lea2')},'Changer depuis le parent'),
      React.createElement('form',{onSubmit:form.handleSubmit(data=>{window.rhf=data;})},
        React.createElement('label',null,'Contact du formulaire',React.createElement(Select,{searchable:true,...form.register('person',{required:true}),value:watched},children())),
        React.createElement('button',{type:'submit'},'Valider le formulaire'), React.createElement('button',{type:'button',onClick:()=>form.reset({person:''})},'Vider le formulaire')),
      React.createElement('label',null,'Indisponible',React.createElement(Select,{searchable:true,disabled:true},children())),
      React.createElement('label',null,'Obligatoire',React.createElement(Select,{searchable:true,required:true,name:'required',form:'required-form',defaultValue:''},children())),
      React.createElement('form',{id:'required-form',onSubmit:e=>{e.preventDefault();window.requiredSaved=true;}},React.createElement('button',{type:'submit'},'Valider obligatoire')),
      React.createElement('button',{onClick:()=>setShow(!show)},'Changer les options'),
      React.createElement('label',null,'Liste vide',React.createElement(Select,{searchable:true,value:''},show?[]:children())),
      React.createElement('button',{onClick:()=>setDialog(true)},'Ouvrir la fenêtre'),
      React.createElement(Dialog,{open:dialog,onClose:()=>setDialog(false),title:'Choisir dans la fenêtre'},React.createElement('label',null,'Invité',React.createElement(Select,{searchable:true,defaultValue:'suzanne'},children()))),
      React.createElement(require('@/components/contacts/searchable-contact-select').SearchableContactSelect,{contacts:[{id:'lea',name:'Léa Dupont',organization:'Opéra',email:'lea@example.test'}]})
    );
  }root.render(React.createElement(App));`;
}

for (const width of [390, 1280]) test(`sélection de personnes : recherche, formulaires et clavier à ${width}px`, { timeout: 45_000 }, async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const cssDirectory = new URL(".next/static/css/", root);
    const css = process.env.TADIFF_QA_SCREENSHOTS ? readdirSync(cssDirectory).filter((file) => file.endsWith(".css")).map((file) => readFileSync(new URL(file, cssDirectory), "utf8")).join("\n") : "";
    await page.route("http://127.0.0.1:3198/**", (route) => route.fulfill({ contentType: "text/html", body: `<html lang="fr"><style>${css} body{margin:16px}label{display:block;margin:12px 0}input{box-sizing:border-box;min-height:44px;width:100%} [role=option]{min-height:44px} div[style*="fixed"]{overflow-y:auto}</style><div id="root"></div></html>` }));
    await page.goto("http://127.0.0.1:3198/");
    await page.addScriptTag({ content: bundle() });
    const person = page.getByRole("combobox", { name: "Personne", exact: true });
    await expect(person).toHaveValue("Suzanne Bussy");
    await person.fill("DUPONT lea opera");
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByRole("option")).toContainText("Léa Dupont — Opéra");
    await person.press("Enter");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    assert.equal(await page.evaluate(() => window.saved), "lea");
    await person.fill("personne introuvable");
    await expect(page.getByRole("status")).toContainText("Aucune personne trouvée");
    await person.press("Enter");
    await person.press("Escape");
    await expect(person).toHaveValue("Léa Dupont — Opéra · lea@example.test");
    await person.fill("Suzanne");
    await person.press("Tab");
    await expect(person).toHaveValue("Léa Dupont — Opéra · lea@example.test");
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click();
    await expect(person).toHaveValue("Suzanne Bussy");
    await person.fill("Léa Dupont");
    await expect(page.getByRole("option")).toHaveCount(2);
    await person.press("ArrowDown");
    await person.press("Enter");
    await expect(person).toHaveValue("Léa Dupont — Théâtre");
    await person.fill("indisponible");
    await expect(page.getByRole("option")).toHaveCount(0);
    await person.press("Escape");
    await expect(page.getByRole("combobox", { name: "Indisponible", exact: true })).toBeDisabled();

    const controlled = page.getByRole("combobox", { name: "Responsable", exact: true });
    await page.evaluate(() => { window.accept = false; });
    await controlled.fill("Opéra");
    await page.getByRole("option").click();
    await expect(controlled).toHaveValue("Suzanne Bussy");
    assert.equal(await page.evaluate(() => window.proposed), "lea");
    await page.getByRole("button", { name: "Changer depuis le parent" }).click();
    await expect(controlled).toHaveValue("Léa Dupont — Théâtre");

    const rhf = page.getByRole("combobox", { name: "Contact du formulaire" });
    await rhf.fill("Opéra"); await rhf.press("Enter");
    await page.getByRole("button", { name: "Valider le formulaire", exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.rhf), { person: "lea" });
    await page.getByRole("button", { name: "Vider le formulaire" }).click();
    await expect(rhf).toHaveValue("Aucune personne");
    await page.getByRole("button", { name: "Valider le formulaire", exact: true }).click();
    await expect(rhf).toBeFocused();
    await rhf.press("Escape");

    const required = page.getByRole("combobox", { name: "Obligatoire" });
    await page.getByRole("button", { name: "Valider obligatoire" }).click();
    await expect(required).toBeFocused();
    await expect(page.getByRole("alert")).toHaveText("Choisissez une personne dans les résultats.");
    assert.notEqual(await page.evaluate(() => window.requiredSaved), true);
    await required.fill("Suzanne"); await required.press("Enter");
    await page.getByRole("button", { name: "Valider obligatoire" }).click();
    assert.equal(await page.evaluate(() => window.requiredSaved), true);
    await expect(page.getByRole("alert")).toHaveCount(0);

    await page.getByRole("combobox", { name: "Liste vide" }).click();
    await expect(page.getByRole("status")).toContainText("Aucune personne trouvée");
    await page.getByRole("button", { name: "Changer les options" }).click();
    await page.getByRole("combobox", { name: "Liste vide" }).fill("Opéra");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.getByRole("combobox", { name: "Liste vide" }).press("Escape");
    await page.getByRole("combobox", { name: "Contact à rattacher" }).fill("lea@example.test");
    await page.getByRole("option").click();
    assert.equal(await page.locator('select[name="contactId"]').inputValue(), "lea");

    await page.getByRole("button", { name: "Ouvrir la fenêtre" }).click();
    const invited = page.getByRole("combobox", { name: "Invité" });
    await invited.fill("Suzanne");
    await invited.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await invited.fill("Opéra");
    await page.getByRole("option").click();
    await expect(invited).toHaveValue("Léa Dupont — Opéra · lea@example.test");
    await invited.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await person.fill("Personne");
    const box = await page.getByRole("listbox").boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width);
    if (process.env.TADIFF_QA_SCREENSHOTS) {
      await person.fill("Léa");
      mkdirSync(process.env.TADIFF_QA_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: join(process.env.TADIFF_QA_SCREENSHOTS, `person-search-${width}.png`) });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
