import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// Isolated PostgreSQL/WASM: no hosted database, Auth request, Docker or email.
const packageRoot = new URL("../../tmp/rehearsal-pglite/node_modules/@electric-sql/pglite/", import.meta.url);
const sqlRoot = new URL("../../sql/", import.meta.url);
const source = (name) => readFileSync(new URL(name, sqlRoot), "utf8");
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("inscription directe : préparation sans accès métier avant paiement", {
  skip: !existsSync(new URL("dist/index.js", packageRoot)), timeout: 90_000,
}, async (suite) => {
  const { PGlite } = await import(new URL("dist/index.js", packageRoot).href);
  const { pgcrypto } = await import(new URL("dist/contrib/pgcrypto.js", packageRoot).href);
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const users = new Map();
  const scalar = async (tx, text, args = []) => Object.values((await tx.query(text, args)).rows[0] ?? {})[0];
  const as = (role, user, run) => db.transaction(async (tx) => {
    assert.ok(["anon", "authenticated", "service_role"].includes(role));
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({
      sub: user?.id ?? "", email: user?.email, role,
    })]);
    return run(tx);
  });
  const createUser = async ({ confirmed = true, metadata = {}, companyId = null, role = "owner", superadmin = false } = {}) => {
    const user = { id: randomUUID(), email: `${randomUUID()}@example.test` };
    users.set(user.id, user);
    await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,case when $3 then now() else null end,$4)", [user.id, user.email, confirmed, JSON.stringify(metadata)]);
    if (companyId) await db.query("insert into profiles(id,company_id,role,is_super_admin) values($1,$2,$3,$4)", [user.id, companyId, role, superadmin]);
    return user;
  };
  const createCompany = async (status = "trial") => scalar(db,
    "insert into companies(name,billing_status) values('Compagnie existante',$1) returning id", [status]);
  const ensure = (user, name = "Compagnie préparée") => as("authenticated", user, (tx) => scalar(tx, "select public.ensure_workspace($1)", [name]));
  const stored = (id) => db.query("select name,billing_status,plan_code,comped_until from companies where id=$1", [id]).then((r) => r.rows[0]);
  const save = (user, values) => as("authenticated", user, (tx) => scalar(tx, "select public.save_pending_company_setup($1)", [values]));
  const beta = (user, { invitedId = user.id, paid = true, demo = false, status = "reserved" } = {}) => db.query(
    "insert into beta_signups(company_name,contact_name,email,discipline,main_need,status,position,is_demo,invited_user_id,payment_confirmed_at) values('Bêta','Contact',$1,'Théâtre','Diffusion',$2,1,$3,$4,case when $5 then now() else null end)",
    [user.email, status, demo, invitedId, paid]);

  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (
        id uuid primary key,email text,email_confirmed_at timestamptz,
        raw_user_meta_data jsonb not null default '{}',created_at timestamptz not null default now()
      );
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
      $$;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
    `);
    for (const name of ["001_initial_schema.sql", "002_fix_company_signup_rls.sql", "006_beta_show_documents.sql", "009_billing_status_roles.sql", "015_company_profile.sql", "020_stripe_billing.sql"]) await db.exec(source(name));
    await db.exec(source("013_super_admin.sql").split("-- Supervision")[0]);
    await db.exec(source("031_beta_demo_signups.sql").split("insert into public.beta_signups")[0]);
    await db.exec(source("063_beta_access_workflow.sql").split("drop function if exists public.admin_list_beta_signups")[0]);
    await db.exec(`create table fixture_seed_events(company_id uuid);
      create function public.seed_reference_grants(p_id uuid) returns void language sql as $$ insert into fixture_seed_events values(p_id) $$;`);
    await db.exec(source("086_access_codes.sql"));
    const oldCompany = await createCompany();
    const oldUser = await createUser({ companyId: oldCompany });
    const migration = source("087_pending_payment_signup.sql");
    await db.exec(migration);
    await db.exec(migration);

    await suite.test("capacité disponible sans session seulement après la migration", async () => {
      assert.equal(await as("anon", null, (tx) => scalar(tx, "select public.direct_signup_ready()")), true);
      assert.equal(await as("authenticated", oldUser, (tx) => scalar(tx, "select public.direct_signup_ready()")), true);
    });

    await suite.test("conserve le statut et la compagnie des comptes existants", async () => {
      assert.equal(await ensure(oldUser), oldCompany);
      assert.equal((await stored(oldCompany)).billing_status, "trial");
      for (const status of ["active", "comped", "past_due", "cancelled"]) {
        const company = await createCompany(status);
        assert.equal(await ensure(await createUser({ companyId: company })), company);
        assert.equal((await stored(company)).billing_status, status);
      }
    });

    await suite.test("un compte confirmé prépare un espace sans accorder le cockpit", async () => {
      const user = await createUser();
      const company = await ensure(user);
      assert.equal((await stored(company)).billing_status, "pending_payment");
      assert.equal(await ensure(user, "Autre nom"), company);
      assert.equal(await scalar(db, "select count(*)::int from profiles where id=$1 and company_id=$2 and role='owner'", [user.id, company]), 1);
      assert.equal(await scalar(db, "select count(*)::int from fixture_seed_events where company_id=$1", [company]), 0);
      assert.equal(await as("authenticated", user, (tx) => scalar(tx, "select public.company_has_access($1)", [company])), false);
      assert.equal(await as("authenticated", user, (tx) => scalar(tx, "select public.is_company_member($1)", [company])), false);
      assert.equal(await as("authenticated", user, (tx) => scalar(tx, "select name from companies where id=$1", [company])), "Compagnie préparée");
    });

    await suite.test("le défaut de table reste en attente même hors du helper", async () => {
      const company = await scalar(db, "insert into companies(name) values('Défaut sécurisé') returning id");
      assert.equal((await stored(company)).billing_status, "pending_payment");
    });

    await suite.test("refuse le provisioning anonyme ou avant confirmation email", async () => {
      await assert.rejects(as("anon", null, (tx) => tx.query("select public.ensure_workspace()")), /permission denied/);
      const user = await createUser({ confirmed: false });
      await assert.rejects(ensure(user), /email_confirmation_required/);
      assert.equal(await scalar(db, "select count(*)::int from profiles where id=$1", [user.id]), 0);
    });

    await suite.test("les métadonnées Auth ne donnent jamais un essai ni un rôle privilégié", async () => {
      const user = await createUser({ metadata: { billing_status: "active", paid: true, role: "owner", is_super_admin: true, beta: true } });
      const company = await ensure(user);
      assert.equal((await stored(company)).billing_status, "pending_payment");
      assert.equal(await scalar(db, "select is_super_admin from profiles where id=$1", [user.id]), false);
    });

    await suite.test("le nom saisi est enregistré dès la préparation sans donner de droits", async () => {
      const user = await createUser({ metadata: { full_name: "  Léa Martin  ", billing_status: "active", is_super_admin: true } });
      const company = await ensure(user);
      assert.equal(await scalar(db, "select full_name from profiles where id=$1", [user.id]), "Léa Martin");
      assert.equal((await stored(company)).billing_status, "pending_payment");
      assert.equal(await scalar(db, "select is_super_admin from profiles where id=$1", [user.id]), false);
      for (const full_name of [null, "", " ", "A", "x".repeat(161), 42, true, { name: "Camille" }, ["Camille"]]) {
        const invalid = await createUser({ metadata: { full_name } });
        await ensure(invalid);
        assert.equal(await scalar(db, "select full_name from profiles where id=$1", [invalid.id]), invalid.email);
      }
    });

    await suite.test("seule une invitation bêta payée liée à cet utilisateur conserve l'ancien accès", async () => {
      const user = await createUser();
      await beta(user);
      const company = await ensure(user);
      assert.equal((await stored(company)).billing_status, "trial");
      assert.equal(await scalar(db, "select count(*)::int from fixture_seed_events where company_id=$1", [company]), 1);
      for (const options of [{ invitedId: randomUUID() }, { paid: false }, { demo: true }, { status: "waitlist" }]) {
        const other = await createUser();
        await beta(other, options);
        assert.equal((await stored(await ensure(other))).billing_status, "pending_payment");
      }
    });

    await suite.test("les insertions directes et la modification de facturation ou rôle restent interdites", async () => {
      const user = await createUser();
      const company = await ensure(user);
      for (const sql of [
        "insert into companies(name,billing_status) values('Contournement','active')",
        `insert into profiles(id,company_id,role) values('${randomUUID()}','${company}','owner')`,
        `update companies set billing_status='active' where id='${company}'`,
        `update companies set plan_code='founder' where id='${company}'`,
        `update profiles set is_super_admin=true where id='${user.id}'`,
        `update profiles set company_id='${oldCompany}' where id='${user.id}'`,
      ]) await assert.rejects(as("authenticated", user, (tx) => tx.exec(sql)), /permission denied/);
      assert.equal((await stored(company)).billing_status, "pending_payment");
    });

    await suite.test("RLS empêche l'usage direct des spectacles et contacts avant paiement", async () => {
      const user = await createUser();
      const company = await ensure(user);
      await db.query("insert into shows(company_id,title,discipline,status) values($1,'Donnée protégée','Théâtre','Creation')", [company]);
      assert.equal(await as("authenticated", user, (tx) => scalar(tx, "select count(*)::int from shows where company_id=$1", [company])), 0);
      await assert.rejects(as("authenticated", user, (tx) => tx.query("insert into shows(company_id,title,discipline,status) values($1,'Interdit','Théâtre','Creation')", [company])), /row-level security/);
      await assert.rejects(as("authenticated", user, (tx) => tx.query("insert into contacts(company_id,name) values($1,'Interdit')", [company])), /row-level security/);
      assert.equal(await as("authenticated", user, (tx) => scalar(tx, "select count(*)::int from companies where id=$1", [oldCompany])), 0);
      await db.query("update companies set billing_status='active' where id=$1", [company]);
      assert.equal(await as("authenticated", user, (tx) => scalar(tx, "select count(*)::int from shows where company_id=$1", [company])), 1);
      await ensure(user);
      assert.equal(await scalar(db, "select count(*)::int from fixture_seed_events where company_id=$1", [company]), 1);
    });

    await suite.test("la fiche gratuite met à jour uniquement le compte et la compagnie courants", async () => {
      const user = await createUser();
      const company = await ensure(user);
      assert.equal(await save(user, { full_name: "Camille", name: "Compagnie Camille", city: "Nantes", email: "contact@example.test", description: "Théâtre contemporain" }), true);
      const row = (await db.query("select name,city,email,description,billing_status from companies where id=$1", [company])).rows[0];
      assert.deepEqual(row, { name: "Compagnie Camille", city: "Nantes", email: "contact@example.test", description: "Théâtre contemporain", billing_status: "pending_payment" });
      assert.equal(await scalar(db, "select full_name from profiles where id=$1", [user.id]), "Camille");
      await save(user, { full_name: "Camille", name: "Compagnie Camille", city: null });
      assert.equal(await scalar(db, "select city from companies where id=$1", [company]), null);
      assert.equal(await scalar(db, "select email from companies where id=$1", [company]), "contact@example.test");
    });

    await suite.test("la fiche refuse champs privilégiés, objets, dépassements, autres rôles et accès actif", async () => {
      const user = await createUser();
      const company = await ensure(user);
      const base = { full_name: "Camille", name: "Compagnie Camille" };
      for (const invalid of [{ ...base, billing_status: "active" }, { ...base, company_id: oldCompany }, { ...base, role: "owner" }, { ...base, logo_url: "https://example.test/logo" }, { ...base, city: {} }, { ...base, description: "x".repeat(1201) }, { name: "Compagnie" }, []]) {
        await assert.rejects(save(user, invalid), /invalide|requis/);
      }
      assert.equal(await scalar(db, "select full_name from profiles where id=$1", [user.id]), user.email);
      for (const role of ["member", "readonly"]) await assert.rejects(save(await createUser({ companyId: company, role }), base), /Responsable/);
      await assert.rejects(save(oldUser, base), /préparation/);
      await assert.rejects(as("anon", null, (tx) => tx.query("select public.save_pending_company_setup($1)", [base])), /permission denied/);
      assert.equal(await save(await createUser({ companyId: company, role: "admin" }), base), true);
    });

    await suite.test("une erreur sur la compagnie annule aussi le changement de prénom", async () => {
      const user = await createUser();
      const company = await ensure(user);
      await db.exec(`create function fixture_reject_company_name() returns trigger language plpgsql as $$
        begin if new.name='Échec atomique' then raise exception 'fixture_company_failure'; end if; return new; end $$;
        create trigger fixture_company_name before update on public.companies for each row execute function fixture_reject_company_name();`);
      try {
        await assert.rejects(save(user, { full_name: "Ne pas enregistrer", name: "Échec atomique" }), /fixture_company_failure/);
        assert.equal(await scalar(db, "select full_name from profiles where id=$1", [user.id]), user.email);
        assert.equal((await stored(company)).name, "Compagnie préparée");
      } finally {
        await db.exec("drop trigger fixture_company_name on companies; drop function fixture_reject_company_name()");
      }
    });

    await suite.test("seul le superadministrateur peut changer un statut de facturation", async () => {
      const user = await createUser();
      const company = await ensure(user);
      await assert.rejects(as("authenticated", user, (tx) => tx.query("select public.admin_set_company_billing($1,'active','beta',null,'Tentative')", [company])), /superadministrateurs/);
      const manager = await createUser({ companyId: await createCompany("active"), superadmin: true });
      await as("authenticated", manager, (tx) => tx.query("select public.admin_set_company_billing($1,'active','beta',null,'Activation vérifiée')", [company]));
      assert.equal((await stored(company)).billing_status, "active");
      await as("authenticated", manager, (tx) => tx.query("select public.admin_set_company_billing($1,'pending_payment','beta',null,'Préparation')", [company]));
      assert.equal((await stored(company)).billing_status, "pending_payment");
    });

    await suite.test("la réservation par code reste fermée et sa rédemption ouvre le vrai accès", async () => {
      const managerCompany = await createCompany("active");
      const manager = await createUser({ companyId: managerCompany, superadmin: true });
      const codeHash = hash(randomUUID());
      const codeId = await as("authenticated", manager, (tx) => scalar(tx, "select public.admin_create_access_code($1,'masque-code','Code de test','trial',30,null,null,1)", [codeHash]));
      const email = `${randomUUID()}@example.test`;
      const prepared = await as("service_role", null, (tx) => scalar(tx, "select public.prepare_access_code_signup($1,$2,$3)", [codeHash, email, hash(randomUUID())]));
      assert.equal(prepared.ok, true);
      const user = await createUser();
      user.email = email;
      await db.query("update auth.users set email=$1 where id=$2", [email, user.id]);
      await as("service_role", null, (tx) => scalar(tx, "select public.complete_access_code_signup($1,$2,'confirmation_sent')", [prepared.reservationId, user.id]));
      await assert.rejects(ensure(user), /access_code_required/);
      const result = await as("authenticated", user, (tx) => scalar(tx, "select public.redeem_access_code($1,'Compagnie par code')", [codeHash]));
      assert.equal(result.ok, true);
      assert.equal((await stored(result.companyId)).billing_status, "comped");
      assert.equal(await scalar(db, "select used_count from access_codes where id=$1", [codeId]), 1);
      assert.equal(await ensure(user), result.companyId);
      assert.equal(await as("authenticated", user, (tx) => scalar(tx, "select public.company_has_access($1)", [result.companyId])), true);
    });

    await suite.test("un compte préparé peut recevoir un code sans recréer sa compagnie", async () => {
      const user = await createUser();
      const company = await ensure(user);
      const manager = await createUser({ companyId: await createCompany("active"), superadmin: true });
      const codeHash = hash(randomUUID());
      await as("authenticated", manager, (tx) => scalar(tx, "select public.admin_create_access_code($1,'masque-code','Accès offert','free',null,null,null,1)", [codeHash]));
      const result = await as("authenticated", user, (tx) => scalar(tx, "select public.redeem_access_code($1,'Nom ignoré')", [codeHash]));
      assert.equal(result.ok, true);
      assert.equal(result.companyId, company);
      assert.equal((await stored(company)).billing_status, "comped");
    });
  } finally {
    await db.close();
  }
});
