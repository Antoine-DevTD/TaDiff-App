import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

function load(file, dependencies, env = {}, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, { exports, URL, process: { env }, ...globals,
    require: (name) => { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; },
  }, { filename: file });
  return exports;
}
const signupId = "12121212-1234-4123-8123-123456789012";
const userId = "12121212-1234-4123-8123-123456789013";
const timestamp = "2026-10-05T10:00:00Z";
const plain = (value) => JSON.parse(JSON.stringify(value));
function harness(options = {}) {
  const calls = [];
  const row = { id: signupId, email: "suzanne@example.test", contact_name: "Suzanne", company_name: "Sa compagnie",
    main_need: "Diffusion", discipline: "Théâtre", payment_confirmed_at: null, access_granted_at: timestamp,
    invitation_sent_at: null, invited_user_id: null, account_created_at: null, is_demo: false, status: "reserved", ...options.signup };
  const admin = {
    from(table) {
      const call = { type: "query", table, filters: [], operation: "select" }; calls.push(call);
      const query = {
        select(columns) { call.columns = columns; return query; },
        in(column, value) { call.filters.push(["in", column, value]); return query; },
        eq(column, value) { call.filters.push(["eq", column, value]); return query; },
        is(column, value) { call.filters.push(["is", column, value]); return query; },
        or(value) { call.filters.push(["or", value]); return query; },
        update(values) { call.operation = "update"; call.values = values; return query; },
        insert(values) { call.operation = "insert"; call.values = values; return query; },
        async maybeSingle() {
          if (options.readError) return { data: null, error: { message: "INTERNAL_DATABASE_SECRET" } };
          if (options.noSignup) return { data: null, error: null };
          if (call.operation === "update" && options.claimLost) return { data: null, error: null };
          return { data: call.operation === "update" ? { id: signupId } : row, error: null };
        },
        then(resolve) { return Promise.resolve({ data: [row], error: options.readError ? { message: "INTERNAL_DATABASE_SECRET" } : null }).then(resolve); },
      };
      return query;
    },
    auth: { admin: {
      async inviteUserByEmail(email, input) { calls.push({ type: "invite", email, input }); return options.inviteFailure
        ? { data: { user: null }, error: { message: "Invitation indisponible" } } : { data: { user: { id: options.returnedUserId ?? userId } }, error: null }; },
      async getUserById(id) { calls.push({ type: "getUser", id }); return { data: { user: options.missingInvited ? null : {
        id: options.actualAuthId ?? id, email: options.invitedEmail || row.email, email_confirmed_at: options.confirmedInvited ? timestamp : null,
      } }, error: options.invitedError ? { message: "error" } : null }; },
    } },
  };
  const db = { async rpc(name, args) {
    calls.push({ type: "rpc", name, args });
    if (options.rpcThrows) throw new Error("INTERNAL_DATABASE_SECRET");
    return { data: options.grant ?? { ok: true, status: "prepared" }, error: options.rpcError ?? null };
  } };
  const dependencies = {
    "next/cache": { revalidatePath: (path) => calls.push({ type: "revalidate", path }) }, zod: { z },
    "@/lib/beta-access": { renderBetaEmailTemplate: (template) => template },
    "@/lib/supabase/admin": {
      isSuperAdmin: async () => { calls.push({ type: "authorize" }); return options.superadmin ?? true; },
      getAdminBetaSupervision: async () => {
        calls.push({ type: "supervision" });
        if (options.supervisionThrows) throw new Error("INTERNAL_DATABASE_SECRET");
        return { signups: options.supervisionSignups ?? [], error: options.supervisionError ?? null };
      },
    },
    "@/lib/supabase/admin-client": { hasSupabaseAdminEnv: () => options.adminEnv ?? true, getSupabaseAdminClient: () => admin },
    "@/lib/supabase/server": { getSupabaseServerClient: async () => db, getSupabaseServerUser: async () => ({ data: { user: { id: userId } } }) },
  };
  const actions = load("app/(dashboard)/admin/beta/actions.ts", dependencies, {
    NEXT_PUBLIC_APP_URL: "https://qa.invalid/", RESEND_API_KEY: "test-not-a-key", BETA_PAYMENT_LINK_URL: "https://payment.invalid/",
  }, { fetch: async (...args) => { calls.push({ type: "email", args }); return { ok: true }; } });
  return { calls, actions, row };
}

