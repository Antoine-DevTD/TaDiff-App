import path from "node:path";
import { expect, test } from "@playwright/test";

const showId = "4bdc6441-0764-4ae3-8168-61c7ebc3c1d6";
test.describe.configure({ mode: "serial" });

test("prépare le matériel d’une représentation et envoie le rappel local", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.TADIFF_LOCAL_SUPABASE !== "1",
    "Parcours réservé à Supabase local.",
  );
  test.slow();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  await request.delete(
    `http://127.0.0.1:54321/rest/v1/material_reminder_deliveries?show_id=eq.${showId}`,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
  );
  await request.delete(
    `http://127.0.0.1:54321/rest/v1/show_material_items?show_id=eq.${showId}`,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
  );
  await page.goto("/login");
  await page.getByLabel("Email").fill("materiel.local@tadiff.test");
  await page.getByLabel("Mot de passe").fill("Test-local-2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto(`/shows/${showId}?tab=materials`);
  await expect(
    page.getByRole("heading", { name: "Feuille de route matériel" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajouter plusieurs objets" }).click();
  await page.getByLabel("Objet 1").fill("Ruban adhésif de scène");
  await page.getByLabel("Catégorie 1").selectOption("consommable");
  await page
    .getByLabel("Propriétaire 1")
    .selectOption({ label: "Samir Bernard" });
  await page
    .getByLabel("Responsable 1")
    .selectOption({ label: "Samir Bernard" });
  await page.getByLabel("Quantité 1").fill("1");
  await page.getByLabel("Unité 1").fill("rouleau");
  await page.getByLabel("Coût 1").fill("8.50");
  await page.getByLabel("Objet 2").fill("Valise de scène");
  await page.getByLabel("Catégorie 2").selectOption("accessoire");
  await page.getByRole("button", { name: "Ajouter 2 objets" }).click();
  await expect(
    page.getByText("Ruban adhésif de scène", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Valise de scène", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Modifier Ruban adhésif de scène" })
    .click();
  await page
    .locator("#material-item-form input[type=file]")
    .setInputFiles(path.resolve("public/email/tadiff-logo-email.png"));
  await expect(page.getByAltText("Aperçu du matériel")).toBeVisible();
  const closeFeedback = page.getByRole("button", { name: "Fermer la fenêtre" });
  if (await closeFeedback.isVisible({ timeout: 1500 }).catch(() => false))
    await closeFeedback.click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByAltText("Photo de Ruban adhésif de scène"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Prévoir pour une date" }).click();
  await page
    .getByLabel("Objet")
    .selectOption({ label: "Ruban adhésif de scène" });
  await page.getByLabel(/Quantité/).fill("3");
  await page
    .getByLabel("Qui l’apporte ?")
    .selectOption({ label: "Samir Bernard" });
  await page.getByRole("combobox", { name: /^État/ }).selectOption("to_buy");
  await page
    .getByRole("button", { name: "Ajouter à la feuille de route" })
    .click();
  await expect(page.getByText("À acheter : 17,00 €")).toBeVisible();

  await page
    .getByRole("button", { name: "Envoyer le rappel maintenant" })
    .click();
  await expect(page.getByText(/1 rappel\(s\) envoyé\(s\)/)).toBeVisible();
  const mailpit = await request.get("http://127.0.0.1:54324/api/v1/messages");
  expect(mailpit.ok()).toBeTruthy();
  expect(await mailpit.text()).toContain("samir@tadiff.test");
});

test("le traitement quotidien envoie les rappels exactement une semaine avant", async ({
  request,
}) => {
  test.skip(
    process.env.TADIFF_LOCAL_SUPABASE !== "1",
    "Parcours réservé à Supabase local.",
  );
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const headers = {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
  };
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + 7);
  const targetDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(target);
  const itemsResponse = await request.get(
    `http://127.0.0.1:54321/rest/v1/show_material_items?show_id=eq.${showId}&select=id&limit=1`,
    { headers },
  );
  const contactsResponse = await request.get(
    "http://127.0.0.1:54321/rest/v1/contacts?email=eq.samir%40tadiff.test&select=id&limit=1",
    { headers },
  );
  const [item] = await itemsResponse.json();
  const [contact] = await contactsResponse.json();
  expect(item?.id).toBeTruthy();
  expect(contact?.id).toBeTruthy();
  await request.delete(
    `http://127.0.0.1:54321/rest/v1/material_reminder_deliveries?show_id=eq.${showId}&performance_date=eq.${targetDate}`,
    { headers },
  );
  await request.delete(
    `http://127.0.0.1:54321/rest/v1/show_material_requirements?show_id=eq.${showId}&performance_date=eq.${targetDate}`,
    { headers },
  );
  const requirement = await request.post(
    "http://127.0.0.1:54321/rest/v1/show_material_requirements",
    {
      headers,
      data: {
        company_id: "a38f8c59-e5b1-49bd-bc0b-244299dfc3ae",
        show_id: showId,
        material_item_id: item.id,
        performance_date: targetDate,
        quantity_needed: 1,
        responsible_contact_id: contact.id,
        status: "ready",
      },
    },
  );
  expect(requirement.ok()).toBeTruthy();

  const cron = await request.get("/api/cron/material-reminders", {
    headers: { authorization: "Bearer local-material-cron" },
  });
  expect(cron.ok()).toBeTruthy();
  expect(await cron.json()).toMatchObject({ targetDate, sent: 1 });
});

test("ouvre à nouveau les onglets Équipe et Répétitions", async ({ page }) => {
  test.skip(
    process.env.TADIFF_LOCAL_SUPABASE !== "1",
    "Parcours réservé à Supabase local.",
  );
  await page.goto("/login");
  await page.getByLabel("Email").fill("materiel.local@tadiff.test");
  await page.getByLabel("Mot de passe").fill("Test-local-2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/dashboard/);
  await page.goto(`/shows/${showId}?tab=team`);
  await expect(
    page.getByRole("heading", { name: "Équipe du spectacle" }),
  ).toBeVisible();
  await page.goto(`/shows/${showId}?tab=rehearsals`);
  await expect(
    page.getByText(
      /Commencez par constituer l’équipe|Répétitions et disponibilités/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/more than one relationship|plusieurs relations/i),
  ).toHaveCount(0);
});

test("reste utilisable sur mobile pour ajouter plusieurs objets", async ({
  page,
}) => {
  test.skip(
    process.env.TADIFF_LOCAL_SUPABASE !== "1",
    "Parcours réservé à Supabase local.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("materiel.local@tadiff.test");
  await page.getByLabel("Mot de passe").fill("Test-local-2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/dashboard/);
  await page.goto(`/shows/${showId}?tab=materials`);
  await expect(
    page.getByRole("heading", { name: "Feuille de route matériel" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajouter plusieurs objets" }).click();
  await expect(page.getByLabel("Objet 1")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/material-roadmap-mobile.png",
    fullPage: true,
  });
});

test("génère un agenda de répétitions sur une période et modifie plusieurs lieux", async ({
  page,
}) => {
  test.skip(
    process.env.TADIFF_LOCAL_SUPABASE !== "1",
    "Parcours réservé à Supabase local.",
  );
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const dateValue = (date: Date) => date.toISOString().slice(0, 10);
  const title = `Répétitions semaine ${Date.now()}`;
  await page.goto("/login");
  await page.getByLabel("Email").fill("materiel.local@tadiff.test");
  await page.getByLabel("Mot de passe").fill("Test-local-2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/dashboard/);
  await page.goto(`/shows/${showId}?tab=rehearsals`);
  const newPoll = page.getByRole("button", { name: "Nouveau sondage" });
  await expect(newPoll).toBeVisible();
  await newPoll.click();
  await page.getByLabel("Nom du sondage").fill(title);
  await page.getByLabel("Lieu par défaut").fill("Studio principal");
  await page.locator("#rehearsal-period-start").fill(dateValue(start));
  await page.locator("#rehearsal-period-end").fill(dateValue(end));
  await expect(page.getByText("4 créneau(x) généré(s)")).toBeVisible();
  await page.getByRole("button", { name: "Créer et obtenir le lien" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title }) });
  await section.getByRole("checkbox").nth(0).check();
  await section.getByRole("checkbox").nth(1).check();
  await section
    .getByLabel("Nouveau lieu pour la sélection")
    .fill("Salle annexe");
  await section.getByRole("button", { name: "Appliquer à 2" }).click();
  await expect(section.getByText("Salle annexe")).toHaveCount(2);
  const publicHref = await section
    .locator('a[href*="/repetitions/"]')
    .getAttribute("href");
  expect(publicHref).toBeTruthy();
  await page.goto(publicHref!);
  await page.getByLabel("Qui êtes-vous ?").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Tout marquer disponible" }).click();
  await page
    .getByRole("button", { name: "Envoyer mes disponibilités" })
    .click();
  await expect(page.getByText(/disponibilités ont bien été transmises/)).toBeVisible();
});
