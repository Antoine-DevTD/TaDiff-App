import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// Real PostgreSQL/WASM transactions and policies, isolated from hosted Auth,
// payments and email. No Docker or mutation of the user's database.
const packageRoot = new URL("../../tmp/rehearsal-pglite/node_modules/@electric-sql/pglite/", import.meta.url);
const source = (name) => readFileSync(new URL(`../../sql/${name}`, import.meta.url), "utf8");

test("accès bêta offerts : attribution, identité et supervision protégées", {
  skip: !existsSync(new URL("dist/index.js", packageRoot)), timeout: 90_000,
}, async (suite) => {
  const { PGlite } = await import(new URL("dist/index.js", packageRoot).href);
  const { pgcrypto } = await import(new URL("dist/contrib/pgcrypto.js", packageRoot).href);
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const scalar = async (tx, text, args = []) => Object.values((await tx.query(text, args)).rows[0] ?? {})[0];
  const as = (role, user, run) => db.transaction(async (tx) => {
    assert.ok(["anon", "authenticated", "service_role"].includes(role));
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: user?.id ?? "", email: user?.email, role })]);
    return run(tx);
  });
  const company = (status = "pending_payment", name = "Compagnie distincte") => scalar(db,
    "insert into companies(name,billing_status) values($1,$2) returning id", [name, status]);
  const user = async ({ email = `${randomUUID()}@example.test`, confirmed = true, companyId = null, role = "owner", superadmin = false, metadata = {} } = {}) => {
    const account = { id: randomUUID(), email };
    await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,last_sign_in_at) values($1,$2,case when $3 then now() else null end,$4,'2026-10-05T07:00:00Z')",
      [account.id, email, confirmed, metadata]);
    if (companyId) await db.query("insert into profiles(id,company_id,role,is_super_admin,full_name) values($1,$2,$3,$4,'Léa Martin')", [account.id, companyId, role, superadmin]);
    return account;
  };
  const signup = async ({ email = `${randomUUID()}@example.test`, invitedUserId = null, paid = false, demo = false, status = "reserved", name = "Compagnie déclarée" } = {}) => scalar(db,
    "insert into beta_signups(company_name,contact_name,email,discipline,main_need,status,position,is_demo,invited_user_id,payment_confirmed_at) values($1,'Suzanne',$2,'Théâtre','Diffusion',$3,1,$4,$5,case when $6 then now() else null end) returning id",
    [name, email, status, demo, invitedUserId, paid]);
  const grant = (actor, signupId, note = "Partenaire") => as("authenticated", actor, (tx) => scalar(tx,
    "select public.admin_grant_beta_complimentary_access($1,$2)", [signupId, note]));
  const ensure = (account, name = "Sa propre compagnie") => as("authenticated", account, (tx) => scalar(tx, "select public.ensure_workspace($1)", [name]));
  const stored = (id) => db.query("select * from beta_signups where id=$1", [id]).then((r) => r.rows[0]);
  const billing = (id) => db.query("select billing_status,comped_until,stripe_subscription_id from companies where id=$1", [id]).then((r) => r.rows[0]);
  const list = (actor) => as("authenticated", actor, (tx) => tx.query("select * from public.admin_list_beta_signups()"));
  const members = (actor) => as("authenticated", actor, (tx) => tx.query("select * from public.admin_list_company_members()"));
  const delegate = async (permissions) => {
    const account = await user({ companyId: await company("trial") });
    await db.query("insert into platform_admin_access(user_id,permissions) values($1,$2)", [account.id, permissions]);
    return account;
  };
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz,
        raw_user_meta_data jsonb not null default '{}',created_at timestamptz not null default now());
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
    `);
    for (const name of ["001_initial_schema.sql", "002_fix_company_signup_rls.sql", "006_beta_show_documents.sql", "009_billing_status_roles.sql", "015_company_profile.sql", "020_stripe_billing.sql"]) await db.exec(source(name));
    await db.exec(source("013_super_admin.sql").split("-- Supervision")[0]);
    await db.exec(source("021_access_audit_and_maintenance.sql"));
    await db.exec(source("031_beta_demo_signups.sql").split("insert into public.beta_signups")[0]);
    await db.exec(source("044_platform_admin_permissions.sql").split("create or replace function public.is_platform_admin_user()")[0]);
    await db.exec(source("063_beta_access_workflow.sql"));
    await db.exec(source("065_guided_diffusion_exploitation_and_beta_william.sql").split("alter table public.beta_signups")[1].split("create or replace function public.admin_credit_beta_william")[0].replace(/^/, "alter table public.beta_signups"));
    await db.exec(`create table fixture_seed_events(company_id uuid);
      create function public.seed_reference_grants(p_id uuid) returns void language sql as $$ insert into fixture_seed_events values(p_id) $$;`);
    const releaseSql = readFileSync(new URL("../../sql/releases/20261008_beta_supervision.sql", import.meta.url), "utf8");
    await db.exec(releaseSql);
    await db.exec(releaseSql);
    const superadmin = await user({ companyId: await company("trial"), superadmin: true });

    await suite.test("les attributions sont réservées au superadmin et les tables restent privées", async () => {
      const signupId = await signup();
      for (const account of [await user({ companyId: await company() }), await delegate(["view_beta"])]) {
        await assert.rejects(grant(account, signupId), /superadministrateurs/);
        await assert.rejects(as("authenticated", account, (tx) => tx.query("update beta_signups set access_granted_at=now() where id=$1", [signupId])), /permission denied/);
        await assert.rejects(as("authenticated", account, (tx) => tx.query("select * from beta_access_events")), /permission denied/);
        await assert.rejects(as("authenticated", account, (tx) => tx.query("select private.beta_signup_auth_user_id($1)", [signupId])), /permission denied/);
      }
      await assert.rejects(as("anon", null, (tx) => tx.query("select public.admin_grant_beta_complimentary_access($1,null)", [signupId])), /permission denied/);
      assert.equal((await stored(signupId)).access_granted_at, null);
    });

    await suite.test("offrir sans compte ne crée ni compte, ni compagnie, ni invitation, ni paiement", async () => {
      const email = `${randomUUID()}@example.test`;
      const signupId = await signup({ email });
      const before = await scalar(db, "select count(*)::int from companies");
      assert.equal((await grant(superadmin, signupId)).status, "prepared");
      assert.equal(await scalar(db, "select count(*)::int from companies"), before);
      const row = await stored(signupId);
      assert.ok(row.access_granted_at);
      assert.equal(row.access_granted_by, superadmin.id);
      assert.equal(row.access_grant_note, "Partenaire");
      for (const key of ["payment_confirmed_at", "payment_reference", "payment_email_sent_at", "invitation_sent_at", "invited_user_id", "account_created_at"]) assert.equal(row[key], null, key);
      const account = await user({ email: ` ${email.toUpperCase()} ` });
      const companyId = await ensure(account);
      assert.equal((await billing(companyId)).billing_status, "comped");
      assert.equal((await billing(companyId)).comped_until, null);
      assert.equal(await ensure(account), companyId);
      const linked = await stored(signupId);
      assert.equal(linked.invited_user_id, account.id);
      assert.ok(linked.account_created_at);
      assert.equal(linked.payment_confirmed_at, null);
      assert.equal(await scalar(db, "select count(*)::int from beta_access_events where beta_signup_id=$1 and event_type='account_created'", [signupId]), 1);
    });

    await suite.test("le compte confirmé existant est activé et l'attribution répétée reste auditée une fois", async () => {
      const companyId = await company();
      const account = await user({ companyId });
      const signupId = await signup({ email: account.email });
      assert.equal((await grant(superadmin, signupId, "Travaille avec nous")).status, "activated");
      assert.equal((await billing(companyId)).billing_status, "comped");
      assert.equal((await grant(superadmin, signupId, "Autre note")).alreadyGranted, true);
      assert.equal((await stored(signupId)).access_grant_note, "Travaille avec nous");
      assert.equal(await scalar(db, "select count(*)::int from beta_access_events where beta_signup_id=$1 and event_type='complimentary_access_granted'", [signupId]), 1);
      assert.ok((await stored(signupId)).account_created_at);
    });

    await suite.test("le lien Auth explicite prime sur l'email, sans fusion par nom de compagnie", async () => {
      const linkedCompany = await company("pending_payment", "Même nom");
      const otherCompany = await company("pending_payment", "Même nom");
      const linked = await user({ companyId: linkedCompany });
      const other = await user({ companyId: otherCompany });
      const signupId = await signup({ email: other.email, invitedUserId: linked.id, name: "Même nom" });
      assert.equal((await grant(superadmin, signupId)).ok, true);
      assert.equal((await billing(linkedCompany)).billing_status, "comped");
      assert.equal((await billing(otherCompany)).billing_status, "pending_payment");
      assert.equal((await list(superadmin)).rows.find((row) => row.id === signupId).linked_company_id, linkedCompany);
    });

    await suite.test("une personne membre ne change jamais l'abonnement de sa compagnie", async () => {
      for (const role of ["member", "readonly"]) {
        const companyId = await company();
        const account = await user({ companyId, role });
        const signupId = await signup({ email: account.email });
        assert.equal((await grant(superadmin, signupId)).status, "company_manager_required");
        assert.equal((await billing(companyId)).billing_status, "pending_payment");
        assert.equal((await stored(signupId)).access_granted_at, null);
      }
    });

    await suite.test("les inscriptions payées, de démonstration et en attente ne reçoivent pas l'exemption", async () => {
      for (const options of [{ paid: true }, { demo: true }, { status: "waitlist" }]) {
        const signupId = await signup(options);
        assert.equal((await grant(superadmin, signupId)).ok, false);
        assert.equal((await stored(signupId)).access_granted_at, null);
      }
      await assert.rejects(grant(superadmin, await signup(), "x".repeat(1001)), /Note trop longue/);
    });

    await suite.test("abonnement Stripe et paiement en préparation bloquent une attribution offerte", async () => {
      for (const kind of ["active", "subscription", "creating", "open"]) {
        const companyId = await company(kind === "active" ? "active" : "pending_payment");
        const account = await user({ companyId });
        const signupId = await signup({ email: account.email });
        if (kind === "subscription") await db.query("update companies set stripe_subscription_id=$1 where id=$2", [`sub_${randomUUID()}`, companyId]);
        if (["creating", "open"].includes(kind)) await db.query("insert into stripe_checkout_attempts(company_id,actor_id,plan_code,price_id,status) values($1,$2,'beta','price_test',$3)", [companyId, account.id, kind]);
        assert.equal((await grant(superadmin, signupId)).status, ["active", "subscription"].includes(kind) ? "existing_subscription" : "existing_checkout");
        assert.equal((await stored(signupId)).access_granted_at, null);
      }
    });

    await suite.test("le verrou SQL interdit un nouveau Checkout après l'offre", async () => {
      const companyId = await company();
      const account = await user({ companyId });
      await grant(superadmin, await signup({ email: account.email }));
      const checkout = await as("service_role", null, (tx) => scalar(tx, "select public.prepare_stripe_checkout($1,$2,'beta','price_test')", [companyId, account.id]));
      assert.equal(checkout.ok, false);
      assert.equal(checkout.status, "complimentary_access");
      assert.equal(await scalar(db, "select count(*)::int from stripe_checkout_attempts where company_id=$1", [companyId]), 0);
    });

    await suite.test("une confirmation email reste obligatoire et les métadonnées ne donnent aucun droit", async () => {
      const account = await user({ confirmed: false });
      const signupId = await signup({ email: account.email });
      await grant(superadmin, signupId);
      await assert.rejects(ensure(account), /email_confirmation_required/);
      assert.equal((await stored(signupId)).account_created_at, null);
      const forged = await user({ metadata: { access_granted_at: "2026-10-05", billing_status: "comped", is_super_admin: true } });
      assert.equal((await billing(await ensure(forged))).billing_status, "pending_payment");
    });

    await suite.test("l'identité ambiguë ou un lien Auth manquant ne sont pas remplacés par un email", async () => {
      const email = `${randomUUID()}@example.test`;
      await user({ email }); await user({ email: email.toUpperCase() });
      const ambiguous = await signup({ email });
      assert.equal((await grant(superadmin, ambiguous)).status, "identity_ambiguous");
      const missing = await signup({ email: `${randomUUID()}@example.test`, invitedUserId: randomUUID() });
      assert.equal((await grant(superadmin, missing)).status, "identity_ambiguous");
    });

    await suite.test("la supervision sépare Auth, compagnie, paiement et accès et refuse les comptes ordinaires", async () => {
      const companyId = await company();
      const account = await user({ companyId });
      await user({ companyId, role: "member" });
      const signupId = await signup({ email: account.email });
      const betaAdmin = await delegate(["view_beta"]);
      const row = (await list(betaAdmin)).rows.find((item) => item.id === signupId);
      assert.equal(row.linked_company_id, companyId);
      assert.equal(row.member_count, 2);
      assert.equal(row.account_exists, true);
      assert.equal(row.has_access, false);
      assert.equal(row.payment_confirmed_at, null);
      assert.ok(row.email_confirmed_at);
      assert.equal(row.last_sign_in_at, null);
      assert.ok((await list(await delegate(["view_beta", "view_access"]))).rows.find((item) => item.id === signupId).last_sign_in_at);
      assert.equal(Object.hasOwn(row, "raw_user_meta_data"), false);
      await assert.rejects(list(account), /supervision bêta/);
      await assert.rejects(list(await delegate(["view_companies"])), /supervision bêta/);
      await assert.rejects(as("anon", null, (tx) => tx.query("select * from public.admin_list_beta_signups()")), /permission denied/);
    });

    await suite.test("les dates d'équipe exigent view_access et restent attribuées à l'utilisateur ET la compagnie", async () => {
      const companyId = await company();
      const otherCompany = await company();
      const account = await user({ companyId });
      await db.query("insert into access_events(user_id,company_id,event_type,created_at) values($1,$2,'login','2026-10-03T10:00:00Z'),($1,$2,'page_view','2026-10-04T10:00:00Z'),($1,$3,'login','2026-10-05T10:00:00Z')", [account.id, companyId, otherCompany]);
      const companyAdmin = await delegate(["view_companies"]);
      const allowed = await delegate(["view_companies", "view_access"]);
      const hidden = (await members(companyAdmin)).rows.find((row) => row.user_id === account.id);
      assert.equal(hidden.last_login, null); assert.equal(hidden.last_activity, null);
      const visible = (await members(allowed)).rows.find((row) => row.user_id === account.id);
      assert.equal(visible.last_login.toISOString(), "2026-10-03T10:00:00.000Z");
      assert.equal(visible.last_activity.toISOString(), "2026-10-04T10:00:00.000Z");
      assert.equal(visible.company_id, companyId);
      assert.equal(visible.email, account.email);
      assert.equal(Object.hasOwn(visible, "ip_address"), false);
      await assert.rejects(members(await delegate(["view_beta", "view_access"])), /supervision des compagnies/);
      await assert.rejects(members(account), /supervision des compagnies/);
      await assert.rejects(as("anon", null, (tx) => tx.query("select * from public.admin_list_company_members()")), /permission denied/);
    });

    await suite.test("la migration est réapplicable sans doubler les offres et leurs traces", async () => {
      const signupId = await signup();
      await grant(superadmin, signupId);
      const before = await stored(signupId);
      const eventCount = await scalar(db, "select count(*)::int from beta_access_events");
      await db.exec(source("089_beta_complimentary_supervision.sql"));
      assert.deepEqual(await stored(signupId), before);
      assert.equal(await scalar(db, "select count(*)::int from beta_access_events"), eventCount);
      assert.equal((await grant(superadmin, signupId)).alreadyGranted, true);
    });

    await suite.test("une offre historique ne réactive pas une compagnie ensuite suspendue", async () => {
      const companyId = await company();
      const account = await user({ companyId });
      const signupId = await signup({ email: account.email });
      await grant(superadmin, signupId);
      await db.query("update companies set billing_status='cancelled' where id=$1", [companyId]);
      assert.equal(await ensure(account), companyId);
      assert.equal((await billing(companyId)).billing_status, "cancelled");
      assert.equal((await grant(superadmin, signupId)).status, "already_granted");
      assert.equal((await billing(companyId)).billing_status, "cancelled");
      assert.equal((await list(superadmin)).rows.find((row) => row.id === signupId).has_access, false);
    });

    await suite.test("l'offre illimitée prime sur une réservation par code et n'est jamais raccourcie", async () => {
      const hash = (value) => createHash("sha256").update(value).digest("hex");
      for (const createFirst of [true, false]) {
        const email = `${randomUUID()}@example.test`;
        const signupId = await signup({ email });
        const codeHash = hash(randomUUID());
        const codeId = await as("authenticated", superadmin, (tx) => scalar(tx,
          "select public.admin_create_access_code($1,'masque','Essai 30 jours','trial',30,null,null,1)", [codeHash]));
        const reserved = await as("service_role", null, (tx) => scalar(tx,
          "select public.prepare_access_code_signup($1,$2,$3)", [codeHash, email, hash(randomUUID())]));
        assert.equal(reserved.ok, true);
        const account = await user({ email });
        await as("service_role", null, (tx) => scalar(tx,
          "select public.complete_access_code_signup($1,$2,'confirmation_sent')", [reserved.reservationId, account.id]));
        const pending = () => as("authenticated", account, (tx) => scalar(tx, "select public.get_my_pending_access_code_signup()"));
        assert.equal(await pending(), true);
        await grant(superadmin, signupId);
        assert.equal(await pending(), false);
        const initialCompany = createFirst ? await ensure(account) : null;
        const redeemed = await as("authenticated", account, (tx) => scalar(tx,
          "select public.redeem_access_code($1,'Sa compagnie offerte')", [codeHash]));
        assert.equal(redeemed.ok, true);
        assert.equal(redeemed.status, "unchanged");
        assert.equal(redeemed.newCompany, !createFirst);
        if (initialCompany) assert.equal(redeemed.companyId, initialCompany);
        assert.equal((await billing(redeemed.companyId)).billing_status, "comped");
        assert.equal((await billing(redeemed.companyId)).comped_until, null);
        assert.equal(await scalar(db, "select used_count from access_codes where id=$1", [codeId]), 0);
        assert.equal(await scalar(db, "select count(*)::int from access_code_redemptions where code_id=$1", [codeId]), 0);
        assert.equal(await pending(), false);
      }
    });

    await suite.test("la priorité bêta ne contourne pas la confirmation et les codes ordinaires sont consommés une seule fois", async () => {
      const hash = (value) => createHash("sha256").update(value).digest("hex");
      for (const offered of [true, false]) {
        const email = `${randomUUID()}@example.test`;
        const codeHash = hash(randomUUID());
        const codeId = await as("authenticated", superadmin, (tx) => scalar(tx,
          "select public.admin_create_access_code($1,'masque','Essai simple','trial',30,null,null,1)", [codeHash]));
        const reserved = await as("service_role", null, (tx) => scalar(tx,
          "select public.prepare_access_code_signup($1,$2,$3)", [codeHash, email, hash(randomUUID())]));
        const account = await user({ email, confirmed: !offered });
        await as("service_role", null, (tx) => scalar(tx,
          "select public.complete_access_code_signup($1,$2,'confirmation_sent')", [reserved.reservationId, account.id]));
        if (offered) {
          await grant(superadmin, await signup({ email }));
          assert.equal(await as("authenticated", account, (tx) => scalar(tx, "select public.get_my_pending_access_code_signup()")), true);
          await assert.rejects(ensure(account), /email_confirmation_required/);
        } else {
          await assert.rejects(ensure(account), /access_code_required/);
          const redeem = () => as("authenticated", account, (tx) => scalar(tx, "select public.redeem_access_code($1,'Compagnie par code')", [codeHash]));
          const first = await redeem();
          assert.equal(first.status, "applied");
          assert.ok((await billing(first.companyId)).comped_until);
          assert.equal((await redeem()).status, "already_applied");
          assert.equal(await scalar(db, "select used_count from access_codes where id=$1", [codeId]), 1);
          assert.equal(await scalar(db, "select count(*)::int from access_code_redemptions where code_id=$1", [codeId]), 1);
        }
      }
    });
  } finally { await db.close(); }
});
