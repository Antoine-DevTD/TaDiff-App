import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../../app/api/beta-launch-calendar/route.ts";

test("fournit un evenement agenda pour le 6 aout a 10 h", async () => {
  const response = GET();
  const calendar = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/calendar/);
  assert.match(
    response.headers.get("content-disposition"),
    /ouverture-beta-tadiff\.ics/,
  );
  assert.match(calendar, /DTSTART:20260806T080000Z/);
  assert.match(calendar, /DTEND:20260806T090000Z/);
  assert.match(calendar, /SUMMARY:Ouverture de la bêta TaDiff/);
});
