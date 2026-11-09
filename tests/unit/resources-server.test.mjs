import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

const pageId = randomUUID(), assetId = randomUUID();
const document = { version: 1, title: "Guide de diffusion", slug: "guide-diffusion", description: "Conseils", category: "Diffusion", visibility: "public", featured: false, coverAssetId: null, blocks: [{ id: randomUUID(), type: "text", text: "Une ressource", tone: "plain" }] };
const page = { id: pageId, draft: document, revision: 2, published_at: "2026-10-21T12:00:00Z", updated_at: "2026-10-21T12:00:00Z", created_at: "2026-10-21T11:00:00Z" };
const asset = { id: assetId, page_id: pageId, name: 'Modèle "test".png', mime_type: "image/png", size: 8, storage_path: `${pageId}/${assetId}.png`, created_at: page.created_at };
function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; }, URL, Request, Response, File, Blob, FormData, TextEncoder, TextDecoder, Uint8Array });
  return exports;
}
const model = load("lib/resources.ts", { zod: { z } });
function harness(options = {}) {
  const calls = [];
  let assetRead = 0;
  const db = {
    auth: { async getUser() { calls.push(["auth"]); return { data: { user: options.signedOut ? null : { id: randomUUID() } }, error: options.authError ?? null }; } },
    async rpc(name, args) {
      calls.push(["rpc",name,args]);
      if (name === "can_edit_resources") return { data: options.editor ?? true, error: options.permissionError ?? null };
      if (name === "is_super_admin_user") return { data: options.superadmin ?? true, error: options.permissionError ?? null };
      if (name === "admin_list_resource_editors") {
        return { data: (options.accountRows ?? []).slice(args.p_offset,args.p_offset+args.p_limit), error: options.accountLoadError && args.p_offset >= (options.accountErrorOffset ?? 0) ? {message:"private directory error"} : null };
      }
      if (name === "admin_set_resource_editor") {
        if (options.setThrows) throw new Error("private write detail");
        return { data: options.setData ?? true, error: options.setError ?? null };
      }
      assert.equal(name, "mutate_resource_page");
      if (options.mutateThrows) throw new Error("secret connection detail");
      return { data: options.mutateData ?? page, error: options.mutateError ?? null };
    },
    from(table) {
      const call = { table }; calls.push(call);
      const query = {
        select(columns) { call.columns = columns; return query; },
        eq(column,value) { call.filter = [column,value]; return query; },
        order() { return query; },
        insert(value) { call.insert = value; return query; },
        async range(from,to) {
          call.range = [from,to];
          const rows = options.rows ?? (table === "resource_pages" ? [page] : table === "resource_publications" ? [{ id: pageId, document, published_at: page.published_at, updated_at: page.updated_at }] : table === "resource_assets" ? [asset] : []);
          return { data: rows.slice(from,to+1), error: options.loadError ?? null };
        },
        async maybeSingle() {
          if (table === "resource_assets") assetRead++;
          const data = options.missing || (options.revokeDuringDownload && assetRead > 1) ? null : table === "resource_pages" ? page : table === "resource_assets" ? asset : { id: pageId, document, published_at: page.published_at, updated_at: page.updated_at };
          return { data, error: options.loadError ?? null };
        },
        async single() { return { data: { ...asset, ...call.insert }, error: options.insertError ?? null }; },
      };
      return query;
    },
    storage: { from(bucket) { assert.equal(bucket,"resource-media"); return {
      async upload(path,bytes,config) { calls.push(["upload",path,bytes,config]); return { data: { path }, error: options.uploadError ?? null }; },
      async remove(paths) { calls.push(["remove",paths]); return { data: [], error: null }; },
      async download(path) { calls.push(["download",path]); return { data: new Blob([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])]), error: options.downloadError ?? null }; },
    }; } },
  };
  const dependencies = { "server-only": {}, react: { cache: (fn) => fn }, "node:crypto": { randomUUID }, "next/cache": { unstable_noStore() {}, revalidatePath: (...args) => calls.push(["revalidate",...args]) }, "@/lib/env": { hasSupabaseEnv: () => options.connected ?? true }, "@/lib/resources": model, "@/lib/supabase/server": { getSupabaseServerClient: async () => db } };
  const server = load("lib/resources-server.ts", dependencies);
  dependencies["@/lib/resources-server"] = server;
  const editorServer = load("lib/resource-editors-server.ts", dependencies);
  dependencies["@/lib/resource-editors-server"] = editorServer;
  return { calls, server, editorServer, accessActions: load("app/(dashboard)/admin/resources/access-actions.ts", dependencies), actions: load("app/(dashboard)/admin/resources/actions.ts", dependencies), upload: load("app/api/resources/assets/route.ts", dependencies), read: load("app/api/resources/assets/[id]/route.ts", dependencies) };
}
const save = (h, input = {}) => h.actions.saveResourcePage({ id: pageId, document, expectedRevision: 1, ...input });
const uploadRequest = (file, page = pageId, requestHeaders = {}) => {
  const form = new FormData(); form.set("pageId",page); form.set("file",file);
  return new Request("https://tadiff.example/api/resources/assets", { method: "POST", body: form, headers: { origin: "https://tadiff.example", ...requestHeaders } });
};
const readRequest = (download = false) => new Request(`https://tadiff.example/api/resources/assets/${assetId}${download ? "?download=1" : ""}`);

