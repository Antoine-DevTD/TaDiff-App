import test from "node:test";
import assert from "node:assert/strict";
import { getBetaAccessStage, renderBetaEmailTemplate } from "../../lib/beta-access.ts";

test("personnalise uniquement les variables beta autorisees", () => {
  const rendered = renderBetaEmailTemplate(
    "Bonjour {{prenom}} - {{compagnie}} - {{email}} - {{lien_paiement}} - {{secret}}",
    { firstName: "Ariane", companyName: "Compagnie du Fil", email: "ariane@example.com", paymentUrl: "https://buy.stripe.com/test" },
  );
  assert.equal(rendered, "Bonjour Ariane - Compagnie du Fil - ariane@example.com - https://buy.stripe.com/test - {{secret}}");
});

test("donne la priorite a une erreur puis aux etapes les plus avancees", () => {
  const base = { accountCreatedAt: null, invitationSentAt: null, paymentConfirmedAt: null, paymentEmailSentAt: null, lastAccessError: "" };
  assert.equal(getBetaAccessStage(base), "registered");
  assert.equal(getBetaAccessStage({ ...base, paymentEmailSentAt: "2026-08-04" }), "payment_email_sent");
  assert.equal(getBetaAccessStage({ ...base, paymentConfirmedAt: "2026-08-04" }), "paid");
  assert.equal(getBetaAccessStage({ ...base, invitationSentAt: "2026-08-04" }), "invited");
  assert.equal(getBetaAccessStage({ ...base, accountCreatedAt: "2026-08-04" }), "account_created");
  assert.equal(getBetaAccessStage({ ...base, accountCreatedAt: "2026-08-04", lastAccessError: "Erreur" }), "error");
});
