import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getUsageDateLabel,
  isWithinDailyFeedbackCooldown,
} from "../../lib/daily-feedback.ts";

const migrationUrl = new URL("../../sql/075_daily_usage_feedback.sql", import.meta.url);
const cooldownMigrationUrl = new URL(
  "../../sql/076_daily_feedback_three_day_cooldown.sql",
  import.meta.url,
);

test("affiche hier pour la veille et une date française autrement", () => {
  const today = new Date(2026, 7, 8, 10);

  assert.equal(getUsageDateLabel("2026-08-07", today), "hier");
  assert.equal(getUsageDateLabel("2026-08-05", today), "le 5 août");
});

test("le délai local autorise une nouvelle sollicitation au troisième jour", () => {
  assert.equal(isWithinDailyFeedbackCooldown("2026-08-08", "2026-08-08"), true);
  assert.equal(isWithinDailyFeedbackCooldown("2026-08-08", "2026-08-09"), true);
  assert.equal(isWithinDailyFeedbackCooldown("2026-08-08", "2026-08-10"), true);
  assert.equal(isWithinDailyFeedbackCooldown("2026-08-08", "2026-08-11"), false);
  assert.equal(isWithinDailyFeedbackCooldown("invalide", "2026-08-11"), false);
});

test("le retour quotidien reste rattaché à l'utilisateur et à une utilisation réelle", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /ae\.user_id = auth\.uid\(\)/);
  assert.match(sql, /ae\.company_id = current_profile\.company_id/);
  assert.match(sql, /f\.actor_id = auth\.uid\(\)/);
  assert.match(sql, /Aucune utilisation correspondante/);
  assert.match(sql, /feedback_daily_actor_usage_idx/);
  assert.match(sql, /on conflict \(actor_id, usage_date\)/);
});

test("les RPC ne sont exposées qu'aux membres authentifiés", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /revoke all on function public\.get_daily_feedback_prompt\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.get_daily_feedback_prompt\(\) to authenticated/);
  assert.match(sql, /revoke all on function public\.submit_daily_feedback[\s\S]+from public, anon/);
  assert.match(sql, /grant execute on function public\.submit_daily_feedback[\s\S]+to authenticated/);
});

test("une nouvelle sollicitation attend toujours trois jours", async () => {
  const sql = await readFile(cooldownMigrationUrl, "utf8");

  assert.match(sql, /fpe\.actor_id = auth\.uid\(\)/);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(current_profile\.id::text, 0\)\)/);
  assert.match(sql, /fpe\.prompted_on > paris_today - 3/);
  assert.match(sql, /on conflict \(actor_id, prompted_on\) do nothing/);
  assert.match(sql, /revoke all on table public\.feedback_prompt_events from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.get_daily_feedback_prompt\(\) to authenticated/);
});