test("sans configuration ou permission : aucune fausse réussite et aucun appel aux données", async () => {
  for (const options of [{ connected: false }, { editor: false }, { signedOut: true }]) {
    const h = harness(options);
    assert.equal((await save(h)).ok,false);
    assert.equal((await h.server.listResourcePages()).data.length,0);
    assert.equal(h.calls.some((call) => call.table || call[1] === "mutate_resource_page"),false);
  }
  const h = harness({ connected: false });
  assert.ok((await h.server.listPublishedResources()).error);
  assert.equal((await h.read.GET(readRequest(),{ params: Promise.resolve({id:assetId}) })).status,503);
});

test("enregistrement validé, conflit explicite, adresse unique et erreurs sans détails internes", async () => {
  const h = harness();
  assert.equal((await save(h,{publish:true})).ok,true);
  const rpc = h.calls.find((call) => call[1] === "mutate_resource_page");
  assert.equal(rpc[2].p_action,"publish"); assert.equal(rpc[2].p_expected_revision,1);
  assert.equal((await save(harness({mutateError:{code:"PT409",message:"resource_conflict"}}))).conflict,true);
  assert.match((await save(harness({mutateError:{code:"23505"}}))).message,/adresse/);
  assert.match((await save(harness({mutateError:{message:"resource_asset_invalid"}}))).message,/pièce jointe/);
  const failed = await save(harness({mutateThrows:true})); assert.equal(failed.ok,false); assert.equal(failed.message.includes("secret"),false);
  assert.equal((await save(harness({mutateData:{...page,revision:undefined}}))).ok,false);
});

test("validation et versions empêchent les mutations incohérentes avant RPC", async () => {
  const h = harness();
  for (const input of [{id:"bad"},{expectedRevision:undefined},{document:{...document,visibility:"all"}},{document:{...document,blocks:[]},publish:true},{publish:"yes"}]) assert.equal((await save(h,input)).ok,false);
  assert.equal((await h.actions.unpublishResourcePage(pageId,0)).ok,false);
  assert.equal((await h.actions.restoreResourceRevision(pageId,"bad",1)).ok,false);
  assert.equal(h.calls.some((call) => call[1] === "mutate_resource_page"),false);
  assert.equal((await h.actions.restoreResourceRevision(pageId,randomUUID(),1)).ok,true);
  assert.equal(h.calls.find((call) => call[1] === "mutate_resource_page")[2].p_action,"restore");
});

test("lectures de publications exclusivement, pagination complète et absence d’erreur masquée", async () => {
  const h = harness({editor:false});
  assert.equal((await h.server.getPublishedResource("guide-diffusion")).data.document.title,document.title);
  assert.equal(h.calls.some((call) => call.table === "resource_pages"),false);
  const many = harness({rows:Array.from({length:205},()=>page)});
  assert.equal((await many.server.listResourcePages()).data.length,205);
  assert.equal(many.calls.filter((call) => call.range).length,2);
  assert.ok((await harness({loadError:{message:"secret detail"}}).server.listPublishedResources()).error);
});