test("l'offre valide passe par l'autorisation SQL et ne nécessite pas la clé de service ou un email", async () => {
  const { actions, calls } = harness({ adminEnv: false });
  const result = await actions.grantBetaComplimentaryAccess({ signupId, note: "  Partenaire  " });
  assert.equal(result.ok, true);
  assert.deepEqual(plain(calls.find((call) => call.type === "rpc")), {
    type: "rpc", name: "admin_grant_beta_complimentary_access", args: { p_signup_id: signupId, p_note: "Partenaire" },
  });
  assert.equal(calls.filter((call) => ["query", "email", "invite", "getUser"].includes(call.type)).length, 0);
  assert.match(result.message, /invitation séparément/);
});

test("une saisie invalide et un compte sans permission n'appellent pas la mutation", async () => {
  for (const input of [{ signupId: "bad" }, { signupId, note: "x".repeat(1001) }]) {
    const { actions, calls } = harness();
    assert.equal((await actions.grantBetaComplimentaryAccess(input)).ok, false);
    assert.deepEqual(calls, []);
  }
  const { actions, calls } = harness({ superadmin: false });
  assert.equal((await actions.grantBetaComplimentaryAccess({ signupId })).ok, false);
  assert.equal(calls.filter((call) => call.type === "rpc").length, 0);
});

test("les refus métier et les pannes sont lisibles sans détails internes", async () => {
  for (const status of ["existing_subscription", "existing_checkout", "company_manager_required", "identity_ambiguous", "ineligible", "paid_signup"]) {
    const { actions } = harness({ grant: { ok: false, status } });
    const result = await actions.grantBetaComplimentaryAccess({ signupId });
    assert.equal(result.ok, false);
    assert.ok(result.message.length > 20);
  }
  for (const options of [{ rpcThrows: true }, { rpcError: { code: "500", message: "INTERNAL_DATABASE_SECRET" } }, { rpcError: { code: "PGRST202", message: "INTERNAL_DATABASE_SECRET" } }]) {
    const { actions } = harness(options);
    const result = await actions.grantBetaComplimentaryAccess({ signupId });
    assert.equal(result.ok, false);
    assert.doesNotMatch(result.message, /INTERNAL_DATABASE_SECRET/);
    if (options.rpcError?.code === "PGRST202") assert.match(result.message, /089/);
  }
});

test("une offre déjà enregistrée n'est pas présentée comme une nouvelle activation", async () => {
  const { actions } = harness({ grant: { ok: true, status: "already_granted" } });
  assert.match((await actions.grantBetaComplimentaryAccess({ signupId })).message, /statut actuel/);
});

test("l'invitation explicite accepte l'offre ou le paiement, sans fabriquer de confirmation", async () => {
  for (const signup of [{ access_granted_at: timestamp }, { access_granted_at: null, payment_confirmed_at: timestamp }]) {
    const { actions, calls } = harness({ signup });
    assert.equal((await actions.inviteBetaSignups({ signupIds: [signupId] })).ok, true);
    const invite = calls.find((call) => call.type === "invite");
    assert.equal(invite.email, "suzanne@example.test");
    assert.match(invite.input.redirectTo, /auth\/callback/);
    assert.equal(Object.hasOwn(invite.input.data, "email_confirmed_at"), false);
    assert.equal(Object.hasOwn(invite.input.data, "billing_status"), false);
    const claim = calls.find((call) => call.operation === "update" && call.values.invitation_sent_at);
    assert.ok(claim.filters.some((filter) => filter[0] === "eq" && filter[1] === "status" && filter[2] === "reserved"));
    assert.ok(claim.filters.some((filter) => filter[0] === "or" && /access_granted_at/.test(filter[1])));
    assert.equal(calls.some((call) => call.values?.payment_confirmed_at), false);
  }
});

