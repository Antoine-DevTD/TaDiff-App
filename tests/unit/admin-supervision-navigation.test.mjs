import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../../app/(dashboard)/admin/page.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

async function render(permissions, tab, isSuperAdmin = false) {
  const calls = [];
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const admin = new Proxy({
    getPlatformAdminAccess: async () => ({ isSuperAdmin, permissions }),
    getAiProviderReadiness: () => ({}),
  }, { get(target, key) {
    return target[key] ?? (async () => {
      calls.push(key);
      if (key === "getAdminBetaSupervision") return { signups: [], error: "Migration requise" };
      if (key === "getAdminMaintenanceMode") return false;
      return [];
    });
  } });
  vm.runInNewContext(code, { exports, process: { env: {} }, require(name) {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
    if (name === "next/navigation") return { notFound() { throw new Error("notFound"); } };
    if (name === "next/link") return { __esModule: true, default: "Link" };
    if (name === "@/lib/supabase/admin") return admin;
    if (name === "@/lib/admin-supervision-server") return { getAdminCompanySupervision: async () => {
      calls.push("getAdminCompanySupervision");
      return { status: "ready", companies: [], canViewAccess: isSuperAdmin || permissions.includes("view_access"), loadedAt: "2026-10-05T12:00:00Z" };
    } };
    if (name === "@/lib/admin-forecast") return { buildRevenueForecast: () => [] };
    if (name === "@/lib/finance") return { formatCurrency: () => "0 €" };
    if (name === "@/lib/access-codes-server") return { listAccessCodes: async () => ({ codes: [], error: null }) };
    if (name === "@/lib/feedback-requests-server") return { getFeedbackRequests: async () => ({ requests: [], error: null }) };
    if (name.startsWith("@/components/")) return new Proxy({}, { get: (_target, key) => String(key) });
    throw new Error(`Unstubbed import: ${name}`);
  } });
  const tree = await exports.default({ searchParams: Promise.resolve(tab ? { tab } : {}) });
  function find(type, node) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) return node.map((child) => find(type, child)).find(Boolean) ?? null;
    if (node.type === type) return node;
    return find(type, node.props?.children);
  }
  return { calls, find: (type) => find(type, tree) };
}

test("bêta seule : accès en lecture, erreur explicite, aucune collecte des autres modules", async () => {
  const { calls, find } = await render(["view_beta"]);
  assert.deepEqual(calls, ["getAdminBetaSupervision"]);
  assert.equal(find("BetaAccessManager").props.canManage, false);
  assert.equal(find("BetaAccessManager").props.canViewAccess, false);
  assert.equal(find("BetaAccessManager").props.error, "Migration requise");
  assert.equal(find("CompanySupervision"), null);
});

test("superadmin : onglet bêta sans charger compagnies, audience, William ou catalogues", async () => {
  const { calls, find } = await render([], "beta", true);
  assert.equal(find("BetaAccessManager").props.canManage, true);
  assert.equal(find("BetaAccessManager").props.canViewAccess, true);
  assert.equal(find("CompanySupervision"), null);
  assert.deepEqual(calls.sort(), ["getAdminBetaSupervision", "getAdminFeedback"].sort());
});

test("droit compagnies : membres visibles sans droits de connexion ni de modification", async () => {
  const { calls, find } = await render(["view_companies"]);
  assert.deepEqual(calls, ["getAdminCompanySupervision"]);
  assert.equal(find("CompanySupervision").props.canManageBilling, false);
  assert.equal(find("CompanySupervision").props.snapshot.canViewAccess, false);
});

test("droit connexions seul : aucun chargement des membres ou inscriptions", async () => {
  const { calls, find } = await render(["view_access"]);
  assert.deepEqual(calls, ["getAdminAccessEvents"]);
  assert.equal(find("CompanySupervision"), null);
  assert.equal(find("BetaAccessManager"), null);
});

test("onglet refusé : retour à un onglet autorisé sans appeler son chargement", async () => {
  const { calls, find } = await render(["view_beta"], "administrateurs");
  assert.deepEqual(calls, ["getAdminBetaSupervision"]);
  assert.equal(find("PlatformAdminManager"), null);
});

test("aucun droit : la console refuse l’accès avant tout chargement", async () => {
  await assert.rejects(render([], "beta"), /notFound/);
});
