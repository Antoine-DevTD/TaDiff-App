import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function harness({ destination = "/resources/manage", editor = true, confirmed = true, signedIn = true, permissionError = null } = {}) {
  const calls = [], messages = [], navigations = [];
  const client = {
    auth: {
      signInWithPassword: async () => ({ error: null }),
      getUser: async () => ({ data: { user: signedIn ? { id: "editor", email_confirmed_at: confirmed ? "2026-11-08" : null, user_metadata: {} } : null } }),
    },
    rpc: async (name) => { calls.push(name); return name === "can_edit_resources" ? { data: editor, error: permissionError } : { error: null }; },
  };
  const modules = {
    "@/lib/supabase/client": { getSupabaseBrowserClient: () => client },
    "@hookform/resolvers/zod": { zodResolver: () => null },
    "@/lib/validation/auth": { loginSchema: {} },
    "next/navigation": { useRouter: () => ({ push: (path) => navigations.push(path), refresh: () => {} }), useSearchParams: () => ({ get: () => destination }) },
    react: { useState: () => [null, (message) => messages.push(message)] },
    "react-hook-form": { useForm: () => ({ register: () => ({}), handleSubmit: (submit) => submit, formState: { errors: {}, isSubmitting: false } }) },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/input": { Input: "input" },
  };
  function load(file) {
    const exports = {};
    const code = ts.transpileModule(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports, URL, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "http://local.test" } }, fetch: async () => ({}), require: (name) => { assert.ok(name in modules, name); return modules[name]; } });
    return exports;
  }
  modules["@/lib/supabase/client-workspace"] = load("lib/supabase/client-workspace.ts");
  const form = load("components/forms/login-form.tsx").LoginForm();
  return { calls, messages, navigations, submit: () => form.props.onSubmit({ email: "editor@example.test", password: "fixture" }) };
}

test("connexion éditoriale : un éditeur sans compagnie rejoint sa page sans provisionnement", async () => {
  for (const destination of ["/resources/manage", "/resources/manage/page-id?preview=1#page"]) {
    const h = harness({ destination }); await h.submit();
    assert.deepEqual(h.calls, ["can_edit_resources"]);
    assert.deepEqual(h.navigations, [destination]); assert.deepEqual(h.messages, []);
  }
});

test("connexion éditoriale : absence de droit, panne ou session non confirmée ne créent aucun espace", async () => {
  for (const options of [{ editor: false }, { permissionError: { message: "private detail" } }, { confirmed: false }, { signedIn: false }]) {
    const h = harness(options); await h.submit();
    assert.ok(!h.calls.includes("ensure_workspace")); assert.deepEqual(h.navigations, []);
    assert.equal(h.messages.length, 1); assert.doesNotMatch(h.messages[0], /private detail/);
  }
});

test("connexion habituelle : le droit éditorial ne contourne pas le parcours compagnie", async () => {
  for (const destination of [null, "/dashboard", "/resources", "/resources/manage-other", "/resources/manage/../dashboard", "//other.test/resources/manage"]) {
    const h = harness({ destination }); await h.submit();
    assert.deepEqual(h.calls, ["ensure_workspace"]);
  }
});
