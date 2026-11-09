import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";

const member = { id: "12345678-1234-4123-8123-123456789012", email_confirmed_at: "2026-10-21T12:00:00Z" };
const assetPath = "/api/resources/assets/12345678-1234-4123-8123-123456789013";

function proxyHarness({ user = null, refresh = false, connected = true } = {}) {
  const trace = { authReads: 0, clients: 0, incomingCookies: [] };
  const modules = {
    "next/server": { NextResponse },
    "@supabase/ssr": { createServerClient: (url, key, options) => {
      assert.equal(url, "http://127.0.0.1:54321");
      assert.equal(key, "resource-navigation-fixture");
      trace.clients++;
      return { auth: { async getUser() {
        trace.authReads++;
        trace.incomingCookies.push(options.cookies.getAll());
        if (refresh) options.cookies.setAll([{ name: "sb-session", value: user ? "renewed-session" : "", options: { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: user ? 3600 : 0 } }]);
        return { data: { user }, error: null };
      } } };
    } },
    "@/lib/env": { isLocalE2eMode: () => false },
    "@/lib/maintenance": { getMaintenanceTokenResponse: () => null, isMaintenanceBypassed: () => false, isMaintenanceModeActive: async () => false },
  };
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports, process: { env: connected ? { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "resource-navigation-fixture" } : {} }, require(name) { assert.ok(name in modules, name); return modules[name]; } });
  return { trace, async visit(path) {
    const request = new NextRequest(new URL(path, "https://tadiff.test"), { headers: { cookie: "sb-session=old-session; other-cookie=keep" } });
    const response = await exports.proxy(request);
    return { request, response };
  } };
}

test("ressources publiques et fichiers : le visiteur anonyme continue sans redirection", async () => {
  const h = proxyHarness();
  for (const path of ["/ressources", "/ressources/guide-diffusion", "/api/resources", "/api/resources/assets", assetPath]) {
    const { response } = await h.visit(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(response.headers.get("location"), null, path);
  }
  assert.equal(h.trace.authReads, 5);
  assert.equal(h.trace.clients, 5);
});

test("session membre renouvelée : cookie transmis au navigateur et à la page HTML", async () => {
  const h = proxyHarness({ user: member, refresh: true });
  const { request, response } = await h.visit("/ressources/guide-diffusion");
  assert.equal(h.trace.authReads, 1);
  assert.equal(h.trace.incomingCookies[0].find((cookie) => cookie.name === "sb-session").value, "old-session");
  assert.equal(request.cookies.get("sb-session").value, "renewed-session");
  assert.equal(response.cookies.get("sb-session").value, "renewed-session");
  assert.equal(response.cookies.get("sb-session").httpOnly, true);
  assert.match(response.headers.get("x-middleware-request-cookie"), /sb-session=renewed-session/);
  assert.match(response.headers.get("x-middleware-request-cookie"), /other-cookie=keep/);
  assert.equal(response.headers.get("location"), null);
});

test("session membre renouvelée : cookie transmis à l’API de lecture et d’import", async () => {
  const h = proxyHarness({ user: member, refresh: true });
  for (const path of [assetPath, "/api/resources/assets"]) {
    const { request, response } = await h.visit(path);
    assert.equal(request.cookies.get("sb-session").value, "renewed-session");
    assert.equal(response.cookies.get("sb-session").value, "renewed-session");
    assert.match(response.headers.get("x-middleware-request-cookie"), /sb-session=renewed-session/);
    assert.equal(response.headers.get("location"), null);
  }
  assert.equal(h.trace.authReads, 2);
});

test("session expirée : la suppression du cookie reste propagée sur une page publique", async () => {
  const h = proxyHarness({ user: null, refresh: true });
  const { request, response } = await h.visit("/ressources/guide-diffusion");
  assert.equal(request.cookies.get("sb-session").value, "");
  assert.equal(response.cookies.get("sb-session").maxAge, 0);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
});

test("bibliothèque du cockpit et administration : connexion exigée pour les anonymes", async () => {
  const h = proxyHarness();
  for (const path of ["/resources", "/resources/ancienne-page", "/admin", "/admin/resources", "/admin/resources/nouvelle"]) {
    const { response } = await h.visit(path);
    assert.equal(response.status, 307, path);
    const target = new URL(response.headers.get("location"));
    assert.equal(target.pathname, "/login");
    assert.equal(target.searchParams.get("next"), path);
  }
  assert.equal(h.trace.authReads, 5);
});

test("les autres pages publiques et les préfixes voisins ne déclenchent aucune session", async () => {
  const h = proxyHarness({ user: member, refresh: true });
  for (const path of ["/", "/beta", "/login", "/ressources-annexe", "/api/resources-other", "/api/resourcesx/assets"]) {
    const { request, response } = await h.visit(path);
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("location"), null);
    assert.equal(request.cookies.get("sb-session").value, "old-session");
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(h.trace.clients, 0);
  assert.equal(h.trace.authReads, 0);
});

test("environnement déconnecté : aucune tentative de client ou de renouvellement", async () => {
  const h = proxyHarness({ connected: false });
  for (const path of ["/ressources", assetPath]) assert.equal((await h.visit(path)).response.headers.get("x-middleware-next"), "1");
  assert.equal(h.trace.clients, 0);
  assert.equal(h.trace.authReads, 0);
});
