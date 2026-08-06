import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../sql/073_admin_company_workflow_metrics.sql", import.meta.url);

test("la RPC de parcours reste protégée par view_companies", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /where public\.has_platform_permission\('view_companies'\)/i);
  assert.match(sql, /revoke all on function public\.admin_list_company_workflow_metrics\(\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.admin_list_company_workflow_metrics\(\) to authenticated/i);
});
test("la forme retournée ne contient aucun contenu métier", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const signature = sql.match(/returns table \(([\s\S]*?)\)\s*language sql/i)?.[1] ?? "";
  assert.ok(signature, "La signature SQL doit être détectable.");
  for (const forbidden of ["email", "phone", "amount", "title", "message", "question", "notes", "path", "ip_address", "user_agent"]) {
    assert.doesNotMatch(signature, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
});
