import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// Optional verifier, installed outside the product dependencies:
// npm install --prefix tmp/rehearsal-pglite --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
// node --test tests/unit/rehearsal-sql-embedded.test.mjs
// PostgreSQL runs in WebAssembly memory: no Docker, Windows virtualisation,
// network connection, production credentials, mail or persistent database.
const packageRoot = new URL("../../tmp/rehearsal-pglite/node_modules/@electric-sql/pglite/", import.meta.url);
const source = (file) => readFileSync(new URL(`../../sql/${file}`, import.meta.url), "utf8");

test("PostgreSQL embarqué : RPC répétitions, agenda et isolation réelle par rôle", {
  skip: !existsSync(new URL("dist/index.js", packageRoot)), timeout: 60_000,
}, async (suite) => {
  const { PGlite } = await import(new URL("dist/index.js", packageRoot).href);
  const { pgcrypto } = await import(new URL("dist/contrib/pgcrypto.js", packageRoot).href);
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const owner = randomUUID(), outsider = randomUUID(), reader = randomUUID();
  const company = randomUUID(), otherCompany = randomUUID(), show = randomUUID();
  const person = randomUUID(), member = randomUUID();
  let poll, token, slots, participant;

  async function as(role, userId, run) {
    assert.ok(["authenticated", "anon"].includes(role));
    return db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId || "", role })]);
      return run(tx);
    });
  }
  const scalar = async (tx, sql, values = []) => Object.values((await tx.query(sql, values)).rows[0])[0];
  const availability = () => JSON.stringify(slots.map((id) => ({ slotId: id, availability: "yes" })));
  const createPoll = (tx, targetShow = show) => scalar(tx,
    "select public.create_rehearsal_poll($1, $2, $3, null, true, $4::uuid[], $5::jsonb)",
    [targetShow, "Répétitions de novembre", "Studio principal", [member], JSON.stringify([
      { date: "2027-11-01", startTime: "10:00", endTime: "13:00", location: "" },
      { date: "2027-11-02", startTime: "14:00", endTime: "17:00", location: "Salle annexe" },
    ])]);

  try {
    // Only the Supabase runtime shell is simulated. Product migrations,
    // is_company_member(), RLS policies and all tested RPCs are unmodified.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
    `);
    for (const migration of ["001_initial_schema.sql", "072_repair_calendar_events_data_api.sql", "080_show_teams_and_rehearsal_polls.sql", "081_show_material_roadmap.sql", "082_repair_rehearsal_response.sql"]) await db.exec(source(migration));
    await db.exec("grant select, insert, update, delete on public.companies, public.profiles, public.shows, public.contacts to authenticated");
    for (const id of [owner, outsider, reader]) await db.query("insert into auth.users(id) values ($1)", [id]);
    await db.query("insert into companies(id,name) values ($1,'Compagnie A'),($2,'Compagnie B')", [company, otherCompany]);
    await db.query("insert into profiles(id,company_id,role) values ($1,$2,'owner'),($3,$4,'owner'),($5,$2,'readonly')", [owner, company, outsider, otherCompany, reader]);
    await db.query("insert into shows(id,company_id,title,discipline) values ($1,$2,'Spectacle A','Théâtre')", [show, company]);
    await db.query("insert into contacts(id,company_id,name,organization) values ($1,$2,'Camille','')", [person, company]);
    await db.query("insert into show_team_members(id,company_id,show_id,contact_id,job_title) values ($1,$2,$3,$4,'Comédienne')", [member, company, show, person]);

    await suite.test("crée les créneaux et les participants avec la vraie RPC", async () => {
      poll = await as("authenticated", owner, (tx) => createPoll(tx));
      token = await scalar(db, "select public_token from rehearsal_polls where id=$1", [poll]);
      slots = (await db.query("select id from rehearsal_slots where poll_id=$1 order by slot_date", [poll])).rows.map((row) => row.id);
      participant = await scalar(db, "select id from rehearsal_participants where poll_id=$1", [poll]);
      assert.equal(slots.length, 2);
      assert.ok(participant);
    });
    await suite.test("le lien public fournit les lieux effectifs sans accès direct aux tables", async () => {
      const data = await as("anon", null, (tx) => scalar(tx, "select get_public_rehearsal_poll($1)", [token]));
      assert.equal(data.slots[0].location, "Studio principal");
      assert.equal(data.slots[1].location, "Salle annexe");
      const absent = await as("anon", null, (tx) => scalar(tx, "select get_public_rehearsal_poll($1)", [randomUUID()]));
      assert.equal(absent, null);
      await assert.rejects(as("anon", null, (tx) => tx.query("select * from rehearsal_polls")), /permission denied/);
    });
    await suite.test("enregistre puis remplace la réponse sans doublon et conserve le commentaire", async () => {
      for (const comment of ["Premier message", "Départ à midi"]) {
        const response = await as("anon", null, (tx) => scalar(tx, "select submit_public_rehearsal_response($1,$2,'',$3,$4::jsonb)", [token, participant, comment, availability()]));
        assert.equal(response.participantId, participant);
      }
      assert.equal(await scalar(db, "select count(*)::int from rehearsal_responses where participant_id=$1", [participant]), 2);
      assert.equal(await scalar(db, "select comment from rehearsal_participants where id=$1", [participant]), "Départ à midi");
    });
    await suite.test("rejette une réponse incomplète sans effacer la précédente", async () => {
      await assert.rejects(as("anon", null, (tx) => tx.query("select submit_public_rehearsal_response($1,$2,'','',$3::jsonb)", [token, participant, JSON.stringify([{ slotId: slots[0], availability: "yes" }])])), /chaque creneau/);
      assert.equal(await scalar(db, "select count(*)::int from rehearsal_responses where participant_id=$1", [participant]), 2);
    });
    await suite.test("une autre compagnie ne lit, ne modifie ni ne confirme le sondage", async () => {
      const invisible = await as("authenticated", outsider, (tx) => tx.query("select * from rehearsal_polls where id=$1", [poll]));
      assert.deepEqual(invisible.rows, []);
      const untouched = await as("authenticated", outsider, (tx) => tx.query("update rehearsal_polls set status='closed' where id=$1 returning id", [poll]));
      assert.equal(untouched.rows.length, 0);
      await assert.rejects(as("authenticated", outsider, (tx) => createPoll(tx)), /Spectacle introuvable/);
      await assert.rejects(as("authenticated", outsider, (tx) => tx.query("select confirm_rehearsal_slots($1,$2,$3::uuid[])", [show, poll, slots])), /Sondage introuvable/);
    });
    await suite.test("le rôle lecture seule ne crée ni ne confirme de répétition", async () => {
      const visible = await as("authenticated", reader, (tx) => tx.query("select id from rehearsal_polls where id=$1", [poll]));
      assert.equal(visible.rows.length, 1);
      await assert.rejects(as("authenticated", reader, (tx) => createPoll(tx)), /row-level security/);
      assert.equal(await as("authenticated", reader, (tx) => scalar(tx, "select confirm_rehearsal_slots($1,$2,$3::uuid[])", [show, poll, slots])), 0);
      assert.equal(await scalar(db, "select count(*)::int from calendar_events"), 0);
    });
    await suite.test("la confirmation dans l’agenda est idempotente et reprend lieux/horaires", async () => {
      const confirm = () => as("authenticated", owner, (tx) => scalar(tx, "select confirm_rehearsal_slots($1,$2,$3::uuid[])", [show, poll, slots]));
      assert.equal(await confirm(), 2);
      assert.equal(await confirm(), 0);
      const events = (await db.query("select location,kind,start_time from calendar_events order by event_date")).rows;
      assert.equal(events.length, 2);
      assert.deepEqual(events.map((row) => row.location), ["Studio principal", "Salle annexe"]);
      assert.equal(events[0].kind, "rehearsal");
      assert.equal(events[0].start_time, "10:00:00");
    });
    await suite.test("fermer bloque le lien puis rouvrir conserve réponses et agenda", async () => {
      await as("authenticated", owner, (tx) => tx.query("update rehearsal_polls set status='closed' where id=$1", [poll]));
      await assert.rejects(as("anon", null, (tx) => tx.query("select submit_public_rehearsal_response($1,$2,'','',$3::jsonb)", [token, participant, availability()])), /plus de reponses/);
      await as("authenticated", owner, (tx) => tx.query("update rehearsal_polls set status='open' where id=$1", [poll]));
      await as("anon", null, (tx) => tx.query("select submit_public_rehearsal_response($1,$2,'','',$3::jsonb)", [token, participant, availability()]));
      assert.equal(await scalar(db, "select count(*)::int from calendar_events"), 2);
      assert.equal(await scalar(db, "select count(*)::int from rehearsal_responses"), 2);
    });
    await suite.test("le matériel et ses affectations restent isolés par compagnie", async () => {
      const item = await as("authenticated", owner, (tx) => scalar(tx, "insert into show_material_items(company_id,show_id,name) values($1,$2,'Valise') returning id", [company, show]));
      const inaccessible = await as("authenticated", outsider, (tx) => tx.query("select id from show_material_items where id=$1", [item]));
      assert.deepEqual(inaccessible.rows, []);
      await assert.rejects(as("authenticated", outsider, (tx) => tx.query("insert into show_material_items(company_id,show_id,name) values($1,$2,'Objet intrus')", [otherCompany, show])), /foreign key constraint/);
      await assert.rejects(as("authenticated", reader, (tx) => tx.query("insert into show_material_requirements(company_id,show_id,material_item_id,performance_date) values($1,$2,$3,'2027-11-01')", [company, show, item])), /row-level security/);
    });
  } finally { await db.close(); }
});
