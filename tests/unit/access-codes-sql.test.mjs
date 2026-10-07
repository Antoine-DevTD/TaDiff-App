import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

// Isolated PostgreSQL/WASM verifier: no network, credentials, persistent database,
// Docker or Windows virtualisation. This optional tool is not a product dependency.
// npm install --prefix tmp/rehearsal-pglite --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
// node --test tests/unit/access-codes-sql.test.mjs
const packageRoot = new URL("../../tmp/rehearsal-pglite/node_modules/@electric-sql/pglite/", import.meta.url);
const sqlRoot = new URL("../../sql/", import.meta.url);
const source = (name) => readFileSync(new URL(name, sqlRoot), "utf8");
const digest = (value) => createHash("sha256").update(value).digest("hex");

test("codes d'accès : PostgreSQL, attribution atomique et droits réels", {
  skip: !existsSync(new URL("dist/index.js", packageRoot)), timeout: 90_000,
}, async (suite) => {
  const { PGlite } = await import(new URL("dist/index.js", packageRoot).href);
  const { pgcrypto } = await import(new URL("dist/contrib/pgcrypto.js", packageRoot).href);
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const users = new Map();
  let superadmin;
  const scalar = async (tx, sql, values = []) => Object.values((await tx.query(sql, values)).rows[0] ?? {})[0];
  const as = async (role, userId, run) => {
    assert.ok(["anon", "authenticated", "service_role"].includes(role));
    return db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({
        sub: userId || "", role, email: users.get(userId)?.email,
      })]);
      return run(tx);
    });
  };
  const createUser = async ({ email = `${randomUUID()}@example.test`, confirmed = true, companyId = null,
    role = "owner", billingStatus = "trial", compedUntil = null, stripeSubscription = null, admin = false } = {}) => {
    const id = randomUUID();
    await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,case when $3 then now() else null end,'{}')", [id, email, confirmed]);
    users.set(id, { email });
    if (companyId === true) {
      companyId = randomUUID();
      await db.query("insert into companies(id,name,billing_status,comped_until,stripe_subscription_id) values($1,'Compagnie de test',$2,$3,$4)", [companyId, billingStatus, compedUntil, stripeSubscription]);
    }
    if (companyId) await db.query("insert into profiles(id,company_id,role,is_super_admin) values($1,$2,$3,$4)", [id, companyId, role, admin]);
    return { id, email, companyId };
  };
  const createCode = async ({ kind = "trial", days = 30, targetEmail = null, maxUses = 1,
    expiresAt = "2099-12-31T23:59:59Z", actor = superadmin.id } = {}) => {
    const raw = randomBytes(32).toString("hex");
    const hash = digest(raw);
    const id = await as("authenticated", actor, (tx) => scalar(tx,
      "select public.admin_create_access_code($1,$2,$3,$4,$5,$6,$7::timestamptz,$8)",
      [hash, `••••-${raw.slice(-6)}`, "Invitation de test", kind, days, targetEmail, expiresAt, maxUses]));
    assert.match(id, /^[0-9a-f-]{36}$/);
    return { id, hash, raw };
  };
  const redeem = (user, code, companyName = "Compagnie créée par code") => as("authenticated", user.id, (tx) => scalar(tx,
    "select public.redeem_access_code($1,$2)", [code.hash, companyName]));
  const company = (id) => db.query("select id,name,billing_status,plan_code,comped_until::text,stripe_subscription_id from companies where id=$1", [id]).then((result) => result.rows[0]);
  const count = (table) => {
    assert.ok(["companies", "profiles", "access_codes", "access_code_redemptions", "pending_access_code_signups"].includes(table));
    return scalar(db, `select count(*)::int from public.${table}`);
  };
  const rejected = (result) => assert.equal(result?.ok, false, JSON.stringify(result));
  const prepare = (code, email, rateKey = digest(randomUUID())) => as("service_role", null, (tx) => scalar(tx,
    "select public.prepare_access_code_signup($1,$2,$3)", [code.hash, email, rateKey]));
  const complete = (reservationId, userId, state) => as("service_role", null, (tx) => scalar(tx,
    "select public.complete_access_code_signup($1,$2,$3)", [reservationId, userId, state]));
  const pending = (user) => as("authenticated", user.id, (tx) => scalar(tx, "select public.get_my_pending_access_code_signup()"));

  try {
    // Only Supabase's auth runtime shell and the unrelated grant-catalog seeder
    // are fixtures. Product migrations, billing helpers and RLS run unchanged.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (
        id uuid primary key, email text, email_confirmed_at timestamptz,
        raw_user_meta_data jsonb not null default '{}',
        raw_app_meta_data jsonb not null default '{}',
        is_anonymous boolean not null default false, banned_until timestamptz,
        deleted_at timestamptz, created_at timestamptz not null default now()
      );
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
      $$;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(auth.jwt()->>'sub','')::uuid
      $$;
      create function auth.role() returns text language sql stable as $$
        select auth.jwt()->>'role'
      $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid(),auth.jwt(),auth.role() to anon,authenticated,service_role;
    `);
    for (const name of ["001_initial_schema.sql", "002_fix_company_signup_rls.sql", "009_billing_status_roles.sql", "020_stripe_billing.sql"]) await db.exec(source(name));
    await db.exec(source("013_super_admin.sql").split("-- Supervision")[0]);
    await db.exec("create function public.seed_reference_grants(uuid) returns void language sql as $$ select $$");
    await db.exec(source("057_default_reference_grants.sql").slice(source("057_default_reference_grants.sql").indexOf("create or replace function public.ensure_workspace")));
    const migrationName = readdirSync(sqlRoot).find((name) => /^086_.*access.*\.sql$/.test(name));
    assert.ok(migrationName, "La migration 086 des codes d'accès doit être présente.");
    const migration = source(migrationName);
    await db.exec(migration);
    await db.exec(migration); // Idempotent reapplication must preserve existing permissions.
    superadmin = await createUser({ companyId: true, admin: true });

    await suite.test("réserve la gestion des codes au super-admin", async () => {
      const manager = await createUser({ companyId: true });
      await assert.rejects(createCode({ actor: manager.id }), /permission|admin|accès|acces/i);
      await assert.rejects(as("anon", null, (tx) => tx.query("select public.admin_revoke_access_code($1)", [randomUUID()])), /permission|admin|accès|acces/i);
      assert.equal(await count("access_codes"), 0);
    });

    await suite.test("la console peut lister les métadonnées sans lire les empreintes des codes", async () => {
      const code = await createCode();
      const visible = await as("authenticated", superadmin.id, (tx) => tx.query("select id,label,masked_code,kind,max_uses,used_count from access_codes where id=$1", [code.id]));
      assert.equal(visible.rows.length, 1);
      assert.equal(visible.rows[0].used_count, 0);
      await assert.rejects(as("authenticated", superadmin.id, (tx) => tx.query("select code_hash from access_codes where id=$1", [code.id])), /permission denied/);
      await assert.rejects(as("authenticated", superadmin.id, (tx) => tx.query("update access_codes set used_count=0 where id=$1", [code.id])), /permission denied/);
      const serialized = JSON.stringify(visible.rows);
      assert.equal(serialized.includes(code.hash), false);
      assert.equal(serialized.includes(code.raw), false);
    });

    await suite.test("un nouveau compte confirmé devient propriétaire d'une seule compagnie offerte", async () => {
      const user = await createUser();
      const code = await createCode({ targetEmail: user.email });
      const before = await count("companies");
      const result = await redeem(user, code);
      assert.equal(result.ok, true);
      assert.equal(result.newCompany, true);
      assert.equal(await count("companies"), before + 1);
      const stored = await company(result.companyId);
      assert.equal(stored.billing_status, "comped");
      assert.ok(stored.comped_until);
      assert.equal(stored.comped_until, result.accessUntil);
      assert.deepEqual((await db.query("select company_id,role,is_super_admin from profiles where id=$1", [user.id])).rows[0], {
        company_id: result.companyId, role: "owner", is_super_admin: false,
      });
      assert.equal(await as("authenticated", user.id, (tx) => scalar(tx, "select public.company_has_access($1)", [result.companyId])), true);
      const second = await redeem(user, code);
      assert.equal(second.ok, true);
      assert.equal(second.alreadyApplied, true);
      assert.equal(second.companyId, result.companyId);
      assert.equal(await count("companies"), before + 1);
    });

    await suite.test("conserve les accès permanents et les échéances plus favorables", async () => {
      for (const until of [null, "2099-01-01"]) {
        const user = await createUser({ companyId: true, billingStatus: "comped", compedUntil: until });
        const code = await createCode();
        const grants = await count("access_code_redemptions");
        const result = await redeem(user, code);
        assert.equal(result.ok, true);
        assert.equal(result.unchanged, true);
        assert.equal((await company(user.companyId)).comped_until, until);
        assert.equal(await count("access_code_redemptions"), grants);
        assert.equal((await redeem(await createUser({ companyId: true }), code)).ok, true);
      }
      const user = await createUser({ companyId: true });
      const result = await redeem(user, await createCode({ kind: "free", days: null }));
      assert.equal(result.ok, true);
      assert.equal((await company(user.companyId)).billing_status, "comped");
      assert.equal((await company(user.companyId)).comped_until, null);
    });

    await suite.test("refuse de remplacer un accès payé ou un abonnement Stripe", async () => {
      for (const options of [{ billingStatus: "active" }, { billingStatus: "past_due", stripeSubscription: `sub_${randomUUID()}` }]) {
        const user = await createUser({ companyId: true, ...options });
        const before = await company(user.companyId);
        const grants = await count("access_code_redemptions");
        rejected(await redeem(user, await createCode()));
        assert.deepEqual(await company(user.companyId), before);
        assert.equal(await count("access_code_redemptions"), grants);
      }
    });

    await suite.test("une compagnie suspendue sans abonnement peut être réactivée par son administrateur", async () => {
      const user = await createUser({ companyId: true, role: "admin", billingStatus: "cancelled" });
      const result = await redeem(user, await createCode());
      assert.equal(result.ok, true);
      assert.equal(result.companyId, user.companyId);
      assert.equal((await company(user.companyId)).billing_status, "comped");
    });

    await suite.test("un jour d'accès inclut aujourd'hui et expire avant demain", async () => {
      const user = await createUser({ companyId: true });
      const result = await redeem(user, await createCode({ days: 1 }));
      assert.equal(result.ok, true);
      assert.equal(result.accessUntil, await scalar(db, "select current_date::text"));
      assert.equal(await as("authenticated", user.id, (tx) => scalar(tx, "select public.company_has_access($1)", [user.companyId])), true);
      await db.query("update companies set comped_until=current_date-1 where id=$1", [user.companyId]);
      assert.equal(await as("authenticated", user.id, (tx) => scalar(tx, "select public.company_has_access($1)", [user.companyId])), false);
    });

    await suite.test("refuse les membres et les rôles lecture seule sans consommer le code", async () => {
      const owner = await createUser({ companyId: true });
      const code = await createCode();
      for (const role of ["member", "readonly"]) {
        const user = await createUser({ companyId: owner.companyId, role });
        rejected(await redeem(user, code));
      }
      assert.equal((await company(owner.companyId)).billing_status, "trial");
      assert.equal((await redeem(owner, code)).ok, true);
    });

    await suite.test("refuse un email non confirmé et l'email différent d'un code nominatif", async () => {
      const pending = await createUser({ confirmed: false });
      const other = await createUser();
      const before = await count("companies");
      rejected(await redeem(pending, await createCode()));
      rejected(await redeem(other, await createCode({ targetEmail: pending.email })));
      assert.equal(await count("companies"), before);
      assert.equal(await scalar(db, "select count(*)::int from profiles where id=any($1::uuid[])", [[pending.id, other.id]]), 0);
    });

    await suite.test("respecte la limite d'utilisation entre deux compagnies", async () => {
      const first = await createUser({ companyId: true });
      const second = await createUser({ companyId: true });
      const code = await createCode({ maxUses: 1 });
      assert.equal((await redeem(first, code)).ok, true);
      rejected(await redeem(second, code));
      assert.equal((await company(second.companyId)).billing_status, "trial");
      assert.equal((await redeem(first, code)).alreadyApplied, true);
    });

    await suite.test("deux responsables de la même compagnie partagent une seule utilisation", async () => {
      const owner = await createUser({ companyId: true });
      const manager = await createUser({ companyId: owner.companyId, role: "admin" });
      const code = await createCode({ maxUses: 2 });
      const before = await count("access_code_redemptions");
      assert.equal((await redeem(owner, code)).ok, true);
      const result = await redeem(manager, code);
      assert.equal(result.ok, true);
      assert.equal(result.alreadyApplied, true);
      assert.equal(await count("access_code_redemptions"), before + 1);
      assert.equal((await redeem(await createUser({ companyId: true }), code)).ok, true);
    });

    await suite.test("une erreur de journalisation annule toute l'attribution", async () => {
      const user = await createUser();
      const code = await createCode();
      const before = { companies: await count("companies"), profiles: await count("profiles"), redemptions: await count("access_code_redemptions") };
      await db.exec(`
        create function public.fixture_reject_redemption() returns trigger language plpgsql as $$
        begin raise exception 'fixture_grant_failure'; end $$;
        create trigger fixture_reject_redemption before insert on public.access_code_redemptions
        for each row execute function public.fixture_reject_redemption();
      `);
      try {
        await assert.rejects(redeem(user, code), /fixture_grant_failure/);
      } finally {
        await db.exec("drop trigger fixture_reject_redemption on public.access_code_redemptions; drop function public.fixture_reject_redemption()");
      }
      assert.equal(await count("companies"), before.companies);
      assert.equal(await count("profiles"), before.profiles);
      assert.equal(await count("access_code_redemptions"), before.redemptions);
      assert.equal((await redeem(user, code)).ok, true);
    });

    await suite.test("révoque un code sans retirer les accès déjà attribués", async () => {
      const first = await createUser({ companyId: true });
      const second = await createUser({ companyId: true });
      const code = await createCode({ maxUses: 2 });
      assert.equal((await redeem(first, code)).ok, true);
      const before = await company(first.companyId);
      assert.equal(await as("authenticated", superadmin.id, (tx) => scalar(tx, "select public.admin_revoke_access_code($1)", [code.id])), true);
      rejected(await redeem(second, code));
      assert.deepEqual(await company(first.companyId), before);
    });

    await suite.test("l'expiration d'un code ne crée pas de compagnie", async () => {
      const user = await createUser();
      const code = await createCode();
      await db.query("update access_codes set expires_at=now()-interval '1 minute' where id=$1", [code.id]);
      const before = await count("companies");
      rejected(await redeem(user, code));
      assert.equal(await count("companies"), before);
    });

    await suite.test("la limite utilisateur survit aux codes erronés successifs", async () => {
      const user = await createUser({ companyId: true });
      for (let attempt = 0; attempt < 10; attempt++) {
        const result = await redeem(user, { hash: digest(randomUUID()) });
        assert.equal(result.ok, false);
        assert.equal(result.status, "invalid_code");
      }
      const limited = await redeem(user, await createCode());
      assert.equal(limited.ok, false);
      assert.equal(limited.status, "rate_limited");
      assert.equal((await company(user.companyId)).billing_status, "trial");
      assert.equal((await redeem(await createUser({ companyId: true }), await createCode())).ok, true);
    });

    await suite.test("l'inscription est limitée par email et par adresse réseau", async () => {
      const invalid = { hash: digest(randomUUID()) };
      const email = `${randomUUID()}@example.test`;
      for (let attempt = 0; attempt < 3; attempt++) assert.equal((await prepare(invalid, email)).status, "invalid_code");
      assert.equal((await prepare(invalid, email)).status, "rate_limited");
      const rateKey = digest(randomUUID());
      for (let attempt = 0; attempt < 10; attempt++) assert.equal((await prepare(invalid, `${randomUUID()}@example.test`, rateKey)).status, "invalid_code");
      assert.equal((await prepare(invalid, `${randomUUID()}@example.test`, rateKey)).status, "rate_limited");
    });

    await suite.test("le parcours réservé interdit ensure_workspace avant la rédemption", async () => {
      const email = `${randomUUID()}@example.test`;
      const code = await createCode({ targetEmail: email });
      const reservation = await prepare(code, email);
      assert.equal(reservation.ok, true);
      assert.match(reservation.reservationId, /^[0-9a-f-]{36}$/);
      const user = await createUser({ email, confirmed: false });
      assert.equal(await complete(reservation.reservationId, user.id, "confirmation_sent"), true);
      assert.equal(await pending(user), true);
      const before = await count("companies");
      await assert.rejects(as("authenticated", user.id, (tx) => scalar(tx, "select public.ensure_workspace('Espace contourné')")), /code|confirm|accès|acces|inscription/i);
      assert.equal((await redeem(user, code)).status, "email_confirmation_required");
      await db.query("update auth.users set email_confirmed_at=now() where id=$1", [user.id]);
      await assert.rejects(as("authenticated", user.id, (tx) => scalar(tx, "select public.ensure_workspace('Espace contourné')")), /code|confirm|accès|acces|inscription/i);
      assert.equal(await count("companies"), before);
      const result = await redeem(user, code, "Compagnie confirmée");
      assert.equal(result.ok, true);
      assert.equal(await pending(user), false);
      assert.equal(await as("authenticated", user.id, (tx) => scalar(tx, "select public.ensure_workspace('Autre nom')")), result.companyId);
      assert.equal(await count("companies"), before + 1);
    });

    await suite.test("l'inscription bloquée ne se transforme pas en accès confirmé", async () => {
      const email = `${randomUUID()}@example.test`;
      const code = await createCode({ targetEmail: email });
      const reservation = await prepare(code, email);
      assert.equal(reservation.ok, true);
      const user = await createUser({ email });
      assert.equal(await complete(reservation.reservationId, user.id, "blocked"), true);
      const before = await count("companies");
      const result = await redeem(user, code);
      assert.equal(result.ok, false);
      assert.equal(result.status, "registration_blocked");
      await assert.rejects(as("authenticated", user.id, (tx) => scalar(tx, "select public.ensure_workspace('Contournement')")), /code|confirm|accès|acces|inscription/i);
      assert.equal(await count("companies"), before);
    });

    await suite.test("une inscription interrompue est protégée avant même son rattachement au compte", async () => {
      const email = `${randomUUID()}@example.test`;
      const code = await createCode({ targetEmail: email });
      const reservation = await prepare(code, email);
      assert.equal(reservation.ok, true);
      const user = await createUser({ email });
      const before = await count("companies");
      assert.equal(await pending(user), true);
      await assert.rejects(as("authenticated", user.id, (tx) => scalar(tx, "select public.ensure_workspace('Inscription interrompue')")), /access_code_required/);
      assert.equal((await redeem(user, code)).status, "registration_blocked");
      // The sign-up request may have timed out after Auth created the user.
      // Cancelling cannot erase the gate in this uncertain state.
      assert.equal(await complete(reservation.reservationId, null, "cancel"), true);
      assert.equal(await pending(user), true);
      assert.equal((await redeem(user, code)).status, "registration_blocked");
      assert.equal(await scalar(db, "select state from pending_access_code_signups where id=$1", [reservation.reservationId]), "blocked");
      assert.equal(await count("companies"), before);
    });

    await suite.test("la finalisation serveur ne rattache pas une préparation à l'email d'un autre compte", async () => {
      const email = `${randomUUID()}@example.test`;
      const code = await createCode({ targetEmail: email });
      const reservation = await prepare(code, email);
      assert.equal(reservation.ok, true);
      const other = await createUser();
      assert.equal(await complete(reservation.reservationId, other.id, "confirmation_sent"), false);
      assert.deepEqual((await db.query("select state,user_id from pending_access_code_signups where id=$1", [reservation.reservationId])).rows[0], { state: "reserved", user_id: null });
    });

    await suite.test("annuler une préparation retire sa garde sans ouvrir de compte ni consommer le code", async () => {
      const code = await createCode();
      const before = { pending: await count("pending_access_code_signups"), companies: await count("companies"), redemptions: await count("access_code_redemptions") };
      const reservation = await prepare(code, `${randomUUID()}@example.test`);
      assert.equal(reservation.ok, true);
      assert.equal(await count("pending_access_code_signups"), before.pending + 1);
      assert.equal(await complete(reservation.reservationId, null, "cancel"), true);
      assert.equal(await count("pending_access_code_signups"), before.pending);
      assert.equal(await count("companies"), before.companies);
      assert.equal(await count("access_code_redemptions"), before.redemptions);
      assert.equal((await redeem(await createUser({ companyId: true }), code)).ok, true);
    });

    await suite.test("bloque les anciens chemins de création directe privilégiée", async () => {
      const user = await createUser();
      for (const query of [
        ["insert into profiles(id,company_id,role,is_super_admin) values($1,$2,'owner',true)", [user.id, superadmin.companyId]],
        ["insert into companies(name,billing_status,comped_until) values('Intrusion','comped',null)", []],
      ]) await assert.rejects(as("authenticated", user.id, (tx) => tx.query(...query)), /permission denied|row-level security/);
      assert.equal(await scalar(db, "select count(*)::int from profiles where id=$1", [user.id]), 0);
    });

    await suite.test("les colonnes d'abonnement et le rôle restent non modifiables directement", async () => {
      const owner = await createUser({ companyId: true });
      await assert.rejects(as("authenticated", owner.id, (tx) => tx.query("update companies set billing_status='comped' where id=$1", [owner.companyId])), /permission denied/);
      await assert.rejects(as("authenticated", owner.id, (tx) => tx.query("update profiles set is_super_admin=true,role='owner' where id=$1", [owner.id])), /permission denied/);
    });

    await suite.test("les tables sensibles ne sont pas lisibles par un utilisateur ordinaire", async () => {
      const user = await createUser({ companyId: true });
      for (const table of ["access_codes", "access_code_redemptions", "access_code_attempts", "pending_access_code_signups"]) {
        for (const role of ["anon", "authenticated"]) {
          try {
            const result = await as(role, role === "anon" ? null : user.id, (tx) => tx.query(`select * from public.${table}`));
            assert.deepEqual(result.rows, [], `${role} must not read ${table}`);
          } catch (error) { assert.match(error.message, /permission denied/); }
        }
      }
    });

    await suite.test("les réservations serveur refusent l'appel direct depuis un navigateur", async () => {
      const user = await createUser();
      const code = await createCode();
      for (const role of ["anon", "authenticated"]) {
        await assert.rejects(as(role, role === "anon" ? null : user.id, (tx) => tx.query(
          "select public.prepare_access_code_signup($1,$2,$3)", [code.hash, user.email, digest(randomUUID())])), /permission denied/);
        await assert.rejects(as(role, role === "anon" ? null : user.id, (tx) => tx.query(
          "select public.complete_access_code_signup($1,$2,$3)", [randomUUID(), user.id, "confirmation_sent"])), /permission denied/);
      }
    });

    await suite.test("la réapplication de la migration préserve les attributions et les droits", async () => {
      const user = await createUser({ companyId: true });
      const code = await createCode();
      const result = await redeem(user, code);
      assert.equal(result.ok, true);
      const before = { company: await company(user.companyId), grants: await count("access_code_redemptions"), codes: await count("access_codes") };
      await db.exec(migration);
      assert.deepEqual(await company(user.companyId), before.company);
      assert.equal(await count("access_code_redemptions"), before.grants);
      assert.equal(await count("access_codes"), before.codes);
      assert.equal((await redeem(user, code)).alreadyApplied, true);
      await assert.rejects(as("authenticated", superadmin.id, (tx) => tx.query("select code_hash from access_codes")), /permission denied/);
      await assert.rejects(as("authenticated", user.id, (tx) => tx.query("insert into companies(name) values('Contournement')")), /permission denied/);
    });
  } finally { await db.close(); }
});
