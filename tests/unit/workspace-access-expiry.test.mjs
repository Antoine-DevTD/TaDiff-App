import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../../lib/supabase/access.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function computeInTimezone(timeZone, now, until, status = "comped") {
  const script = `
    import vm from 'node:vm';
    class FixedDate extends Date {
      constructor(...args) { super(...(args.length ? args : [${JSON.stringify(now)}])); }
      static now() { return Date.parse(${JSON.stringify(now)}); }
    }
    const exports = {};
    vm.runInNewContext(${JSON.stringify(source)}, {
      exports, Date: FixedDate,
      require(name) {
        if (name === 'react') return { cache: fn => fn };
        if (name === '@/lib/env') return { hasSupabaseEnv: () => false };
        if (name === '@/lib/supabase/server') return {};
        throw new Error(name);
      }
    });
    process.stdout.write(JSON.stringify({ actualZone: Intl.DateTimeFormat().resolvedOptions().timeZone, result: exports.computeHasAccess(${JSON.stringify(status)}, ${JSON.stringify(until)}) }));
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", env: { ...process.env, TZ: timeZone } });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}

test("un accès offert reste valable jusqu’à minuit UTC, même sur un serveur à Paris", () => {
  for (const zone of ["UTC", "Europe/Paris"]) {
    for (const [now, expected] of [["2026-09-27T23:59:59.999Z", true], ["2026-09-28T00:00:00.000Z", false]]) {
      const result = computeInTimezone(zone, now, "2026-09-27");
      assert.equal(result.actualZone, zone);
      assert.equal(result.result, expected, `${zone} à ${now}`);
    }
  }
});

test("l’échéance passée reste expirée dans un fuseau à l’ouest de UTC", () => {
  const result = computeInTimezone("America/New_York", "2026-09-28T00:00:00.000Z", "2026-09-27");
  assert.equal(result.actualZone, "America/New_York");
  assert.equal(result.result, false);
});

test("null conserve l’accès permanent ; toute date mal formée est refusée", () => {
  const now = "2026-02-28T12:00:00.000Z";
  assert.equal(computeInTimezone("UTC", now, null).result, true);
  for (const until of ["", "invalide", "2026-02-30", "2026-13-01", "2026-2-28", "2026-02-28T23:59:59Z"]) {
    assert.equal(computeInTimezone("UTC", now, until).result, false, until);
  }
  assert.equal(computeInTimezone("UTC", now, "2028-02-29").result, true);
  assert.equal(computeInTimezone("UTC", now, "2025-12-31").result, false);
});
