import assert from "node:assert/strict";
import test from "node:test";

const apiUrl = "http://127.0.0.1:54321";
const publishableKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

async function createWorkspace(label) {
  const email = `rls-${crypto.randomUUID()}@tadiff.test`;
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Test-local-2026!", data: { full_name: label, company_name: `Compagnie ${label}` } }),
  });
  assert.equal(response.ok, true, await response.clone().text());
  const auth = await response.json();
  const headers = { apikey: publishableKey, authorization: `Bearer ${auth.access_token}`, "content-type": "application/json" };
  const workspace = await fetch(`${apiUrl}/rest/v1/rpc/ensure_workspace`, { method: "POST", headers, body: JSON.stringify({ company_name: `Compagnie ${label}` }) });
  assert.equal(workspace.ok, true, await workspace.clone().text());
  return { companyId: await workspace.json(), headers };
}

test("isole le matériel entre deux compagnies", { skip: process.env.TADIFF_LOCAL_SUPABASE !== "1" }, async () => {
  const owner = await createWorkspace("Matériel A");
  const outsider = await createWorkspace("Matériel B");
  const showResponse = await fetch(`${apiUrl}/rest/v1/shows`, { method: "POST", headers: { ...owner.headers, Prefer: "return=representation" }, body: JSON.stringify({ company_id: owner.companyId, title: "Spectacle RLS", discipline: "Théâtre", status: "Creation" }) });
  assert.equal(showResponse.ok, true, await showResponse.clone().text());
  const [show] = await showResponse.json();
  const itemResponse = await fetch(`${apiUrl}/rest/v1/show_material_items`, { method: "POST", headers: { ...owner.headers, Prefer: "return=representation" }, body: JSON.stringify({ company_id: owner.companyId, show_id: show.id, name: "Costume isolé", category: "costume", quantity_owned: 1, unit: "pièce", unit_cost: 50 }) });
  assert.equal(itemResponse.ok, true, await itemResponse.clone().text());
  const [item] = await itemResponse.json();

  const outsiderRead = await fetch(`${apiUrl}/rest/v1/show_material_items?id=eq.${item.id}`, { headers: outsider.headers });
  assert.deepEqual(await outsiderRead.json(), []);
  const outsiderUpdate = await fetch(`${apiUrl}/rest/v1/show_material_items?id=eq.${item.id}`, { method: "PATCH", headers: { ...outsider.headers, Prefer: "return=representation" }, body: JSON.stringify({ name: "Accès interdit" }) });
  assert.equal(outsiderUpdate.ok, true);
  assert.deepEqual(await outsiderUpdate.json(), []);
  const ownerRead = await fetch(`${apiUrl}/rest/v1/show_material_items?id=eq.${item.id}&select=name`, { headers: owner.headers });
  assert.deepEqual(await ownerRead.json(), [{ name: "Costume isolé" }]);
});