test("upload vérifie origine, format réel, limite, page enregistrée et immutabilité", async () => {
  const png = new File([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])],"Image.png",{type:"image/png"});
  const h = harness(); const result = await h.upload.POST(uploadRequest(png));
  assert.equal(result.status,201); assert.equal((await result.json()).ok,true);
  assert.equal(h.calls.find((call) => call[0] === "upload")[3].upsert,false);
  const wrong = harness();
  assert.equal((await wrong.upload.POST(uploadRequest(new File(["<svg>"],"image.png",{type:"image/png"})))).status,400);
  assert.equal(wrong.calls.some((call) => call[0] === "upload"),false);
  assert.equal((await harness().upload.POST(uploadRequest(png,pageId,{origin:"https://hostile.example"}))).status,403);
  assert.equal((await harness().upload.POST(uploadRequest(png,pageId,{"content-length":String(5*1024*1024)}))).status,413);
  assert.equal((await harness({missing:true}).upload.POST(uploadRequest(png))).status,400);
  const cleanup = harness({insertError:{message:"failed"}});
  assert.equal((await cleanup.upload.POST(uploadRequest(png))).status,503);
  assert.equal(cleanup.calls.some((call) => call[0] === "remove"),true);
  assert.equal((await harness().upload.POST(uploadRequest(new File(["A,B\n1,2"],"table.csv",{type:""})))).status,201);
});

test("fichiers : diffusion sans cache ni URL signée, retrait pendant lecture et noms sûrs", async () => {
  const h = harness();
  const response = await h.read.GET(readRequest(),{params:Promise.resolve({id:assetId})});
  assert.equal(response.status,200);
  assert.match(response.headers.get("cache-control"),/no-store/);
  assert.equal(response.headers.get("content-type"),"image/png");
  assert.match(response.headers.get("content-disposition"),/^inline; filename="Modele _test_\.png";/);
  assert.equal((await response.arrayBuffer()).byteLength,8);
  const download = await h.read.GET(readRequest(true),{params:Promise.resolve({id:assetId})});
  assert.match(download.headers.get("content-disposition"),/^attachment/);
  for (const opts of [{missing:true},{downloadError:{message:"denied"}},{revokeDuringDownload:true}]) assert.equal((await harness(opts).read.GET(readRequest(),{params:Promise.resolve({id:assetId})})).status,404);
});

test("archivage et restauration : révision obligatoire, état transmis et publications jamais implicites", async () => {
  const h = harness({ mutateData: { ...page, revision:3, published_at:null, archived_at:"2026-10-21T14:30:00Z" } });
  assert.equal((await h.actions.archiveResourcePage(pageId,0)).ok,false);
  assert.equal((await h.actions.restoreArchivedResourcePage(pageId,NaN)).ok,false);
  assert.equal(h.calls.some(call=>call[1]==="mutate_resource_page"),false);
  const result = await h.actions.archiveResourcePage(pageId,2);
  assert.equal(result.ok,true); assert.ok(result.page.archived_at); assert.equal(result.page.published_at,null);
  const rpc = h.calls.find(call=>call[1]==="mutate_resource_page");
  assert.equal(rpc[2].p_action,"archive"); assert.equal(rpc[2].p_expected_revision,2); assert.equal(rpc[2].p_document,null);
  assert.ok(h.calls.some(call=>call[0]==="revalidate" && call[1]==="/resources/manage"));
  assert.ok(h.calls.some(call=>call[0]==="revalidate" && call[1]==="/resources/manage/[id]"));
  const restored = harness({mutateData:{...page,archived_at:null,published_at:null}});
  assert.equal((await restored.actions.restoreArchivedResourcePage(pageId,3)).ok,true);
  assert.equal(restored.calls.find(call=>call[1]==="mutate_resource_page")[2].p_action,"unarchive");
  assert.match((await save(harness({mutateError:{message:"resource_archived"}}))).message,/archivée/);
  assert.equal((await harness({mutateError:{code:"PT409",message:"resource_conflict"}}).actions.archiveResourcePage(pageId,1)).conflict,true);
  assert.equal(h.server.parseResourcePage(page).archived_at,null,"compatibility for older fixtures");
  assert.equal(h.server.parseResourcePage({...page,archived_at:42}),null);
});

