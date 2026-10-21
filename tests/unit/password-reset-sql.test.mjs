import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageRoot = new URL("../../tmp/rehearsal-pglite/node_modules/@electric-sql/pglite/", import.meta.url);
const migration = readFileSync(new URL("../../sql/090_reusable_password_reset.sql", import.meta.url), "utf8");
const hash = () => createHash("sha256").update(randomUUID()).digest("hex");

test("liens de mot de passe : durée, lectures répétées, concurrence et atomicité avec Auth", { timeout: 90_000 }, async (suite) => {
  const { PGlite } = await import(new URL("dist/index.js", packageRoot).href);
  const db = await PGlite.create();
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0] ?? {})[0];
  const user = async ({ confirmed = true, banned = false } = {}) => {
    const id = randomUUID(), email = `${id}@example.test`;
    await db.query("insert into auth.users(id,email,email_confirmed_at,banned_until,encrypted_password) values($1,$2,case when $3 then now() else null end,case when $4 then now()+interval '1 day' else null end,'old-hash')", [id, email, confirmed, banned]);
    return { id, email };
  };
  const issue = async (u) => { const token = hash(); const result = await scalar("select issue_password_reset_link($1,$2)", [u.email, token]); return { token, ...result }; };
  const inspect = (token) => scalar("select inspect_password_reset_link($1)", [token]);
  const claim = (token) => scalar("select claim_password_reset_link($1)", [token]);
  const change = (u, c, password = "new-hash") => db.query("update auth.users set encrypted_password=$2,raw_app_meta_data=raw_app_meta_data||jsonb_build_object('tadiff_password_reset_claim',$3::text) where id=$1", [u.id, password, c.claimId]);
  try {
    await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz,banned_until timestamptz,encrypted_password text,raw_app_meta_data jsonb not null default '{}'); grant usage on schema public to anon,authenticated,service_role;");
    await db.exec(migration); await db.exec(migration);

    await suite.test("sept jours réels, aucune consommation par les lectures, aucun secret brut conservé", async () => {
      const u = await user(), r = await issue(u);
      assert.equal(r.status, "issued");
      const seconds = await scalar("select extract(epoch from expires_at-created_at)::float8 from password_reset_links where token_hash=$1", [r.token]);
      assert.ok(Math.abs(seconds - 604800) < 0.1);
      for (let i = 0; i < 10; i++) assert.equal((await inspect(r.token)).status, "ready");
      const stored = (await db.query("select used_at,claim_id from password_reset_links where token_hash=$1", [r.token])).rows[0];
      assert.deepEqual(stored, { used_at: null, claim_id: null });
      assert.equal((await issue(u)).status, "ignored");
      assert.equal((await inspect(r.token)).status, "ready");
    });
    await suite.test("inconnus, comptes non confirmés et comptes suspendus ne reçoivent pas de jeton", async () => {
      assert.equal((await issue({ email: "unknown@example.test" })).status, "ignored");
      assert.equal((await issue(await user({ confirmed: false }))).status, "ignored");
      assert.equal((await issue(await user({ banned: true }))).status, "ignored");
      assert.equal((await inspect(hash())).status, "invalid");
    });
    await suite.test("expiration serveur, changement d’email et erreur Auth n’autorisent aucun changement", async () => {
      const u = await user(), r = await issue(u), c = await claim(r.token);
      assert.equal(c.status, "claimed");
      assert.equal((await claim(r.token)).status, "busy");
      await scalar("select release_password_reset_claim($1)", [c.claimId]);
      assert.equal((await inspect(r.token)).status, "ready");
      await db.query("update password_reset_links set expires_at=now()-interval '1 second' where token_hash=$1", [r.token]);
      assert.equal((await inspect(r.token)).status, "expired");
      assert.equal((await claim(r.token)).status, "expired");
      const u2 = await user(), r2 = await issue(u2);
      await db.query("update auth.users set email='changed@example.test' where id=$1", [u2.id]);
      assert.equal((await inspect(r2.token)).status, "invalid");
    });
    await suite.test("une seule validation simultanée, consommation atomique, autre utilisateur intact", async () => {
      const u = await user(), other = await user(), r = await issue(u), otherLink = await issue(other);
      const results = await Promise.all([claim(r.token), claim(r.token)]);
      assert.deepEqual(results.map((r) => r.status).sort(), ["busy", "claimed"]);
      const c = results.find((r) => r.status === "claimed");
      await change(u, c);
      assert.equal((await inspect(r.token)).status, "used");
      assert.equal((await claim(r.token)).status, "used");
      assert.equal(await scalar("select password_reset_claim_applied($1)", [c.claimId]), true);
      assert.equal((await inspect(otherLink.token)).status, "ready");
      assert.equal(await scalar("select encrypted_password from auth.users where id=$1", [other.id]), "old-hash");
      await assert.rejects(change(u, { claimId: randomUUID() }, "replayed-hash"), /Invalid password reset claim/);
      await assert.rejects(change(u, c, "same-claim-replayed-hash"), /Invalid password reset claim/);
      assert.equal(await scalar("select raw_app_meta_data ? 'tadiff_password_reset_claim' from auth.users where id=$1", [u.id]), false);
      assert.equal(await scalar("select encrypted_password from auth.users where id=$1", [u.id]), "new-hash");
    });
    await suite.test("une requête retardée après expiration ou remplacement de réservation est rejetée", async () => {
      const u = await user(), r = await issue(u), first = await claim(r.token);
      await db.query("update password_reset_links set claim_until=now()-interval '1 second' where token_hash=$1", [r.token]);
      await assert.rejects(change(u, first), /Invalid password reset claim/);
      assert.equal((await inspect(r.token)).status, "ready");
      const second = await claim(r.token);
      await change(u, second, "second-hash");
      await assert.rejects(change(u, first, "late-hash"), /Invalid password reset claim/);
      assert.equal(await scalar("select encrypted_password from auth.users where id=$1", [u.id]), "second-hash");
    });
    await suite.test("transaction Auth réelle en deux instructions : validation et rollback d’un rejeu", async () => {
      const u = await user(), r = await issue(u), c = await claim(r.token);
      const twoStep = (claimId, password) => db.transaction(async (tx) => {
        await tx.query("update auth.users set encrypted_password=$2 where id=$1", [u.id, password]);
        await tx.query("update auth.users set raw_app_meta_data=raw_app_meta_data||jsonb_build_object('tadiff_password_reset_claim',$2::text) where id=$1", [u.id, claimId]);
      });
      await assert.rejects(twoStep(randomUUID(), "rejected-hash"), /Invalid password reset claim/);
      assert.equal(await scalar("select encrypted_password from auth.users where id=$1", [u.id]), "old-hash");
      assert.equal((await inspect(r.token)).status, "ready");
      await twoStep(c.claimId, "valid-two-step-hash");
      assert.equal(await scalar("select password_reset_claim_applied($1)", [c.claimId]), true);
      assert.equal(await scalar("select raw_app_meta_data ? 'tadiff_password_reset_claim' from auth.users where id=$1", [u.id]), false);
      await assert.rejects(twoStep(c.claimId, "replayed-hash"), /Invalid password reset claim/);
      assert.equal(await scalar("select encrypted_password from auth.users where id=$1", [u.id]), "valid-two-step-hash");
    });
    await suite.test("la modification habituelle du mot de passe désactive tous les liens, pas une simple modification de métadonnées", async () => {
      const u = await user(), r = await issue(u);
      await db.query("update auth.users set raw_app_meta_data=jsonb_build_object('provider','email') where id=$1", [u.id]);
      assert.equal((await inspect(r.token)).status, "ready");
      await db.query("update password_reset_links set created_at=now()-interval '2 minutes' where token_hash=$1", [r.token]);
      const second = await issue(u);
      assert.equal(second.status, "issued");
      await db.query("update auth.users set encrypted_password='ordinary-change' where id=$1", [u.id]);
      assert.equal((await inspect(r.token)).status, "used");
      assert.equal((await inspect(second.token)).status, "used");
    });
    await suite.test("table, RPC et fonctions privées fermées aux visiteurs et aux membres", async () => {
      for (const role of ["anon", "authenticated"]) {
        for (const sql of ["select * from password_reset_links", "select issue_password_reset_link('x@example.test',repeat('a',64))", "select inspect_password_reset_link(repeat('a',64))", "select claim_password_reset_link(repeat('a',64))", "select release_password_reset_claim(gen_random_uuid())", "select password_reset_claim_applied(gen_random_uuid())"]) {
          await assert.rejects(db.transaction(async (tx) => { await tx.exec(`set local role ${role}`); await tx.exec(sql); }), /permission denied/);
        }
      }
      await db.transaction(async (tx) => { await tx.exec("set local role service_role"); assert.equal((await tx.query("select inspect_password_reset_link($1) as result", [hash()])).rows[0].result.status, "invalid"); });
      assert.equal(await scalar("select relrowsecurity from pg_class where oid='password_reset_links'::regclass"), true);
    });
  } finally { await db.close(); }
});