test("aucune invitation sans offre/paiement, sur une démo, une attente ou une invitation déjà envoyée", async () => {
  for (const signup of [{ access_granted_at: null }, { is_demo: true }, { status: "waitlist" }, { invitation_sent_at: timestamp }]) {
    const { actions, calls } = harness({ signup });
    assert.equal((await actions.inviteBetaSignups({ signupIds: [signupId] })).ok, false);
    assert.equal(calls.some((call) => call.type === "invite"), false);
  }
  const { actions, calls } = harness({ claimLost: true });
  assert.equal((await actions.inviteBetaSignups({ signupIds: [signupId] })).ok, false);
  assert.equal(calls.some((call) => call.type === "invite"), false);
});

test("un renvoi offert garde l'identité de l'invitation et refuse les comptes déjà confirmés", async () => {
  const signup = { invitation_sent_at: timestamp, invited_user_id: userId, account_created_at: timestamp };
  const first = harness({ signup });
  assert.equal((await first.actions.resendBetaInvitation({ signupId })).ok, true);
  assert.equal(first.calls.filter((call) => call.type === "invite").length, 1);
  for (const options of [{ confirmedInvited: true }, { missingInvited: true }, { invitedError: true }, { invitedEmail: "different@example.test" }, { actualAuthId: signupId }]) {
    const { actions, calls } = harness({ signup, ...options });
    assert.equal((await actions.resendBetaInvitation({ signupId })).ok, false);
    assert.equal(calls.some((call) => call.type === "invite"), false);
  }
});

const legacySignup = { access_granted_at: null, invited_user_id: userId, account_created_at: timestamp };
const legacySupervision = { id: signupId, invitedUserId: userId, billingStatus: "comped", hasAccess: true };

test("un compte offert créé manuellement reçoit sa première invitation après contrôle de son identité Auth", async () => {
  const { actions, calls } = harness({ signup: legacySignup, supervisionSignups: [legacySupervision] });
  assert.equal((await actions.inviteBetaSignups({ signupIds: [signupId] })).ok, true);
  assert.equal(calls.filter((call) => call.type === "supervision").length, 1);
  assert.ok(calls.findIndex((call) => call.type === "getUser") < calls.findIndex((call) => call.type === "invite"));
  const claim = calls.find((call) => call.operation === "update" && call.values.invitation_sent_at);
  assert.ok(claim.filters.some((filter) => filter[0] === "eq" && filter[1] === "invited_user_id" && filter[2] === userId));
  assert.equal(claim.filters.some((filter) => filter[0] === "or"), false);
  assert.equal(calls.some((call) => call.values?.payment_confirmed_at || call.values?.access_granted_at), false);
  assert.equal(calls.some((call) => call.type === "rpc" || call.type === "email"), false);
});

test("le renvoi d'un compte offert historique reste possible tant que son email Auth n'est pas confirmé", async () => {
  const { actions, calls } = harness({ signup: { ...legacySignup, invitation_sent_at: timestamp }, supervisionSignups: [legacySupervision] });
  assert.equal((await actions.resendBetaInvitation({ signupId })).ok, true);
  assert.equal(calls.filter((call) => call.type === "invite").length, 1);
});

test("un accès historique expiré, une supervision en erreur ou un rattachement différent n'autorise aucun envoi", async () => {
  const refused = [
    { supervisionError: "INTERNAL_DATABASE_SECRET", supervisionSignups: [legacySupervision] },
    { supervisionThrows: true },
    { supervisionSignups: [] },
    { supervisionSignups: [{ ...legacySupervision, hasAccess: false, compedUntil: "2026-09-01" }] },
    { supervisionSignups: [{ ...legacySupervision, billingStatus: "cancelled" }] },
    { supervisionSignups: [{ ...legacySupervision, invitedUserId: signupId }] },
    { supervisionSignups: [{ ...legacySupervision, id: userId }] },
    { signup: { ...legacySignup, invited_user_id: null }, supervisionSignups: [legacySupervision] },
  ];
  for (const action of ["inviteBetaSignups", "resendBetaInvitation"]) for (const options of refused) {
    const { actions, calls } = harness({ signup: { ...legacySignup, invitation_sent_at: action === "resendBetaInvitation" ? timestamp : null }, ...options });
    const result = await actions[action](action === "inviteBetaSignups" ? { signupIds: [signupId] } : { signupId });
    assert.equal(result.ok, false, JSON.stringify(options));
    assert.equal(calls.some((call) => call.type === "invite"), false);
    assert.doesNotMatch(result.message, /INTERNAL_DATABASE_SECRET/);
  }
});

