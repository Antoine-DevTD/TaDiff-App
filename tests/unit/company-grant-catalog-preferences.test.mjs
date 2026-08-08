import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../sql/077_company_grant_catalog_preferences.sql",
  import.meta.url,
);
const validationUrl = new URL("../../lib/validation/grant.ts", import.meta.url);

test("une aide du catalogue retirée reste exclue pour sa compagnie", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /primary key \(company_id, catalog_id\)/i);
  assert.match(sql, /old\.company_id,[\s\S]+old\.catalog_id,[\s\S]+auth\.uid\(\)/i);
  assert.match(sql, /from public\.grant_catalog_exclusions exclusion[\s\S]+exclusion\.company_id = target_company_id[\s\S]+exclusion\.catalog_id = catalog\.id/i);
  assert.match(sql, /revoke all on table public\.grant_catalog_exclusions from public, anon, authenticated/i);
});

test("un ajout propre à une compagnie crée une proposition sans ses notes privées", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const proposalTable = sql.match(/create table if not exists public\.grant_catalog_proposals \(([\s\S]+?)\n\);/i)?.[1] ?? "";

  assert.match(sql, /if new\.catalog_id is null then[\s\S]+insert into public\.grant_catalog_proposals/i);
  assert.doesNotMatch(proposalTable, /eligibility/i);
  assert.match(sql, /review_status in \('pending', 'published', 'local_only', 'withdrawn'\)/i);
  assert.match(sql, /revoke all on table public\.grant_catalog_proposals from public, anon, authenticated/i);

  const validation = await readFile(validationUrl, "utf8");
  assert.match(validation, /\^https\?:\\\/\\\//i);
});

test("seul le superadmin peut publier une proposition dans le catalogue commun", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /if not public\.is_super_admin_user\(\) then[\s\S]+Accès réservé au superadmin/i);
  assert.match(sql, /for company in select id from public\.companies loop[\s\S]+seed_reference_grants\(company\.id\)/i);
  assert.match(sql, /where review_status = 'pending'[\s\S]+lower\(title\) = lower\(proposal\.title\)[\s\S]+lower\(funder\) = lower\(proposal\.funder\)/i);
  assert.match(sql, /on conflict \(lower\(title\), lower\(funder\)\) do update[\s\S]+deadline = excluded\.deadline[\s\S]+amount_max = excluded\.amount_max[\s\S]+source_url = excluded\.source_url/i);
  assert.match(sql, /revoke all on function public\.admin_review_grant_catalog_proposal\(uuid, boolean\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.admin_review_grant_catalog_proposal\(uuid, boolean\) to authenticated/i);
});

test("une aide locale supprimée reste exclue si elle devient ensuite globale", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /from public\.grant_catalog_proposals withdrawn[\s\S]+withdrawn\.review_status = 'withdrawn'[\s\S]+on conflict \(company_id, catalog_id\) do nothing/i);
});

test("la remise à zéro du compte de démonstration ne crée pas d'exclusions", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /set_config\('tadiff\.resetting_workspace', 'on', true\)/i);
  assert.match(sql, /current_setting\('tadiff\.resetting_workspace', true\) = 'on'/i);
  assert.match(sql, /'grant_catalog_proposals',[\s\S]+'grant_catalog_exclusions',[\s\S]+'grant_opportunities'/i);
});
