import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
function load(file, modules) {
  const code = ts.transpileModule(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    if (name === "react/jsx-runtime") return jsx;
    if (name === "react") return { Suspense: "Suspense" };
    if (name === "next/navigation") return { notFound() { throw new Error("notFound"); }, redirect(path) { throw new Error(`redirect:${path}`); } };
    if (name === "next/link") return { __esModule: true, default: "Link" };
    if (name === "lucide-react" || name.startsWith("@/components/")) return new Proxy({}, { get: (_target, key) => key });
    if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
    return modules[name];
  } });
  return exports;
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean) ?? null;
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
function harness({ editor = true, superadmin = false, archived = false, missing = false, error = null } = {}) {
  const calls = [];
  const page = { id, archived_at: archived ? "2026-10-21T12:00:00Z" : null };
  const modules = {
    "@/lib/env": { hasSupabaseEnv: () => true },
    "@/lib/resources-server": {
      canEditResources: async () => editor,
      isResourceId: (value) => value === id,
      listResourcePages: async () => { calls.push("list"); return { data: [], error }; },
      getResourcePage: async () => { calls.push("page"); return { data: missing ? null : page, error }; },
      listResourceAssets: async () => { calls.push("assets"); return { data: [], error: null }; },
    },
    "@/lib/supabase/admin": { isSuperAdmin: async () => superadmin, getPlatformAdminAccess: async () => ({ isSuperAdmin: superadmin, permissions: [] }) },
    "@/lib/supabase/server": { getSupabaseServerUser: async () => ({ data: { user: { id } } }) },
    "@/lib/supabase/auth-navigation": { getWorkspaceEntryRedirect: async () => null },
    "@/lib/supabase/workspace": { getWorkspaceBranding: async () => ({ label: "Compagnie des Tests", logoUrl: "/compagnie.png", logoScale: 100, logoPositionX: 50, logoPositionY: 50 }) },
  };
  return { calls, load: (file) => load(file, modules).default };
}

test("l’éditeur de ressources conserve sa navigation, sa compagnie et ses outils habituels", async () => {
  const h = harness();
  const tree = await h.load("app/(dashboard)/layout.tsx")({ children: "spectacles" });
  const sidebar = find(tree, (node) => node.type === "Sidebar");
  assert.equal(sidebar.props.variant, "company");
  assert.equal(sidebar.props.canManageResources, true);
  assert.equal(sidebar.props.canViewBeta, false);
  assert.equal(sidebar.props.canViewCompanies, false);
  assert.equal(find(tree, (node) => node.type === "Topbar").props.workspaceLabel, "Compagnie des Tests");
  assert.ok(find(tree, (node) => node.type === "WilliamAssistant"));
  assert.ok(find(tree, (node) => node.type === "DeferredDashboardTools"));
});

test("l’espace d’édition offre un retour compagnie sans exposer la gestion des accès", async () => {
  const tree = await harness().load("app/(resource-editor)/resources/manage/layout.tsx")({ children: "éditeur" });
  assert.ok(find(tree, (node) => node.type === "Link" && node.props.href === "/dashboard"));
  assert.equal(find(tree, (node) => node.props?.href === "/admin?tab=ressources"), null);
  assert.equal(find(tree, (node) => node.type === "Sidebar"), null);
  assert.equal(find(tree, (node) => node.type === "WilliamAssistant"), null);
  const admin = await harness({ superadmin: true }).load("app/(resource-editor)/resources/manage/layout.tsx")({ children: "éditeur" });
  assert.ok(find(admin, (node) => node.props?.href === "/admin?tab=ressources"));
});

test("un droit absent ou retiré bloque les routes d’édition avant toute lecture de page", async () => {
  const h = harness({ editor: false });
  await assert.rejects(h.load("app/(resource-editor)/resources/manage/layout.tsx")({ children: "secret" }), /notFound/);
  await assert.rejects(h.load("app/(resource-editor)/resources/manage/page.tsx")(), /notFound/);
  await assert.rejects(h.load("app/(resource-editor)/resources/manage/[id]/page.tsx")({ params: Promise.resolve({ id }) }), /notFound/);
  assert.deepEqual(h.calls, []);
});

test("une archive ne remonte pas l’éditeur et une erreur conserve un réessai explicite", async () => {
  const path = "app/(resource-editor)/resources/manage/[id]/page.tsx";
  const archived = await harness({ archived: true }).load(path)({ params: Promise.resolve({ id }) });
  assert.equal(find(archived, (node) => node.type === "ResourceEditor"), null);
  assert.ok(find(archived, (node) => node.props?.href === "/resources/manage"));
  const failed = await harness({ error: "Connexion interrompue" }).load(path)({ params: Promise.resolve({ id }) });
  assert.ok(find(failed, (node) => node.props?.role === "alert"));
  assert.ok(find(failed, (node) => node.props?.href === `/resources/manage/${id}`));
  const normal = await harness().load(path)({ params: Promise.resolve({ id }) });
  assert.ok(find(normal, (node) => node.type === "ResourceEditor"));
});

test("les anciennes adresses d’édition renvoient vers le nouvel espace", async () => {
  const h = harness();
  assert.throws(() => h.load("app/(dashboard)/admin/resources/page.tsx")(), /redirect:\/resources\/manage/);
  await assert.rejects(h.load("app/(dashboard)/admin/resources/[id]/page.tsx")({ params: Promise.resolve({ id }) }), new RegExp(`redirect:/resources/manage/${id}`));
});
