import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const source = (file) => readFileSync(new URL(`../../sql/${file}`, import.meta.url), "utf8");

test("Ressources : publications, brouillons, concurrence et fichiers sous RLS réel", { timeout: 90000 }, async (suite) => {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const editor = randomUUID(), superadmin = randomUUID(), catalogManager = randomUUID(), member = randomUUID(), readonly = randomUUID(), expired = randomUUID(), pending = randomUUID(), pastDue = randomUUID(), cancelled = randomUUID(), stranger = randomUUID();
  const pageId = randomUUID(), otherPage = randomUUID(), assetId = randomUUID(), draftAsset = randomUUID();
  const doc = (overrides = {}) => ({ version: 1, title: "Préparer sa diffusion", slug: "preparer-sa-diffusion", description: "Conseils", category: "Diffusion", visibility: "public", featured: false, coverAssetId: null, blocks: [{ id: randomUUID(), type: "text", text: "Une ressource publiée", tone: "plain" }], ...overrides });
  const scalar = async (tx, query, params = []) => Object.values((await tx.query(query, params)).rows[0] ?? {})[0];
  const as = async (id, run, operation = "storage.object.get_authenticated") => db.transaction(async (tx) => {
    await tx.exec(`set local role ${id ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id ?? "", role: id ? "authenticated" : "anon" })]);
    await tx.query("select set_config('storage.operation', $1, true)", [operation]);
    return run(tx);
  });
  const mutate = (id, content, revision, action = "save", actor = editor, history = null) => as(actor, (tx) => scalar(tx, "select public.mutate_resource_page($1,$2,$3,$4,$5)", [id, content, revision, action, history]));
  const visible = (table, actor, id = pageId) => as(actor, (tx) => tx.query(`select * from public.${table} where id=$1`, [id])).then((r) => r.rows);
  const objectVisible = (actor, asset = assetId, operation) => as(actor, (tx) => tx.query("select name from storage.objects where name=$1", [`${pageId}/${asset}.png`]), operation).then((r) => r.rows.length);
  const setEditor = (target, enabled, actor = superadmin) => as(actor, (tx) => scalar(tx, "select admin_set_resource_editor($1,$2)", [target,enabled]));
  const canEdit = (actor) => as(actor, (tx) => scalar(tx,"select can_edit_resources()"));
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;
      create function storage.operation() returns text language plpgsql stable as $$
        begin return current_setting('storage.operation',true); end;
      $$;
      -- Actual upstream Storage helper, tenant migration 0058, commit
      -- a69b0e6633b9a629e0d20d58b830d7ea0627cc83 (2026-03-27):
      -- https://github.com/supabase/storage/blob/a69b0e6633b9a629e0d20d58b830d7ea0627cc83/migrations/tenant/0058-operation-ergonomics.sql
      create function storage.allow_only_operation(expected_operation text)
      returns boolean language sql stable as $$
        with current_operation as (select storage.operation() as raw_operation), normalized as (
          select case when raw_operation like 'storage.%' then substr(raw_operation,9) else raw_operation end as current_operation,
            case when expected_operation like 'storage.%' then substr(expected_operation,9) else expected_operation end as requested_operation
          from current_operation
        ) select case when requested_operation is null or requested_operation='' then false
          else coalesce(current_operation=requested_operation,false) end from normalized;
      $$;
    `);
    for (const name of ["001_initial_schema.sql", "002_fix_company_signup_rls.sql", "009_billing_status_roles.sql", "020_stripe_billing.sql"]) await db.exec(source(name));
    // Apply the exact current billing statuses without unrelated signup/Auth RPCs.
    // company_has_access has one definition in the repository, migration 009;
    // it explicitly admits trial/active and unexpired comped only.
    await db.exec(source("087_pending_payment_signup.sql").split("-- Les policies métier historiques")[0]);
    await db.exec(source("013_super_admin.sql").split("-- Supervision")[0]);
    await db.exec(source("044_platform_admin_permissions.sql").split("create or replace function public.admin_list_platform_admins")[0]);
    await db.exec(source("091_resource_pages.sql"));
    await db.exec(source("091_resource_pages.sql"));
    await db.exec(source("092_resource_editors_and_archive.sql"));
    await db.exec(source("092_resource_editors_and_archive.sql"));
    for (const [id, role, status, until] of [[editor,"member","active",null],[superadmin,"owner","active",null],[catalogManager,"member","active",null],[member,"member","active",null],[readonly,"readonly","comped",null],[expired,"owner","comped","2000-01-01"],[pending,"owner","pending_payment",null],[pastDue,"owner","past_due",null],[cancelled,"owner","cancelled",null]]) {
      const company = randomUUID();
      await db.query("insert into auth.users(id,email) values($1,$2)", [id, `${id}@example.test`]);
      await db.query("insert into companies(id,name,billing_status,comped_until) values($1,'Compagnie de test',$2,$3)", [company,status,until]);
      await db.query("insert into profiles(id,company_id,role) values($1,$2,$3)", [id,company,role]);
    }
    await db.query("insert into auth.users(id,email) values($1,'sans-compagnie@example.test')", [stranger]);
    await db.query("insert into platform_admin_access(user_id,permissions) values($1,array['manage_catalogs'])", [catalogManager]);
    await db.query("update profiles set is_super_admin=true where id=$1", [superadmin]);

    await suite.test("droit explicite accordé seulement par superadmin, sans modifier le compte ni la compagnie", async () => {
      const identityBefore = await db.query("select * from profiles order by id");
      const companiesBefore = await db.query("select * from companies order by id");
      const platformBefore = await db.query("select * from platform_admin_access order by user_id");
      assert.equal(await canEdit(editor),false);
      assert.equal(await canEdit(catalogManager),false);
      assert.equal(await canEdit(superadmin),true);
      for (const actor of [editor, member, catalogManager, stranger]) {
        await assert.rejects(setEditor(editor,true,actor),/resource_editors_forbidden/);
        await assert.rejects(as(actor,(tx)=>tx.query("select * from admin_list_resource_editors()")),/resource_editors_forbidden/);
        await assert.rejects(as(actor,(tx)=>tx.query("select * from resource_editors")),/permission denied/);
      }
      await assert.rejects(setEditor(editor,true,null),/permission denied/);
      await assert.rejects(setEditor(randomUUID(),true),/resource_editor_missing/);
      await assert.rejects(setEditor(editor,null),/resource_editors_invalid/);
      await assert.rejects(setEditor(superadmin,false),/resource_editor_superadmin/);
      assert.equal(await setEditor(editor,true),true);
      assert.equal(await canEdit(editor),true);
      assert.equal(await as(editor,(tx)=>scalar(tx,"select is_super_admin_user()")),false);
      assert.equal(await as(editor,(tx)=>scalar(tx,"select is_platform_admin_user()")),false);
      const grant = await db.query("select * from resource_editors where user_id=$1",[editor]);
      assert.equal(grant.rows[0].granted_by,superadmin);
      await setEditor(editor,true);
      assert.deepEqual((await db.query("select * from resource_editors where user_id=$1",[editor])).rows,grant.rows);
      assert.deepEqual((await db.query("select * from profiles order by id")).rows,identityBefore.rows);
      assert.deepEqual((await db.query("select * from companies order by id")).rows,companiesBefore.rows);
      assert.deepEqual((await db.query("select * from platform_admin_access order by user_id")).rows,platformBefore.rows);
      await assert.rejects(as(superadmin,(tx)=>tx.query("insert into resource_editors(user_id) values($1)",[member])),/permission denied/);
    });

    await suite.test("annuaire réservé au superadmin, paginé avec comptes sans compagnie", async () => {
      await db.exec("insert into auth.users(id,email) select gen_random_uuid(),'compte-' || n || '@example.test' from generate_series(1,205) n");
      const first = await as(superadmin,(tx)=>tx.query("select * from admin_list_resource_editors(200,0)"));
      const second = await as(superadmin,(tx)=>tx.query("select * from admin_list_resource_editors(200,200)"));
      const rows = [...first.rows,...second.rows];
      assert.equal(first.rows.length,200);
      assert.equal(rows.length,await scalar(db,"select count(*)::int from auth.users"));
      assert.equal(new Set(rows.map(row=>row.user_id)).size,rows.length);
      const regularEditor = rows.find(row=>row.user_id===editor);
      assert.equal(regularEditor.can_edit,true); assert.equal(regularEditor.is_super_admin,false);
      assert.ok(regularEditor.granted_at);
      assert.equal(rows.find(row=>row.user_id===stranger).company_name,"");
      assert.equal(rows.find(row=>row.user_id===superadmin).can_edit,true);
      assert.equal(rows.find(row=>row.user_id===catalogManager).can_edit,false);
      await assert.rejects(as(superadmin,(tx)=>tx.query("select * from admin_list_resource_editors(201,0)")),/resource_editors_invalid/);
    });

    await suite.test("brouillon réservé à l’éditeur délégué, écritures directes refusées", async () => {
      const page = await mutate(pageId, doc(), null);
      assert.equal(page.revision, 1);
      assert.equal((await visible("resource_pages", editor)).length, 1);
      for (const id of [member, readonly, expired, pending, pastDue, cancelled, stranger, catalogManager]) {
        assert.equal((await visible("resource_pages", id)).length, 0);
        await assert.rejects(mutate(pageId, doc(), 1, "publish", id), /resource_forbidden/);
      }
      assert.equal((await visible("resource_publications", null)).length, 0);
      await assert.rejects(visible("resource_pages", null), /permission denied/);
      await assert.rejects(as(editor, (tx) => tx.query("update resource_pages set revision=100 where id=$1", [pageId])), /permission denied/);
      await assert.rejects(mutate(pageId, doc(), 1, "publish", null), /permission denied/);
    });

    await suite.test("fichiers privés immuables, publication autorise seulement ses propres références", async () => {
      for (const id of [assetId, draftAsset]) {
        const path = `${pageId}/${id}.png`;
        await as(editor, (tx) => tx.query("insert into storage.objects(bucket_id,name) values('resource-media',$1)", [path]), "object.upload");
        await as(editor, (tx) => tx.query("insert into resource_assets(id,page_id,name,mime_type,size,storage_path) values($1,$2,'Image.png','image/png',100,$3)", [id,pageId,path]));
      }
      assert.equal(await objectVisible(null), 0);
      assert.equal(await objectVisible(editor), 1);
      await mutate(pageId, doc({ coverAssetId: assetId }), 1, "publish");
      assert.equal(await objectVisible(null), 1);
      assert.equal(await objectVisible(null, draftAsset), 0);
      for (const op of ["object.sign", "object.sign_many", "object.get_public", "object.list", "object.copy"]) {
        assert.equal(await objectVisible(editor, assetId, op), 0, op);
        assert.equal(await objectVisible(member, assetId, op), 0, op);
      }
      assert.equal((await as(editor, (tx) => tx.query("update storage.objects set name='changed' returning id"))).rows.length, 0);
      assert.equal((await as(editor, (tx) => tx.query("delete from storage.objects returning id"), "object.delete_many")).rows.length, 0);
      await assert.rejects(as(editor, (tx) => tx.query("update resource_assets set page_id=$1 where id=$2", [otherPage,assetId])), /permission denied/);
      await assert.rejects(as(member, (tx) => tx.query("insert into storage.objects(bucket_id,name) values('resource-media',$1)", [`${pageId}/${randomUUID()}.png`]), "object.upload"), /row-level security/);
      const orphan = `${pageId}/${randomUUID()}.png`;
      await as(editor, (tx) => tx.query("insert into storage.objects(bucket_id,name) values('resource-media',$1)", [orphan]), "object.upload");
      assert.equal((await as(editor, (tx) => tx.query("delete from storage.objects where name=$1 returning id", [orphan]), "object.delete_many")).rows.length, 1);
    });

    await suite.test("opérations Storage réelles : préfixe normalisé, absence/partiel/signature refusés", async () => {
      for (const operation of ["object.get_authenticated", "storage.object.get_authenticated"]) assert.equal(await objectVisible(null, assetId, operation),1);
      for (const operation of ["", "object", "storage.object.sign", "storage.object.sign_many", "storage.object.get_signed"]) {
        assert.equal(await objectVisible(null, assetId, operation),0,operation);
        assert.equal(await objectVisible(editor, assetId, operation),0,operation);
      }
    });

    await suite.test("le nouveau brouillon ne fuite pas dans une page publique, les conflits gardent le contenu", async () => {
      const before = (await visible("resource_publications", null))[0];
      await mutate(pageId, doc({ title: "Brouillon secret", coverAssetId: draftAsset, visibility: "members" }), 2);
      assert.deepEqual((await visible("resource_publications", null))[0], before);
      assert.equal(await objectVisible(null, draftAsset), 0);
      await assert.rejects(mutate(pageId, doc(), 2, "publish"), /resource_conflict/);
      await assert.rejects(mutate(pageId, doc(), null), /resource_conflict/);
      assert.equal((await visible("resource_pages", editor))[0].revision, 3);
    });

    await suite.test("public vers membres révoque anonymes et compagnies expirées, lecteurs autorisés", async () => {
      await mutate(pageId, doc({ coverAssetId: assetId, visibility: "members" }), 3, "publish");
      for (const id of [null, expired, pending, pastDue, cancelled, stranger]) {
        assert.equal((await visible("resource_publications", id)).length, 0);
        assert.equal(await objectVisible(id), 0);
      }
      for (const id of [member, readonly, editor]) {
        assert.equal((await visible("resource_publications", id)).length, 1);
        assert.equal(await objectVisible(id), 1);
      }
      assert.equal((await as(member, (tx) => tx.query("select * from resource_revisions"))).rows.length, 0);
    });

    await suite.test("impossible de voler une pièce jointe ou une adresse réservée par une publication", async () => {
      await assert.rejects(mutate(otherPage, doc({ slug: "autre-page", coverAssetId: assetId }), null), /resource_asset_invalid/);
      const nested = [{ type: "columns", columns: [[{ type: "gallery", images: [{ assetId }] }], []] }];
      await assert.rejects(mutate(otherPage, doc({ slug: "autre-page", blocks: nested }), null), /resource_asset_invalid/);
      await assert.rejects(mutate(otherPage, doc(), null), /resource_slug_taken/);
      await assert.rejects(mutate(otherPage, doc(), null, "publish"), /resource_slug_taken/);
      await mutate(pageId, doc({ slug: "nouvelle-adresse", visibility: "members" }), 4);
      await assert.rejects(mutate(otherPage, doc(), null), /resource_slug_taken/);
      await assert.rejects(mutate(otherPage, doc(), null, "publish"), /resource_slug_taken/);
      await mutate(otherPage, doc({ slug: "autre-page" }), null);
    });

    await suite.test("historique et restauration isolés, retrait atomique révoque le fichier", async () => {
      const versions = await as(editor, (tx) => tx.query("select * from resource_revisions where page_id=$1 order by revision", [pageId]));
      assert.equal(versions.rows.length, 5);
      await assert.rejects(mutate(otherPage, null, 1, "restore", editor, versions.rows[0].id), /resource_revision_missing/);
      const restored = await mutate(pageId, null, 5, "restore", editor, versions.rows[0].id);
      assert.equal(restored.revision, 6);
      assert.equal(restored.draft.visibility, "public");
      assert.equal((await visible("resource_publications", null)).length, 0, "restoring a draft must not republish it");
      await assert.rejects(mutate(pageId, null, 5, "unpublish"), /resource_conflict/);
      const removed = await mutate(pageId, null, 6, "unpublish");
      assert.equal(removed.published_at, null);
      assert.equal((await visible("resource_publications", member)).length, 0);
      assert.equal(await objectVisible(member), 0);
      assert.equal(await objectVisible(editor), 1);
      await assert.rejects(mutate(pageId, null, 6, "unpublish"), /resource_conflict/);
      await assert.rejects(mutate(pageId, doc(), 6, "publish"), /resource_conflict/);
      assert.equal((await visible("resource_publications", null)).length, 0);
    });

    await suite.test("archivage réversible : publication retirée, fichiers conservés et conflit protégé", async () => {
      const published = await mutate(pageId,doc({ coverAssetId:assetId }),7,"publish");
      assert.equal(published.revision,8);
      const beforeAssets = await db.query("select * from resource_assets where page_id=$1 order by id",[pageId]);
      const beforeHistory = await scalar(db,"select count(*)::int from resource_revisions where page_id=$1",[pageId]);
      await assert.rejects(mutate(pageId,null,7,"archive"),/resource_conflict/);
      await assert.rejects(mutate(pageId,null,8,"archive",member),/resource_forbidden/);
      const archived = await mutate(pageId,null,8,"archive");
      assert.ok(archived.archived_at); assert.equal(archived.published_at,null); assert.equal(archived.revision,9);
      for (const actor of [null,member,readonly]) { assert.equal((await visible("resource_publications",actor)).length,0); assert.equal(await objectVisible(actor),0); }
      assert.equal(await objectVisible(editor),1);
      assert.deepEqual((await db.query("select * from resource_assets where page_id=$1 order by id",[pageId])).rows,beforeAssets.rows);
      assert.equal(await scalar(db,"select count(*)::int from resource_revisions where page_id=$1",[pageId]),beforeHistory+1);
      for (const action of ["save","publish","unpublish","restore","archive"]) await assert.rejects(mutate(pageId,doc(),9,action),/resource_archived/);
      await assert.rejects(mutate(pageId,null,8,"unarchive"),/resource_conflict/);
      await assert.rejects(as(editor,(tx)=>tx.query("insert into storage.objects(bucket_id,name) values('resource-media',$1)",[`${pageId}/${randomUUID()}.png`]),"object.upload"),/row-level security/);
      const restored = await mutate(pageId,null,9,"unarchive");
      assert.equal(restored.archived_at,null); assert.equal(restored.published_at,null); assert.equal(restored.revision,10);
      assert.deepEqual(restored.draft,archived.draft);
      assert.equal(await objectVisible(member),0);
      await assert.rejects(mutate(pageId,null,10,"unarchive"),/resource_not_archived/);
      await mutate(pageId,restored.draft,10,"publish");
      assert.equal(await objectVisible(null),1);
    });

    await suite.test("révocation immédiate sur brouillons, fichiers privés et mutations sans effet sur le compte", async () => {
      const accountBefore = await db.query("select * from profiles where id=$1",[editor]);
      await setEditor(editor,false);
      assert.equal(await canEdit(editor),false);
      assert.equal((await visible("resource_pages",editor)).length,0);
      assert.equal(await objectVisible(editor,draftAsset),0);
      await assert.rejects(mutate(pageId,doc(),11,"save"),/resource_forbidden/);
      await assert.rejects(mutate(pageId,null,11,"archive"),/resource_forbidden/);
      assert.deepEqual((await db.query("select * from profiles where id=$1",[editor])).rows,accountBefore.rows);
      await setEditor(editor,true);
      assert.equal(await canEdit(editor),true);
      assert.equal((await visible("resource_pages",editor)).length,1);
      assert.equal(await objectVisible(editor,draftAsset),1);
      await setEditor(stranger,true);
      assert.equal(await canEdit(stranger),true,"an editor entitlement does not require a company or paid access");
      assert.equal(await scalar(db,"select count(*)::int from profiles where id=$1",[stranger]),0);
      await setEditor(stranger,false);
    });

    await suite.test("publication invalide, nouvel identifiant concurrent et bucket public refusés", async () => {
      await assert.rejects(mutate(randomUUID(), doc({ slug: "vide", blocks: [] }), null, "publish"), /resource_invalid/);
      await assert.rejects(mutate(randomUUID(), doc({ slug: "invalide", visibility: "everyone" }), null), /resource_invalid/);
      assert.equal(await scalar(db, "select public from storage.buckets where id='resource-media'"), false);
      const fresh = randomUUID();
      await mutate(fresh, doc({ slug: "concurrence" }), null);
      await assert.rejects(mutate(fresh, doc({ slug: "concurrence" }), null), /resource_conflict/);
    });
  } finally { await db.close(); }
});
