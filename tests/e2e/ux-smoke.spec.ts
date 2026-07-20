import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe("landing beta", () => {
  test("presente une seule action de reservation claire sur desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Le cockpit de votre compagnie." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Reserver ma place beta/i }).first()).toBeVisible();
    await expect(page.getByText("Exemple de cockpit", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("reste lisible sans debordement sur mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Le cockpit de votre compagnie." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Reserver/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("cockpit en mode demonstration", () => {
  test("affiche les rubriques principales et la priorite du jour sur desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    for (const label of ["Aujourd'hui", "Spectacles", "Contacts", "Diffuser", "Agenda", "Finances", "Dossiers"]) {
      await expect(navigation.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    await expect(page.getByText("A faire maintenant", { exact: true })).toBeVisible();
  });

  test("donne acces aux rubriques secondaires depuis la navigation mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    const mobileNavigation = page.getByRole("navigation", { name: "Navigation mobile" });
    await expect(mobileNavigation).toBeVisible();
    await mobileNavigation.getByRole("button", { name: "Ouvrir les autres rubriques" }).click();
    await expect(page.getByRole("region", { name: "Autres rubriques" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Finances/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("navigue entre les rubriques d'un spectacle", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/shows/show-1");

    await expect(page.getByRole("heading", { level: 2, name: "Les lignes de fuite" })).toBeVisible();
    const backToShows = page.getByRole("link", { name: "Tous les spectacles" });
    await expect(backToShows).toBeVisible();
    await page.getByRole("link", { name: "Dossier", exact: true }).click();
    await expect(page).toHaveURL(/tab=files/);
    await expect(page.getByRole("heading", { name: "Pieces indispensables" })).toBeVisible();
    await expect(page.getByText("RIB", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Statuts", { exact: true })).toHaveCount(0);
    await backToShows.click();
    await expect(page).toHaveURL(/\/shows$/);
    await expect(page.getByRole("link", { name: "Ouvrir Les lignes de fuite" })).toBeVisible();
  });

  test("cree un spectacle dans une fenetre sans page dediee", async ({ page }) => {
    await page.goto("/shows");

    await page.getByRole("banner").getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("dialog", { name: "Nouveau spectacle" })).toBeVisible();
    await expect(page).toHaveURL(/\/shows$/);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Nouveau spectacle" })).toBeHidden();

    await page.goto("/shows/new");
    await expect(page).toHaveURL(/\/shows\?create=1$/);
    await expect(page.getByRole("dialog", { name: "Nouveau spectacle" })).toBeVisible();
  });

  test("propose les actions spectacle au clic droit", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/shows");

    const showCard = page.getByRole("link", { name: "Ouvrir Les lignes de fuite" });
    await showCard.click({ button: "right" });

    const menu = page.getByRole("menu", { name: "Actions pour Les lignes de fuite" });
    await expect(menu.getByRole("menuitem", { name: "Ouvrir la fiche" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Modifier" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Supprimer" })).toBeVisible();
    await menu.getByRole("menuitem", { name: "Modifier" }).click();

    const dialog = page.getByRole("dialog", { name: "Modifier Les lignes de fuite" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("ouvre la creation de date et rend le focus au declencheur avec Echap", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/pipeline");

    const trigger = page.getByRole("banner").getByRole("button", { name: "Ajouter une date" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Ajouter une date a vendre" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Choisir un contact" })).toBeVisible();
    await expect(dialog.getByText("Choisir un programmateur", { exact: true })).toHaveCount(0);
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("permet d'ajouter une date depuis la carte pointillee", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/pipeline");

    await page.getByRole("main").getByRole("button", { name: "Ajouter une date" }).click();
    await expect(page.getByRole("dialog", { name: "Ajouter une date a vendre" })).toBeVisible();
  });

  test("prepare un brouillon email pour n'importe quel contact", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/campaigns");

    await expect(page.getByRole("heading", { name: "Preparer un email maintenant" })).toBeVisible();
    await expect(page.getByLabel("Contact", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Spectacle facultatif", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Objet", { exact: true })).toHaveValue(/Prise de contact/);
    await expect(page.getByRole("button", { name: "Ouvrir ma messagerie" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Gmail" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Outlook" })).toBeEnabled();
  });

  test("garde la navigation fixe pendant le scroll des parametres", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/settings");

    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    const sidebar = navigation.locator("xpath=ancestor::aside");
    const initialBox = await sidebar.boundingBox();

    await expect(page.getByText("Apparence", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Sauvegarde", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Compagnie de demonstration", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Activite recente", { exact: true })).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    const scrolledBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(scrolledBox).not.toBeNull();
    expect(scrolledBox?.y).toBe(initialBox?.y);
    expect(scrolledBox?.height).toBe(initialBox?.height);
    expect(scrolledBox?.height).toBe(720);
  });

  test("classe le RIB et les statuts comme documents de compagnie dans les subventions", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/subventions");

    const requirementList = page.locator("details").filter({ hasText: /pieces demandees/ }).first();
    await requirementList.locator("summary").click();
    await expect(requirementList.getByText("RIB", { exact: true })).toBeVisible();
    await expect(requirementList.getByText("Statuts", { exact: true })).toBeVisible();
    await expect(requirementList.getByText("Document compagnie", { exact: true }).first()).toBeVisible();
  });
});
