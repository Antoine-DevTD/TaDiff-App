import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../sql/074_fix_company_logo_framing_grants.sql", import.meta.url);

test("la migration accorde uniquement les colonnes de cadrage du logo", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /grant update\s*\(\s*logo_scale,\s*logo_position_x,\s*logo_position_y\s*\)\s*on table public\.companies to authenticated;/is);
  assert.doesNotMatch(sql, /grant update on (?:table )?public\.companies/is);
  assert.doesNotMatch(sql, /\bto\s+(?:anon|public)\b/is);
});
