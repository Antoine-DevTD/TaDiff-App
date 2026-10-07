import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const packageRoot = new URL("../../tmp/rehearsal-pglite/node_modules/@electric-sql/pglite/", import.meta.url);
const source = (name) => readFileSync(new URL(`../../sql/${name}`, import.meta.url), "utf8");

test("Stripe : transactions PostgreSQL réelles, réservations et événements", {
  skip: !existsSync(new URL("dist/index.js", packageRoot)), timeout: 90_000,
}, async (suite) => {
  const { PGlite } = await import(new URL("dist/index.js", packageRoot).href);
  const { pgcrypto } = await import(new URL("dist/contrib/pgcrypto.js", packageRoot).href);
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const attempts = new Map();
  const scalar = async (tx, sql, args = []) => Object.values((await tx.query(sql, args)).rows[0] ?? {})[0];
  const as = (role, run) => db.transaction(async (tx) => {
    assert.ok(["anon", "authenticated", "service_role"].includes(role));
    await tx.exec(`set local role ${role}`); return run(tx);
  });
  const rpc = (sql, args = []) => as("service_role", (tx) => scalar(tx, sql, args));
  const create = async ({ status = "pending_payment", role = "owner", confirmed = true, customer = null, subscription = null } = {}) => {
    const companyId = randomUUID(), userId = randomUUID();
    await db.query("insert into auth.users(id,email_confirmed_at) values($1,case when $2 then now() else null end)", [userId, confirmed]);
    await db.query("insert into companies(id,name,billing_status,stripe_customer_id,stripe_subscription_id) values($1,'QA Stripe',$2,$3,$4)", [companyId, status, customer, subscription]);
    await db.query("insert into profiles(id,company_id,role) values($1,$2,$3)", [userId, companyId, role]);
    return { companyId, userId };
  };
  const prepare = (user, plan = "beta", price = "price_beta") => rpc("select prepare_stripe_checkout($1,$2,$3,$4)", [user.companyId, user.userId, plan, price]);
  const bind = (attempt, customer = "cus_" + randomUUID()) => rpc("select bind_stripe_checkout_customer($1,$2)", [attempt.attemptId, customer]).then((result) => ({ result, customer }));
  const read = (id) => db.query("select billing_status,stripe_customer_id,stripe_subscription_id,stripe_last_event_created from companies where id=$1", [id]).then((x) => x.rows[0]);
  const apply = (user, { eventId = "evt_" + randomUUID(), created = 100, customer, subscription = "sub_" + user.companyId,
    price = "price_beta", status = "active", paid = true, period = "2027-01-01T00:00:00Z" } = {}) => rpc(
    "select apply_stripe_billing_event($1,$2,'customer.subscription.updated',$3,$4,$5,$6,'beta',$7,$8,$9,$10)",
    [eventId, created, user.companyId, customer, subscription, price, status, paid, period, attempts.get(user.companyId) ?? null]);
  const prepared = async (options) => {
    const user = await create(options), attempt = await prepare(user), { customer } = await bind(attempt);
    attempts.set(user.companyId, attempt.attemptId);
    return { user, attempt, customer };
  };
  try {
    // Auth shell and the upstream billing-state addition are fixtures. Migration
    // 088 itself is executed unchanged twice; 087 is independently tested.
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
    `);
    await db.exec(source("001_initial_schema.sql"));
    await db.exec(source("009_billing_status_roles.sql"));
    await db.exec(source("020_stripe_billing.sql"));
    await db.exec("alter table companies drop constraint companies_billing_status_check; alter table companies add constraint companies_billing_status_check check (billing_status in ('pending_payment','trial','active','comped','past_due','cancelled'))");
    const migration = source("088_stripe_checkout_and_events.sql");
    await db.exec(migration); await db.exec(migration);

    await suite.test("tables privées et RPC inaccessibles aux clients anonymes et connectés", async () => {
      const user = await create();
      for (const role of ["anon", "authenticated"]) {
        await assert.rejects(as(role, (tx) => tx.query("select * from stripe_checkout_attempts")), /permission denied/);
        await assert.rejects(as(role, (tx) => tx.query("select * from stripe_webhook_events")), /permission denied/);
        await assert.rejects(as(role, (tx) => tx.query("select prepare_stripe_checkout($1,$2,'beta','price_beta')", [user.companyId, user.userId])), /permission denied/);
        await assert.rejects(as(role, (tx) => tx.query("select apply_stripe_billing_event('evt_no',1,'test',$1,'cus_x','sub_x','price_beta','beta','active',true,null)", [user.companyId])), /permission denied/);
      }
    });
    await suite.test("rôle, email confirmé et compagnie vérifiés même dans la transaction serveur", async () => {
      for (const options of [{ role: "readonly" }, { role: "member" }, { confirmed: false }]) {
        assert.equal((await prepare(await create(options))).status, "forbidden");
      }
      const owner = await create(), foreign = await create();
      assert.equal((await prepare({ ...owner, companyId: foreign.companyId })).status, "forbidden");
      assert.equal((await prepare(owner, "pro", "price_pro")).status, "invalid_price");
      assert.equal((await prepare(await create({ role: "admin" }))).ok, true);
    });
    await suite.test("réserver deux fois conserve la même tentative et un changement de prix est bloqué", async () => {
      const user = await create(), first = await prepare(user), second = await prepare(user);
      assert.equal(first.attemptId, second.attemptId);
      assert.equal((await prepare(user, "beta", "price_other")).status, "existing_checkout");
      assert.equal(await scalar(db, "select count(*)::int from stripe_checkout_attempts where company_id=$1", [user.companyId]), 1);
    });
    await suite.test("customer stable ; persistance et reprise de la session", async () => {
      const { user, attempt, customer } = await prepared();
      assert.equal((await bind(attempt, customer)).result.ok, true);
      assert.equal((await bind(attempt)).result.ok, false);
      const sessionId = "cs_" + randomUUID();
      assert.equal((await rpc("select finish_stripe_checkout($1,$2,'https://checkout.stripe.com/test','2027-01-01')", [attempt.attemptId, sessionId])).ok, true);
      assert.equal((await prepare(user)).sessionId, sessionId);
      assert.equal((await rpc("select finish_stripe_checkout($1,'cs_other','https://checkout.stripe.com/test','2027-01-01')", [attempt.attemptId])).ok, false);
      assert.equal((await read(user.companyId)).billing_status, "pending_payment");
    });
    await suite.test("paiement non confirmé reste bloqué ; incomplet peut reprendre la même session", async () => {
      const { user, attempt, customer } = await prepared();
      await apply(user, { customer, paid: false });
      assert.equal((await read(user.companyId)).billing_status, "pending_payment");
      assert.equal((await prepare(user)).attemptId, attempt.attemptId);
      await apply(user, { customer, status: "past_due", paid: false, created: 101 });
      assert.equal((await read(user.companyId)).billing_status, "pending_payment");
    });
    await suite.test("paiement réel active une fois, ferme la tentative et bloque un second abonnement", async () => {
      const { user, customer } = await prepared(); const eventId = "evt_" + randomUUID();
      assert.equal((await apply(user, { customer, eventId })).status, "applied");
      assert.equal((await apply(user, { customer, eventId })).status, "duplicate");
      assert.equal((await read(user.companyId)).billing_status, "active");
      assert.equal((await prepare(user)).status, "existing_subscription");
      assert.equal(await scalar(db, "select count(*)::int from stripe_webhook_events where event_id=$1", [eventId]), 1);
      assert.equal(await scalar(db, "select status from stripe_checkout_attempts where company_id=$1", [user.companyId]), "completed");
    });
    await suite.test("résiliation préservée face à un événement ancien ou au même instant", async () => {
      const { user, customer } = await prepared();
      await apply(user, { customer, created: 200 });
      await apply(user, { customer, status: "cancelled", created: 210 });
      assert.equal((await apply(user, { customer, created: 205 })).status, "stale");
      assert.equal((await apply(user, { customer, created: 210 })).status, "stale");
      assert.equal((await read(user.companyId)).billing_status, "cancelled");
    });
    await suite.test("paiement étranger, prix non réservé et second abonnement ne modifient pas la compagnie", async () => {
      const { user, customer } = await prepared();
      assert.equal((await apply(user, { customer: "cus_other" })).status, "unrelated");
      assert.equal((await apply(user, { customer, price: "price_other" })).status, "unrelated");
      await apply(user, { customer });
      assert.equal((await apply(user, { customer, subscription: "sub_other", status: "cancelled", created: 300 })).status, "unrelated");
      assert.equal((await read(user.companyId)).billing_status, "active");
    });
    await suite.test("session expirée peut être remplacée, sans supprimer la preuve historique", async () => {
      const { user, attempt } = await prepared();
      assert.equal((await rpc("select expire_stripe_checkout($1,'cs_expired')", [attempt.attemptId])).ok, true);
      assert.notEqual((await prepare(user)).attemptId, attempt.attemptId);
      assert.equal(await scalar(db, "select count(*)::int from stripe_checkout_attempts where company_id=$1", [user.companyId]), 2);
    });
    await suite.test("premier abonnement annulé reste sans accès ; reprise et ancien événement isolés", async () => {
      const { user, attempt, customer } = await prepared();
      await apply(user, { customer, status: "past_due", paid: false, created: 100 });
      await apply(user, { customer, status: "cancelled", paid: false, created: 110 });
      assert.equal((await read(user.companyId)).billing_status, "pending_payment");
      assert.equal((await read(user.companyId)).stripe_subscription_id, null);
      const next = await prepare(user);
      assert.equal(next.ok, true); assert.notEqual(next.attemptId, attempt.attemptId);
      assert.equal((await apply(user, { customer, created: 120 })).status, "unrelated");
      assert.equal((await read(user.companyId)).billing_status, "pending_payment");
      attempts.set(user.companyId, next.attemptId);
      await apply(user, { customer, subscription: "sub_new", created: 130 });
      assert.equal((await read(user.companyId)).billing_status, "active");
    });
    await suite.test("accès offert préservé ; abonnement existant synchronisable sans nouvelle réservation", async () => {
      const offered = await create({ status: "comped", customer: "cus_offered", subscription: "sub_offered" });
      await apply(offered, { customer: "cus_offered", subscription: "sub_offered", status: "past_due", paid: false });
      assert.equal((await read(offered.companyId)).billing_status, "comped");
      const existing = await create({ status: "active", customer: "cus_existing", subscription: "sub_existing" });
      await apply(existing, { customer: "cus_existing", subscription: "sub_existing", status: "past_due", paid: false });
      assert.equal((await read(existing.companyId)).billing_status, "past_due");
    });
    await suite.test("échec de mise à jour annule aussi le registre et autorise le rejeu", async () => {
      const { user, customer } = await prepared(); const eventId = "evt_" + randomUUID();
      await db.exec("create function reject_billing_test() returns trigger language plpgsql as $$ begin raise exception 'write rejected'; end $$; create trigger reject_billing_test before update on companies for each row execute function reject_billing_test()");
      await assert.rejects(apply(user, { customer, eventId }), /write rejected/);
      assert.equal(await scalar(db, "select count(*)::int from stripe_webhook_events where event_id=$1", [eventId]), 0);
      await db.exec("drop trigger reject_billing_test on companies; drop function reject_billing_test()");
      assert.equal((await apply(user, { customer, eventId })).status, "applied");
    });
  } finally { await db.close(); }
});
