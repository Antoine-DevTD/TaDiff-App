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
    const cockpitOrder = await page.locator('[data-tour="cockpit-pulse"], [data-tour="cockpit-priorite"]').evaluateAll((elements) => elements.map((element) => element.getAttribute("data-tour")));
    expect(cockpitOrder).toEqual(["cockpit-pulse", "cockpit-priorite"]);

    await page.getByRole("button", { name: "Ouvrir William" }).click();
    const william = page.getByRole("region", { name: "Assistant William" });
    await expect(william.getByText("Votre copilote TaDiff", { exact: true })).toBeVisible();
    await expect(william.getByRole("link", { name: /Ajouter un spectacle/ })).toBeVisible();
    await expect(william.getByRole("button", { name: "Visite guidee" })).toBeVisible();
    const compactBox = await william.boundingBox();
    await william.getByRole("button", { name: "Agrandir William" }).click();
    const expandedBox = await william.boundingBox();
    expect(expandedBox?.width).toBeGreaterThan(compactBox?.width ?? 0);
    await expect(william.getByRole("button", { name: "Reduire William" })).toBeVisible();
  });

  test("ajoute puis termine une action sans actualiser la page", async ({ page }) => {
    await page.goto("/reminders");

    await page.getByRole("button", { name: "Ajouter une action", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Que faut-il faire ?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Autre", exact: true }).click();
    await dialog.getByLabel("Action").fill("Verifier le dossier du webinaire");
    await dialog.getByRole("button", { name: "Ajouter l'action" }).click();

    await expect(page.getByText("Verifier le dossier du webinaire", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Marquer Verifier le dossier du webinaire comme fait" }).click();
    await expect(page.getByText("Verifier le dossier du webinaire", { exact: true })).toHaveCount(0);
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
    await expect(page.getByRole("heading", { name: "Pièces indispensables" })).toBeVisible();
    await expect(page.getByText("RIB", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Statuts", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Tous les fichiers" })).toHaveCount(0);
    await expect(page.getByText("Dossier artistique - diffusion 2026", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Visualiser Dossier artistique" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Télécharger Dossier artistique" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Télécharger toutes les pièces" })).toBeVisible();
    await expect(page.getByText("Prêt", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Nouvelle version de Dossier artistique").setInputFiles({
      name: "dossier-artistique-v2.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("nouvelle version du dossier artistique"),
    });
    await expect(page.getByRole("dialog", { name: "Remplacer Dossier artistique ?" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Remplacer Dossier artistique ?" })).toBeHidden();

    await expect(page.getByRole("heading", { name: "Deposer plusieurs fichiers" })).toBeVisible();
    await page.locator('input[type="file"][multiple]').setInputFiles({
      name: "fiche-technique-tournee.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fiche technique et besoins plateau"),
    });
    await expect(page.getByRole("option", { name: "Fiche technique", selected: true })).toBeAttached();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("link", { name: "Presentation", exact: true }).click();
    await expect(page).toHaveURL(/tab=presentation/);
    await expect(page.getByRole("heading", { name: "Donner de la matiere aux emails" })).toBeVisible();
    await expect(page.getByLabel("Logline")).toHaveValue(/fratrie/);
    await backToShows.click();
    await expect(page).toHaveURL(/\/shows$/);
    await expect(page.getByRole("link", { name: "Ouvrir Les lignes de fuite" })).toBeVisible();
  });

  test("ouvre une action deja rattachee depuis la fiche spectacle", async ({ page }) => {
    await page.goto("/shows/show-1?tab=dates");

    await page.getByRole("button", { name: "Ajouter une action" }).click();
    const dialog = page.getByRole("dialog", { name: "Que faut-il faire ?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Les lignes de fuite" })).toHaveAttribute("aria-pressed", "true");
  });

  test("cree un spectacle dans une fenetre sans page dediee", async ({ page }) => {
    await page.goto("/shows");

    await page.getByRole("banner").getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("dialog", { name: "Nouveau spectacle" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Je veux détailler le budget/ })).toBeVisible();
    await expect(page).toHaveURL(/\/shows$/);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Nouveau spectacle" })).toBeHidden();

    await page.goto("/shows/new");
    await expect(page).toHaveURL(/\/shows\?create=1$/);
    await expect(page.getByRole("dialog", { name: "Nouveau spectacle" })).toBeVisible();
  });

  test("rend le budget detaille progressif et comprehensible", async ({ page }) => {
    await page.goto("/shows/show-1");

    await page.getByRole("link", { name: "Budget", exact: true }).click();
    await expect(page).toHaveURL(/tab=budget/);
    await expect(page.getByRole("heading", { name: /Comprendre l'équilibre/ })).toBeVisible();
    await expect(page.getByText("Le spectacle coûte", { exact: true })).toBeVisible();
    await expect(page.getByText("Déjà financé", { exact: true })).toBeVisible();
    await expect(page.getByText("Reste à trouver", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Répartition des dépenses" })).toBeVisible();

    await page.getByRole("button", { name: "Ajouter une dépense" }).click();
    await page.getByLabel("À quoi sert ce montant ?").fill("Location du studio de répétition");
    await page.getByLabel("Montant", { exact: true }).fill("850");
    await page.getByRole("button", { name: "Ajouter la ligne" }).click();
    await expect(page.getByText("Location du studio de répétition", { exact: true })).toBeVisible();
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

    const trigger = page.getByRole("banner").getByRole("button", { name: "Ajouter une diffusion" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Ajouter une diffusion" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(dialog.getByRole("button", { name: "Choisir un contact" })).toBeVisible();
    await expect(dialog.getByText("Choisir un programmateur", { exact: true })).toHaveCount(0);
    await expect(dialog.getByLabel("Chance d'aboutir")).toHaveCount(0);
    await expect(dialog.getByRole("radio", { name: /Coréalisation/ })).toBeVisible();
    await dialog.getByText("Coréalisation", { exact: true }).click();
    await dialog.getByLabel("Billetterie totale estimée").fill("10000");
    await dialog.getByLabel("Part revenant à la compagnie").fill("50");
    await expect(dialog.getByText("5 000 EUR", { exact: true })).toBeVisible();
    await dialog.getByLabel("Un minimum garanti est prévu").check();
    await dialog.getByLabel("Montant du minimum garanti").fill("6000");
    await expect(dialog.getByText("6 000 EUR", { exact: true })).toBeVisible();
    await dialog.getByText("Location", { exact: true }).click();
    await dialog.getByLabel("Billetterie totale estimée").fill("10000");
    await dialog.getByLabel("Coût de location du lieu").fill("3000");
    await expect(dialog.getByText("7 000 EUR", { exact: true })).toBeVisible();
    await expect(dialog.locator('input[type="date"]')).toHaveCount(1);
    await expect(dialog.locator("textarea")).toHaveCount(0);
    await expect(dialog.getByRole("region", { name: "Action proposée par William" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
    await page.setViewportSize({ width: 1280, height: 900 });
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

    await page.getByRole("main").getByRole("button", { name: "Ajouter une diffusion" }).click();
    await expect(page.getByRole("dialog", { name: "Ajouter une diffusion" })).toBeVisible();
  });

  test("prepare un brouillon email pour n'importe quel contact", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/campaigns");

    await expect(page.getByRole("heading", { name: "Preparer un email maintenant" })).toBeVisible();
    await expect(page.getByLabel("Contact", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Spectacle", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Modele d'email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Objet", { exact: true }).first()).toHaveValue(/notre spectacle/);
    await expect(page.getByRole("button", { name: "Ouvrir ma messagerie" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Gmail" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Outlook" })).toBeEnabled();

    await page.getByLabel("Spectacle", { exact: true }).selectOption("show-1");
    const messageField = page.locator(".email-editor .tiptap").first();
    await expect(messageField).toContainText(/fratrie/);
    await expect(page.getByLabel("Dossier artistique")).toBeEnabled();
    await expect(page.getByLabel("Texte de la piece")).toBeDisabled();
    await page.getByLabel("Dossier artistique").check();
    await expect(messageField).toContainText(/pieces jointes.*dossier artistique/i);
    await expect(page.getByRole("button", { name: "Telecharger les pieces" })).toBeVisible();
    await page.getByRole("button", { name: "Gmail" }).click();
    const attachmentDialog = page.getByRole("dialog", { name: "Preparer les fichiers avant le brouillon" });
    await expect(attachmentDialog).toBeVisible();
    await expect(attachmentDialog).toContainText(/ne peuvent pas ajouter automatiquement/);
    await page.keyboard.press("Escape");
    await expect(attachmentDialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Modeles d'emails" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nouveau modele" })).toBeVisible();
  });

  test("contextualise un email directement depuis un contact", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/contacts");

    await page.getByRole("button", { name: "Preparer un email" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Preparer un email pour/ });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Spectacle", { exact: true }).selectOption("show-1");
    await expect(dialog.getByLabel("Objet", { exact: true })).toHaveValue(/Les lignes de fuite/);
    await expect(dialog.locator(".email-editor .tiptap")).toContainText(/fratrie/);
    await expect(dialog.getByText("4/4", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Pieces et William" }).click();
    await expect(page).toHaveURL(/\/campaigns\?contactId=contact-1&showId=show-1/);
    await expect(page.getByLabel("Contact", { exact: true })).toHaveValue("contact-1");
    await expect(page.getByLabel("Spectacle", { exact: true })).toHaveValue("show-1");
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