test("un compte historique confirmé, introuvable ou d'une autre identité Auth n'est jamais invité", async () => {
  for (const action of ["inviteBetaSignups", "resendBetaInvitation"]) for (const options of [
    { confirmedInvited: true }, { missingInvited: true }, { invitedError: true },
    { invitedEmail: "different@example.test" }, { actualAuthId: signupId },
  ]) {
    const { actions, calls } = harness({ signup: { ...legacySignup, invitation_sent_at: action === "resendBetaInvitation" ? timestamp : null }, supervisionSignups: [legacySupervision], ...options });
    assert.equal((await actions[action](action === "inviteBetaSignups" ? { signupIds: [signupId] } : { signupId })).ok, false);
    assert.equal(calls.some((call) => call.type === "invite"), false);
  }
});

test("un administrateur sans droit n'inspecte pas les comptes offerts et ne les invite pas", async () => {
  for (const action of ["inviteBetaSignups", "resendBetaInvitation"]) {
    const { actions, calls } = harness({ signup: legacySignup, supervisionSignups: [legacySupervision], superadmin: false });
    assert.equal((await actions[action](action === "inviteBetaSignups" ? { signupIds: [signupId] } : { signupId })).ok, false);
    assert.equal(calls.some((call) => ["supervision", "getUser", "invite", "query"].includes(call.type)), false);
  }
});

test("un ID différent retourné par Auth ne réattribue jamais l'inscription après invitation ou renvoi", async () => {
  for (const action of ["inviteBetaSignups", "resendBetaInvitation"]) {
    const { actions, calls } = harness({ signup: { ...legacySignup, invitation_sent_at: action === "resendBetaInvitation" ? timestamp : null }, supervisionSignups: [legacySupervision], returnedUserId: signupId });
    assert.equal((await actions[action](action === "inviteBetaSignups" ? { signupIds: [signupId] } : { signupId })).ok, false);
    assert.equal(calls.filter((call) => call.type === "invite").length, 1);
    assert.equal(calls.some((call) => call.values?.invited_user_id), false);
    assert.equal(calls.some((call) => call.values?.event_type === "invitation_sent"), false);
    assert.equal(calls.some((call) => call.values?.event_type === "invitation_failed"), true);
  }
});

test("les offres et les paiements vérifiés restent exclus des mails de paiement", async () => {
  for (const signup of [{ access_granted_at: timestamp }, { access_granted_at: null, payment_confirmed_at: timestamp }]) {
    const { actions, calls } = harness({ signup });
    const result = await actions.sendBetaPaymentEmails({ signupIds: [signupId], subject: "Votre accès", body: "Voici un message de paiement pour la bêta." });
    assert.equal(result.succeeded, 0);
    assert.equal(calls.some((call) => call.type === "email"), false);
    assert.equal((await actions.markBetaPaymentEmailsSent({ signupIds: [signupId] })).ok, false);
  }
});