test("droits indépendants : attribution superadmin uniquement, sans écriture de profil ou de compagnie", async () => {
  for (const settings of [{connected:false},{superadmin:false,editor:true},{signedOut:true},{permissionError:{message:"denied"}}]) {
    const h = harness(settings);
    assert.equal((await h.accessActions.setResourceEditorAccess(assetId,true)).ok,false);
    assert.ok((await h.editorServer.listResourceEditorAccounts()).error);
    assert.equal(h.calls.some(call=>["admin_set_resource_editor","admin_list_resource_editors"].includes(call[1])),false);
  }
  const h = harness({superadmin:true,editor:false});
  assert.equal((await h.accessActions.setResourceEditorAccess("bad",true)).ok,false);
  assert.equal((await h.accessActions.setResourceEditorAccess(assetId,"true")).ok,false);
  assert.equal((await h.accessActions.setResourceEditorAccess(assetId,true)).ok,true);
  assert.equal((await h.accessActions.setResourceEditorAccess(assetId,false)).ok,true);
  const calls = h.calls.filter(call=>call[1]==="admin_set_resource_editor");
  assert.equal(calls.length,2); assert.equal(calls[0][2].p_user_id,assetId); assert.equal(calls[0][2].p_can_edit,true); assert.equal(calls[1][2].p_can_edit,false);
  assert.equal(h.calls.some(call=>call.table),false);
  assert.ok(h.calls.some(call=>call[0]==="revalidate" && call[1]==="/resources/manage"));
  assert.match((await harness({setError:{message:"resource_editor_superadmin"}}).accessActions.setResourceEditorAccess(assetId,false)).message,/superadministrateur/);
  assert.match((await harness({setError:{message:"resource_editor_missing"}}).accessActions.setResourceEditorAccess(assetId,true)).message,/n’existe plus/);
  assert.equal((await harness({setData:false}).accessActions.setResourceEditorAccess(assetId,true)).ok,false);
  const failed = await harness({setThrows:true}).accessActions.setResourceEditorAccess(assetId,true);
  assert.equal(failed.ok,false); assert.equal(failed.message.includes("private"),false);
});

test("annuaire complet : pagination, sérialisation, rejet des lectures partielles ou incohérentes", async () => {
  const rows = Array.from({length:205},(_,index)=>({user_id:randomUUID(),full_name:`Personne ${index}`,email:`test-${index}@example.test`,company_name:index ? "Compagnie" : "",is_super_admin:index===1,can_edit:index<2,granted_at:index===0 ? "2026-10-21T14:30:00Z" : null}));
  const h = harness({accountRows:rows});
  const result = await h.editorServer.listResourceEditorAccounts();
  assert.equal(result.error,null); assert.equal(result.data.length,205); assert.equal(result.data[0].companyName,"");
  assert.equal(result.data[0].userId,rows[0].user_id); assert.equal(result.data[0].grantedAt,rows[0].granted_at);
  assert.equal(result.data[1].isSuperAdmin,true); assert.equal(result.data[1].canEdit,true);
  assert.equal(h.calls.filter(call=>call[1]==="admin_list_resource_editors").length,2);
  const partial = await harness({accountRows:rows,accountLoadError:true,accountErrorOffset:200}).editorServer.listResourceEditorAccounts();
  assert.equal(partial.data.length,0); assert.ok(partial.error);
  for (const badRows of [[rows[0],rows[0]],[{...rows[0],can_edit:"yes"}]]) {
    const invalid = await harness({accountRows:badRows}).editorServer.listResourceEditorAccounts();
    assert.equal(invalid.data.length,0); assert.ok(invalid.error);
  }
});
