import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = (file) => ts.transpileModule(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const domain = {};
vm.runInNewContext(compile("lib/admin-supervision.ts"), { exports: domain });
function loadServer(overrides = {}) {
  const exports = {};
  const dependencies = {
    "server-only": {}, "@/lib/env": { hasSupabaseEnv: () => true },
    "@/lib/supabase/access": { computeHasAccess: (status, until) => ["trial", "active"].includes(status) || (status === "comped" && (!until || until >= "2026-10-05")) },
    "@/lib/supabase/admin": { getPlatformAdminAccess: async () => ({ isSuperAdmin: false, permissions: ["view_companies"] }) },
    "@/lib/supabase/server": { getSupabaseServerClient: async () => { throw Error("Unexpected client"); } }, ...overrides,
  };
  vm.runInNewContext(compile("lib/admin-supervision-server.ts"), { exports, Date, Map, Set, require: (key) => { assert.ok(key in dependencies, key); return dependencies[key]; } });
  return exports;
}
const server = loadServer();
const company = { id: "company-a", name: "Compagnie des Éclats", billing_status: "comped", plan_code: "beta", comped_until: null, billing_notes: null, created_at: "2026-10-05T10:00:00Z", owner_name: "Camille", owner_email: "camille@example.test", member_count: 2, show_count: 1, contact_count: 3, deal_count: 0, last_activity: null };
const members = [
  { company_id: company.id, user_id: "user-a", full_name: "Suzanne Théâtre", email: "suzanne@example.test", role: "readonly", created_at: company.created_at, last_activity: company.created_at, last_login: company.created_at },
  { company_id: company.id, user_id: "user-b", full_name: "Camille", email: "camille@example.test", role: "owner", created_at: company.created_at, last_activity: null, last_login: null },
];

test("supervision loads all rows despite a Data API cap below 500", async () => {
  const records = Array.from({ length: 1205 }, (_, id) => ({ id: String(id) }));
  const offsets = [];
  const result = await server.collectSupervisionPages(async (from, to) => { offsets.push(from); return { data: records.slice(from, Math.min(to + 1, from + 200)), count: records.length, error: null }; }, (row) => row.id);
  assert.equal(result.length, records.length);
  assert.deepEqual(offsets, [0, 200, 400, 600, 800, 1000, 1200]);
});
test("supervision rejects failed, duplicate, missing and changed pages", async () => {
  for (const second of [
    { data: null, error: new Error("offline"), count: null }, { data: [], error: null, count: 2 },
    { data: [{ id: "a" }], error: null, count: 2 }, { data: [{ id: "b" }], error: null, count: 3 },
    { data: [{ id: "b" }], error: null, count: null },
  ]) {
    let call = 0;
    await assert.rejects(server.collectSupervisionPages(async () => ++call === 1 ? { data: [{ id: "a" }], count: 2, error: null } : second, (row) => row.id));
  }
});
test("company membership, roles and gifted access remain independent from activity permission", () => {
  const [result] = server.assembleCompanySupervision([company], members, false);
  assert.equal(result.memberCount, 2);
  assert.equal(result.billingStatus, "comped");
  assert.equal(result.hasAccess, true);
  assert.equal(result.members[0].role, "owner");
  assert.equal(result.members[1].fullName, "Suzanne Théâtre");
  assert.ok(result.members.every((member) => member.lastActivity === null && member.lastLogin === null));
  const [allowed] = server.assembleCompanySupervision([company], members, true);
  assert.equal(allowed.members[1].lastLogin, members[0].last_login);
  const [expired] = server.assembleCompanySupervision([{ ...company, comped_until: "2026-09-01" }], members, true);
  assert.equal(expired.billingStatus, "comped"); assert.equal(expired.hasAccess, false);
});
test("a missing member, reassigned company or partial result is an error rather than zero", () => {
  assert.throws(() => server.assembleCompanySupervision([company], members.slice(0, 1), true), /members_changed/);
  assert.throws(() => server.assembleCompanySupervision([company], [{ ...members[0], company_id: "another-company" }], true), /company_changed/);
});
test("search supports accents, company names, individual names and email", () => {
  const [result] = server.assembleCompanySupervision([company], members, false);
  for (const query of ["eclats", "  SUZANNE  ", "suzanne@example.test", "theatre", ""]) assert.equal(domain.companyMatchesSearch(result, query), true);
  assert.equal(domain.companyMatchesSearch(result, "missing"), false);
  assert.equal(domain.getSupervisionRoleLabel("readonly"), "Lecture seule");
  assert.equal(domain.getSupervisionBillingLabel("trial"), "Essai");
});
test("both RPC collections paginate with stable order and exact count", async () => {
  const calls = [];
  const db = { rpc(name, args, options) {
    const call = { name, args, options, order: [] }; calls.push(call);
    const chain = { order(...values) { call.order.push(values); return chain; }, async range(from, to) { call.range = [from, to]; const data = name === "admin_list_companies" ? [company] : members; return { data, count: data.length, error: null }; } }; return chain;
  } };
  const result = await server.readCompanySupervision(db, true);
  assert.equal(result.length, 1);
  assert.equal(calls.length, 2);
  for (const call of calls) { assert.equal(call.options.count, "exact"); assert.deepEqual(call.range, [0, 499]); assert.equal(call.order.length, 2); }
});
test("no connection, no permission and read errors remain unavailable", async () => {
  const notConfigured = await loadServer({ "@/lib/env": { hasSupabaseEnv: () => false } }).getAdminCompanySupervision();
  assert.equal(notConfigured.status, "error");
  const forbidden = await loadServer({ "@/lib/supabase/admin": { getPlatformAdminAccess: async () => ({ isSuperAdmin: false, permissions: ["view_beta"] }) } }).getAdminCompanySupervision();
  assert.equal(forbidden.status, "error");
  const failure = await server.getAdminCompanySupervision();
  assert.equal(failure.status, "error"); assert.match(failure.message, /Actualisez/);
});