function supervisionHarness(options = {}) {
  const calls = [];
  const rows = Array.from({ length: options.length ?? 1 }, (_, index) => ({
    id: String(index), company_name: "Déclarée", contact_name: "Suzanne", email: "suzanne@example.test", phone: null,
    city: null, discipline: "Théâtre", main_need: "Diffusion", status: "reserved", position: index + 1, is_demo: false,
    created_at: timestamp, payment_email_sent_at: null, payment_confirmed_at: null, payment_reference: null,
    invitation_sent_at: null, invited_user_id: userId, account_created_at: null, last_access_error: null,
    william_beta_credited_at: null, access_granted_at: timestamp, access_grant_note: "Partenaire", linked_company_id: "company-id",
    linked_company_name: "Compagnie réelle", billing_status: "comped", comped_until: null, member_count: 3,
    has_access: true, account_exists: true, email_confirmed_at: timestamp, last_sign_in_at: timestamp,
  }));
  const db = { rpc(name, args, config) {
    calls.push({ name, args, config });
    if (name === "admin_beta_supervision_ready") return Promise.resolve({ data: options.ready ?? true, error: options.readyError ?? null });
    assert.equal(name, "admin_list_beta_signups");
    assert.equal(config.count, "exact");
    return { async range(start, end) {
      calls.push({ start, end });
      if (options.throws) throw new Error("INTERNAL_DATABASE_SECRET");
      let data = rows.slice(start, Math.min(end + 1, start + (options.pageCap ?? 500)));
      if (options.duplicates && start > 0) data[0] = rows[0];
      if (options.oldSchema) data = data.map((row) => { const oldRow = { ...row }; delete oldRow.access_granted_at; return oldRow; });
      return { data: options.partial ? [] : data, error: options.error ?? null,
        count: options.noCount ? null : options.changedCount && start > 0 ? rows.length + 1 : rows.length };
    } };
  } };
  const library = load("lib/supabase/admin.ts", {
    "@/lib/env": { hasSupabaseEnv: () => options.connected ?? true }, react: { cache: (fn) => fn },
    "@/lib/supabase/server": { getSupabaseServerClient: async () => db },
    "@/lib/legal": {}, "@/lib/platform-permissions": { platformPermissionValues: [] },
  });
  return { library, calls };
}

test("la supervision charge toutes les pages et conserve les signaux de compte séparés", async () => {
  const { library, calls } = supervisionHarness({ length: 1203 });
  const result = await library.getAdminBetaSupervision();
  assert.equal(result.error, null);
  assert.equal(result.signups.length, 1203);
  assert.deepEqual(calls.filter((call) => Object.hasOwn(call, "start")).map((call) => call.start), [0, 500, 1000]);
  const row = result.signups[0];
  assert.equal(row.companyName, "Déclarée"); assert.equal(row.linkedCompanyName, "Compagnie réelle");
  assert.equal(row.accessGrantedAt, timestamp); assert.equal(row.paymentConfirmedAt, null);
  assert.equal(row.accountExists, true); assert.equal(row.accountCreatedAt, null); assert.equal(row.memberCount, 3);
});

test("une liste vide est vérifiée, les erreurs/migration manquante ne passent pas pour zéro inscription", async () => {
  assert.equal((await supervisionHarness({ length: 0 }).library.getAdminBetaSupervision()).error, null);
  for (const options of [{ connected: false }, { ready: false }, { ready: "true" }, { readyError: { code: "PGRST202" } },
    { error: { code: "PGRST202" } }, { error: { code: "500", message: "INTERNAL_DATABASE_SECRET" } },
    { throws: true }, { partial: true }, { noCount: true }, { oldSchema: true },
    { changedCount: true, length: 501 }, { duplicates: true, length: 501 }]) {
    const result = await supervisionHarness(options).library.getAdminBetaSupervision();
    assert.ok(result.error, JSON.stringify(options));
    assert.equal(result.signups.length, 0);
    assert.doesNotMatch(result.error, /INTERNAL_DATABASE_SECRET/);
  }
});

test("une limite API inférieure à la taille demandée ne saute aucune inscription", async () => {
  const { library, calls } = supervisionHarness({ length: 503, pageCap: 100 });
  const result = await library.getAdminBetaSupervision();
  assert.equal(result.error, null);
  assert.equal(result.signups.length, 503);
  assert.equal(new Set(result.signups.map((signup) => signup.id)).size, 503);
  assert.deepEqual(calls.filter((call) => Object.hasOwn(call, "start")).map((call) => call.start), [0, 100, 200, 300, 400, 500]);
});
