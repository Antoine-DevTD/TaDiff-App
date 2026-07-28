import assert from "node:assert/strict";
import test from "node:test";
import {
  notifyBetaSignup,
  sendBetaWelcomeEmail,
} from "../../lib/beta-signup-notification.ts";

const signup = {
  companyName: "Compagnie Test",
  contactName: "Camille Martin",
  email: "camille@example.com",
  phone: "",
  city: "Nantes",
  discipline: "Théâtre",
  mainNeed: "Structurer la diffusion",
  position: 3,
  status: "reserved",
};

test("n'appelle pas Resend lorsque la notification n'est pas configuree", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousRecipient = process.env.BETA_SIGNUP_NOTIFICATION_EMAIL;
  delete process.env.RESEND_API_KEY;
  delete process.env.BETA_SIGNUP_NOTIFICATION_EMAIL;

  try {
    const result = await notifyBetaSignup(signup);
    assert.deepEqual(result, { sent: false, reason: "not_configured" });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousRecipient === undefined) delete process.env.BETA_SIGNUP_NOTIFICATION_EMAIL;
    else process.env.BETA_SIGNUP_NOTIFICATION_EMAIL = previousRecipient;
  }
});

test("envoie une alerte interne avec les informations utiles", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousRecipient = process.env.BETA_SIGNUP_NOTIFICATION_EMAIL;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-key";
  process.env.BETA_SIGNUP_NOTIFICATION_EMAIL = "beta@tadiff.com";

  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(null, { status: 200 });
  };

  try {
    const result = await notifyBetaSignup(signup);
    assert.deepEqual(result, { sent: true });
    assert.equal(request.url, "https://api.resend.com/emails");
    const body = JSON.parse(request.options.body);
    assert.deepEqual(body.to, ["beta@tadiff.com"]);
    assert.match(body.subject, /Compagnie Test/);
    assert.match(body.text, /camille@example\.com/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousRecipient === undefined) delete process.env.BETA_SIGNUP_NOTIFICATION_EMAIL;
    else process.env.BETA_SIGNUP_NOTIFICATION_EMAIL = previousRecipient;
  }
});

test("confirme la place au candidat et donne rendez-vous le 6 aout", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-key";

  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(null, { status: 200 });
  };

  try {
    const result = await sendBetaWelcomeEmail(signup);
    assert.deepEqual(result, { sent: true });
    const body = JSON.parse(request.options.body);
    assert.deepEqual(body.to, ["camille@example.com"]);
    assert.match(body.subject, /rendez-vous le 6 août/);
    assert.match(body.text, /C'est confirmé/);
    assert.match(body.text, /6 août 2026/);
    assert.match(body.text, /10 h \(heure de Paris\)/);
    assert.match(body.text, /\/api\/beta-launch-calendar/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});
