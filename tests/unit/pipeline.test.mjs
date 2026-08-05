import assert from "node:assert/strict";
import test from "node:test";
import { calculateCompanyRevenue } from "../../lib/pipeline.ts";

test("multiplie le minimum garanti defini par representation", () => {
  assert.equal(calculateCompanyRevenue({
    exploitationMode: "corealisation",
    cessionFee: 0,
    estimatedBoxOffice: 1_000,
    companySharePercent: 50,
    minimumGuarantee: 400,
    minimumGuaranteeBasis: "per_performance",
    performanceCount: 3,
    venueRental: 0,
  }), 1_200);
});

test("conserve un minimum garanti global pour toute la serie", () => {
  assert.equal(calculateCompanyRevenue({
    exploitationMode: "corealisation",
    cessionFee: 0,
    estimatedBoxOffice: 1_000,
    companySharePercent: 50,
    minimumGuarantee: 900,
    minimumGuaranteeBasis: "total",
    performanceCount: 3,
    venueRental: 0,
  }), 900);
});
