import assert from "node:assert/strict";
import test from "node:test";
import { betaSignupSchema } from "../../lib/validation/beta.ts";

const validSignup = {
  companyName: "Compagnie Test",
  contactName: "Camille Martin",
  email: "camille@example.com",
  phone: "",
  city: "Nantes",
  discipline: "Theatre",
};

test("accepte une inscription sans besoin principal", () => {
  const result = betaSignupSchema.safeParse(validSignup);

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.mainNeed, "");
});

test("conserve un besoin principal lorsqu'il est renseigne", () => {
  const result = betaSignupSchema.safeParse({
    ...validSignup,
    mainNeed: "Mieux suivre les subventions",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.mainNeed, "Mieux suivre les subventions");
  }
});
