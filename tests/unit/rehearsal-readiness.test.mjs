import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

const showId = "12345678-1234-4123-8123-123456789012";
const pollId = "12345678-1234-4123-8123-123456789013";
const companyId = "12345678-1234-4123-8123-123456789014";

function load(path, dependencies) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; }, Date });
  return exports;
}

function database(tables, errors = {}) {
  const calls = [];
  return { calls, from(table) {
    const call = { table, filters: [], start: 0, end: Infinity };
    calls.push(call);
    const query = {
      select() { return query; }, order() { return query; },
      eq(key, value) { call.filters.push([key, value]); return query; },
      in(key, value) { call.filters.push([key, value]); return query; },
      update(value) { call.update = value; return query; },
      range(start, end) { call.start = start; call.end = end; return query; },
      maybeSingle() { call.single = true; return query; },
      then(resolve) {
        const rows = (tables[table] ?? []).slice(call.start, call.end + 1);
        return Promise.resolve({ data: call.single ? rows[0] ?? null : rows, error: errors[table] ? { message: errors[table] } : null }).then(resolve);
      },
    };
    return query;
  } };
}

test("charge les contraintes et le lieu par défaut, y compris au-delà de 1 000 disponibilités", async () => {
  const db = database({
    show_team_members: [],
    rehearsal_polls: [{ id: pollId, title: "Répétitions", default_location: "Studio principal", status: "open" }],
    rehearsal_slots: [{ id: "slot", poll_id: pollId, slot_date: "2026-12-01", start_time: "10:00:00", end_time: "13:00:00", location: null }],
    rehearsal_participants: [{ id: "participant", poll_id: pollId, display_name: "Camille", comment: "Départ à midi" }],
    rehearsal_responses: Array.from({ length: 1205 }, (_, i) => ({ participant_id: "participant", slot_id: `slot-${i}`, availability: "yes" })),
  });
  const { getShowRehearsalWorkspace } = load("lib/rehearsals.ts", {
    "@/lib/env": { hasSupabaseEnv: () => true },
    "@/lib/supabase/server": { getSupabaseServerClient: async () => db },
  });
  const result = await getShowRehearsalWorkspace(showId);
  assert.equal(result.error, null);
  assert.equal(result.polls[0].slots[0].location, "Studio principal");
  assert.equal(result.polls[0].participants[0].comment, "Départ à midi");
  assert.equal(result.polls[0].responses.length, 1205);
  for (const call of db.calls.filter((call) => call.table === "rehearsal_responses")) {
    assert.equal(call.filters[0][0], "participant.poll_id");
    assert.equal(call.filters[0][1][0], pollId);
  }
});

test("ne présente pas une erreur de chargement comme une absence de réponses", async () => {
  const db = database({ rehearsal_polls: [{ id: pollId }] }, { rehearsal_responses: "Lecture indisponible" });
  const { getShowRehearsalWorkspace } = load("lib/rehearsals.ts", {
    "@/lib/env": { hasSupabaseEnv: () => true },
    "@/lib/supabase/server": { getSupabaseServerClient: async () => db },
  });
  const result = await getShowRehearsalWorkspace(showId);
  assert.match(result.error, /Impossible de charger les disponibilités/);
  assert.equal(result.polls.length, 0);
});

function actionDependencies(db, extras = {}) {
  return {
    "next/cache": { revalidatePath: () => {} }, zod: { z },
    "@/lib/env": { hasSupabaseEnv: () => true },
    "@/lib/supabase/access": { requireWriteAccess: async () => null },
    "@/lib/supabase/server": { getSupabaseServerClient: async () => db },
    "@/lib/supabase/workspace": { getOrCreateWorkspace: async () => ({ companyId }) },
    ...extras,
  };
}

test("fermeture et réouverture vérifient compagnie et spectacle sans effacer les réponses", async () => {
  const db = database({ rehearsal_polls: [{ id: pollId, public_token: pollId, response_deadline: null }] });
  const { setRehearsalPollStatus } = load("app/(dashboard)/shows/[id]/rehearsal-actions.ts", actionDependencies(db));
  for (const status of ["closed", "open"]) {
    assert.equal((await setRehearsalPollStatus(showId, pollId, status)).ok, true);
    const write = db.calls.findLast((call) => call.update);
    assert.equal(write.update.status, status);
    assert.deepEqual(write.filters, [["id", pollId], ["show_id", showId], ["company_id", companyId]]);
  }
  assert.ok(db.calls.every((call) => call.table === "rehearsal_polls"));
});

test("une réouverture échouée ne modifie pas un sondage inaccessible ou expiré", async () => {
  for (const rows of [[], [{ id: pollId, response_deadline: "2000-01-01" }]]) {
    const db = database({ rehearsal_polls: rows });
    const { setRehearsalPollStatus } = load("app/(dashboard)/shows/[id]/rehearsal-actions.ts", actionDependencies(db));
    assert.equal((await setRehearsalPollStatus(showId, pollId, "open")).ok, false);
    assert.equal(db.calls.filter((call) => call.update).length, 0);
  }
});

test("aucun rappel ne part pour un spectacle inaccessible à la compagnie", async () => {
  const db = database({ shows: [] });
  let sent = 0;
  const { sendMaterialReminderNow } = load("app/(dashboard)/shows/[id]/material-actions.ts", actionDependencies(db, {
    "@/lib/poster-upload": {}, "@/lib/storage/server": {},
    "@/lib/material-reminders": { runMaterialReminders: async () => { sent++; return { sent: 1 }; } },
  }));
  const result = await sendMaterialReminderNow(showId, "2026-12-01");
  assert.equal(result.ok, false);
  assert.equal(sent, 0);
  assert.deepEqual(db.calls[0].filters, [["id", showId], ["company_id", companyId]]);
});
