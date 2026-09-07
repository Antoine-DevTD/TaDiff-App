import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("les équipes et sondages restent isolés par compagnie", async () => {
  const migration = await source("sql/080_show_teams_and_rehearsal_polls.sql");
  for (const table of ["show_team_members", "rehearsal_polls", "rehearsal_slots", "rehearsal_participants", "rehearsal_responses"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /public\.is_company_member\(company_id\)/i);
  assert.match(migration, /revoke all on table[\s\S]+from anon/i);
});

test("le lien public ne donne accès qu'au sondage identifié par son jeton", async () => {
  const migration = await source("sql/080_show_teams_and_rehearsal_polls.sql");
  assert.match(migration, /where p\.public_token = p_token and p\.status <> 'draft'/i);
  assert.match(migration, /where public_token = p_token and status = 'open'/i);
  assert.match(migration, /revoke all on function public\.get_public_rehearsal_poll\(uuid\) from public/i);
  assert.match(migration, /grant execute on function public\.submit_public_rehearsal_response[\s\S]+to anon, authenticated/i);
});

test("la confirmation crée de vraies répétitions dans l'agenda", async () => {
  const actions = await source("app/(dashboard)/shows/[id]/rehearsal-actions.ts");
  assert.match(actions, /rpc\("confirm_rehearsal_slots"/);
  const migration = await source("sql/080_show_teams_and_rehearsal_polls.sql");
  assert.match(migration, /insert into calendar_events[\s\S]+,'rehearsal'/);
  assert.match(actions, /revalidatePath\("\/calendar"\)/);
});
