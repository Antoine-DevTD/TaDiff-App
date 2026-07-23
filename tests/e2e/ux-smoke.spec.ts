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
    await expect(page.getByRole("link", { name: /Réserver ma place bêta/i }).first()).toBeVisible();
    await expect(page.getByText("Exemple de cockpit", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("reste lisible sans debordement sur mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Le cockpit de votre compagnie." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Réserver/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("parcours webinaire", () => {
  test("simule l'inscription sans rouvrir la creation publique de compte", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Creation de compte suspendue" })).toBeVisible();

    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/demo-signup");
      await expect(page.getByRole("heading", { name: "Créons votre espace compagnie." })).toBeVisible();
      await expect(page.getByLabel("Prénom et nom")).toHaveValue("");
      await expect(page.getByLabel("Nom de la compagnie")).toHaveValue("");
      await expect(page.getByLabel("Adresse email")).toHaveValue("");
      await page.getByLabel("Prénom et nom").fill("Titouan Laporte");
      await page.getByLabel("Nom de la compagnie").fill("Compagnie de l'Estran");
      await page.getByLabel("Adresse email").fill("demo_webinaire@yopmail.com");
      await page.getByLabel("Mot de passe").fill("demonstration");
      await page.getByLabel(/J'accepte les conditions/).check();
      await page.getByRole("button", { name: "Créer mon espace" }).click();
      await expect(page.getByRole("heading", { name: "Bienvenue dans TaDiff" })).toBeVisible();
      await page.waitForURL(/welcome\?replay=1&fromSignup=1/);
      await expect(page.getByRole("heading", { level: 1, name: "Bienvenue, je suis William." })).toBeVisible();
      const stage = page.locator("[data-william-stage]");
      const canvas = stage.locator("canvas");
      await expect(canvas).toBeVisible();
      await expect.poll(async () => canvas.evaluate((element) =>
        (element as HTMLCanvasElement).toDataURL("image/png").length,
      )).toBeGreaterThan(5_000);
      await expectNoHorizontalOverflow(page);

      await page.getByRole("button", { name: "Continuer" }).click();
      await expect(page.getByPlaceholder("Prenom Nom")).toHaveValue("Titouan Laporte");
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.getByRole("button", { name: "Continuer" }).click();
      await expect(page.getByRole("button", { name: /Déposer une image ici/ })).toBeVisible();
      await expect(page.locator('input[type="file"]')).toHaveAttribute(
        "accept",
        ".png,.jpg,.jpeg,.webp",
      );
    }
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
    await expect(page.getByText("À faire maintenant", { exact: true })).toBeVisible();
    for (const [label, href] of [
      ["Trésorerie", "/finances"],
      ["Dates en cours", "/pipeline"],
      ["Dossiers prêts", "/documents"],
      ["Urgences", "/reminders"],
    ] as const) {
      await expect(page.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
    }
    const cockpitOrder = await page.locator('[data-tour="cockpit-pulse"], [data-tour="cockpit-priorite"]').evaluateAll((elements) => elements.map((element) => element.getAttribute("data-tour")));
    expect(cockpitOrder).toEqual(["cockpit-pulse", "cockpit-priorite"]);

    await page.getByRole("button", { name: "Ouvrir William" }).click();
    const william = page.getByRole("region", { name: "Assistant William" });
    await expect(william.getByText("Vos spectacles et votre compagnie en contexte", { exact: true })).toBeVisible();
    await expect(william.getByText("Priorité suggérée", { exact: true })).toBeVisible();
    await expect(william.getByRole("button", { name: /Visite guidée/ })).toHaveCount(0);
    const compactBox = await william.boundingBox();
    await william.getByRole("button", { name: "Agrandir William" }).click();
    const expandedBox = await william.boundingBox();
    expect(expandedBox?.width).toBeGreaterThan(compactBox?.width ?? 0);
    await expect(william.getByRole("button", { name: "Réduire William" })).toBeVisible();
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
    const completionDialog = page.getByRole("dialog", { name: "Bravo ! Sur quoi cette action a-t-elle débouché ?" });
    await expect(completionDialog).toBeVisible();
    await completionDialog.getByRole("button", { name: "Ça avance" }).click();
    const completionNote = completionDialog.getByLabel(/Petit compte rendu/);
    await completionNote.pressSequentially("Le dossier est prêt, envoi prévu demain.");
    await expect(completionNote).toBeFocused();
    await expect(completionNote).toHaveValue("Le dossier est prêt, envoi prévu demain.");
    await completionDialog.getByRole("button", { name: "Enregistrer le résultat" }).click();
    await expect(page.getByText("Verifier le dossier du webinaire", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Terminées (1)" }).click();
    await expect(page.getByText("Verifier le dossier du webinaire", { exact: true })).toBeVisible();
    await expect(page.getByText("Le dossier est prêt, envoi prévu demain.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Rouvrir Verifier le dossier du webinaire" }).click();
    await expect(page.getByText("Verifier le dossier du webinaire", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "À faire" }).click();
    await expect(page.getByText("Verifier le dossier du webinaire", { exact: true })).toBeVisible();
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
    await expect(page.getByText("Affiche spectacle", { exact: true })).toHaveCount(0);
    const backToShows = page.getByRole("link", { name: "Tous les spectacles" });
    await expect(backToShows).toBeVisible();
    const dossierTab = page.getByRole("navigation", { name: "Rubriques du spectacle" })
      .getByRole("link", { name: "Dossier", exact: true });
    await expect(dossierTab).toHaveAttribute("href", /tab=files/);
    await Promise.all([
      page.waitForURL(/tab=files/),
      dossierTab.click(),
    ]);
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

    await expect(page.getByRole("heading", { name: "Déposer plusieurs fichiers" })).toBeVisible();
    await page.locator('input[type="file"][multiple]').setInputFiles({
      name: "fiche-technique-tournee.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fiche technique et besoins plateau"),
    });
    await expect(page.getByRole("option", { name: "Fiche technique", selected: true })).toBeAttached();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    const presentationTab = page.getByRole("link", { name: "Présentation", exact: true });
    await presentationTab.click();
    await expect(page).toHaveURL(/tab=presentation/);
    await expect(presentationTab).toHaveAttribute("aria-current", "page");
    await expect.poll(async () => presentationTab.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return [style.borderLeftWidth, style.borderRightWidth];
    })).toEqual(["0px", "0px"]);
    await expect(page.getByRole("heading", { name: "Donner de la matière aux emails" })).toBeVisible();
    const logline = page.getByLabel("Logline");
    await expect(logline).toHaveValue(/fratrie/);
    await expect(page.getByLabel(/^Synopsis/)).toBeVisible();
    await expect(page.getByLabel(/^Note d'intention/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Écrire avec William" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Me poser des questions/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Lire les PDF choisis/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Enregistrer la presentation/i })).toHaveCount(0);
    await logline.fill("Une nouvelle logline sauvegardee automatiquement.");
    await expect(page.getByRole("status")).toHaveText("Enregistré");
    await backToShows.click();
    await expect(page).toHaveURL(/\/shows$/);
    await expect(page.getByRole("link", { name: "Ouvrir Les lignes de fuite" })).toBeVisible();
  });

  test("ferme les popups avec Echap ou un clic a cote", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");

    const trigger = page.getByRole("button", { name: "Donner un retour" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Donner un retour" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Votre message").pressSequentially("Un retour en cours");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeHidden();
  });

  test("ajoute un evenement horaire directement depuis le calendrier", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/calendar");

    const day = page.locator("[data-calendar-date]").nth(15);
    await day.click({ button: "right" });

    const dialog = page.getByRole("dialog", { name: "Qu'est-ce qui se passe ?" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Titre").fill("Rendez-vous technique test");
    await dialog.getByLabel("Toute la journée").uncheck();
    await dialog.getByLabel("Début").fill("14:30");
    await dialog.getByLabel(/Fin/).fill("16:00");
    await dialog.getByLabel(/Lieu/).fill("Plateau A");
    await dialog.getByRole("button", { name: "Ajouter à l'agenda" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Rendez-vous technique test", { exact: true }).first()).toBeVisible();
  });

  test("met en avant une subvention depuis le calendrier", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/calendar");

    await page.locator('button[title*="Aide"]').first().click();
    await expect(page.getByText(/tail s.*lectionn/i)).toBeVisible();
    await expect(page.getByText(/Spectacle concern/i)).toBeVisible();
    await page.getByRole("button", { name: "Ouvrir la subvention" }).click();

    await expect(page).toHaveURL(/\/subventions\?focus=/);
    await expect(page.getByRole("heading", { name: "Les prochains dossiers à faire avancer" })).toBeVisible();
    await expect(page.getByText("Dossier actif", { exact: true })).toBeVisible();
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

  test("pilote un budget theatre detaille et sa rentabilite", async ({ page }) => {
    await page.goto("/shows/show-1");

    await page.getByRole("link", { name: "Budget", exact: true }).click();
    await expect(page).toHaveURL(/tab=budget/);
    await expect(page.getByRole("heading", { name: /Construire le budget réel/ })).toBeVisible();
    await expect(page.getByText("Création à financer", { exact: true })).toBeVisible();
    await expect(page.getByText("Coût d'un plateau", { exact: true })).toBeVisible();
    await expect(page.getByText("Cession conseillée", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Courbe de rentabilité du spectacle" })).toBeVisible();
    await expect(page.getByLabel("Métier").first()).toHaveValue("Comédien ou comédienne");
    await expect(page.getByRole("heading", { name: "Répartition des dépenses" })).toBeVisible();

    await page.getByRole("button", { name: "Ajouter une dépense" }).click();
    await page.getByLabel("À quoi sert ce montant ?").fill("Location du studio de répétition");
    await page.getByLabel("Quand cette dépense revient-elle ?").selectOption("creation");
    await page.getByLabel("Montant", { exact: true }).fill("850");
    await page.getByRole("button", { name: "Ajouter la ligne" }).click();
    await expect(page.getByText("Location du studio de répétition", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
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
    await dialog.getByLabel("Montant du minimum garanti").fill("450");
    await expect.poll(() => dialog.getByLabel("Montant du minimum garanti").evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(true);
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

    await expect(page.getByRole("heading", { name: "Faire circuler vos spectacles" })).toBeVisible();
    await expect(page.getByText("Kanban", { exact: true })).toHaveCount(0);

    await page.getByRole("main").getByRole("button", { name: "Ajouter une diffusion" }).click();
    await expect(page.getByRole("dialog", { name: "Ajouter une diffusion" })).toBeVisible();
  });

  test("selectionne explicitement les jours joues d'une exploitation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/pipeline");

    await page.getByRole("button", { name: "Ajouter une exploitation" }).click();
    const dialog = page.getByRole("dialog", { name: "Ajouter des représentations" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Jours joués", { exact: true })).toBeVisible();
    await expect(dialog.getByText("1 représentation(s) sélectionnée(s)")).toBeVisible();
    await dialog.getByLabel("Fin de période").fill("2026-08-31");
    await dialog.getByRole("button", { name: "Jeu", exact: true }).click();
    await expect(dialog.getByText(/représentation\(s\) sélectionnée\(s\)/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("masque les documents du sous-menu dossiers et aligne le mécénat sur les aides", async ({ page }) => {
    await page.goto("/mecenat");
    await expect(page.getByRole("heading", { name: "Les partenariats à faire avancer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Documents", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "À faire avancer" })).toBeVisible();
  });

  test("prepare un brouillon email pour n'importe quel contact", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/campaigns");

    await expect(page.getByRole("heading", { name: "Préparer un email maintenant" })).toBeVisible();
    await expect(page.getByLabel("Contact", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Spectacle", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Modèle d'email", { exact: true })).toBeVisible();
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
    await expect(messageField).toContainText(/pièces jointes.*dossier artistique/i);
    await expect(page.getByRole("button", { name: "Télécharger les pièces" })).toBeVisible();
    await page.getByRole("button", { name: "Gmail" }).click();
    const attachmentDialog = page.getByRole("dialog", { name: "Préparer les fichiers avant le brouillon" });
    await expect(attachmentDialog).toBeVisible();
    await expect(attachmentDialog).toContainText(/ne peuvent pas ajouter automatiquement/);
    await page.keyboard.press("Escape");
    await expect(attachmentDialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Modeles d'emails" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nouveau modèle" })).toBeVisible();
  });

  test("contextualise un email directement depuis un contact", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/contacts");

    await page.getByRole("button", { name: "Préparer un email" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Préparer un email pour/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Contact", { exact: true })).toHaveValue("contact-1");
    await expect(dialog.getByLabel("Modèle d'email", { exact: true })).toBeVisible();
    await dialog.getByLabel("Spectacle", { exact: true }).selectOption("show-1");
    await expect(dialog.getByLabel("Objet", { exact: true })).toHaveValue(/Les lignes de fuite/);
    await expect(dialog.locator(".email-editor .tiptap")).toContainText(/fratrie/);
    await expect(dialog.getByLabel("Dossier artistique")).toBeEnabled();
    await dialog.getByRole("button", { name: "Demander à William" }).click();
    await expect(dialog.getByRole("region", { name: "Comment William doit-il retravailler ce mail ?" })).toBeVisible();
    await expect(dialog.getByText(/Entrée pour envoyer/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Gmail" })).toBeEnabled();
  });

  test("separe les personnes et les lieux puis prepare un email groupe", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/contacts");

    await expect(page.getByRole("tab", { name: /Personnes/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Mina Laurent", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Lieux/ }).click();
    await expect(page.getByText("Scene nationale du Littoral", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Mina Laurent", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Carte" }).click();
    await expect(page.getByRole("region", { name: "Carte des lieux" })).toBeVisible();
    await expect(page.getByText("3 lieux sur la carte")).toBeVisible();

    await page.getByRole("tab", { name: /Personnes/ }).click();
    await page.getByLabel("Sélectionner Mina Laurent").check();
    await page.getByLabel("Sélectionner Arthur Klein").check();
    await page.getByRole("button", { name: "Écrire (2)" }).click();

    const dialog = page.getByRole("dialog", { name: "Préparer un email pour 2 contacts" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[value="2 destinataires en copie cachée"]')).toBeVisible();
    await expect(dialog.locator(".email-editor .tiptap")).toContainText("Bonjour toutes et tous");
  });

  test("localise un lieu sans demander de coordonnees techniques", async ({ page }) => {
    await page.route("**/api/geocoding/address?**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          suggestions: [{
            id: "chatelet",
            label: "1 Place du Chatelet 75001 Paris",
            address: "1 Place du Chatelet",
            postalCode: "75001",
            city: "Paris",
            department: "Paris",
            region: "Ile-de-France",
            latitude: 48.857614,
            longitude: 2.346758,
          }],
        }),
      });
    });

    await page.goto("/contacts");
    await page.getByRole("banner").getByRole("button", { name: "Ajouter" }).click();
    const createDialog = page.getByRole("dialog", { name: "Nouveau contact" });
    await createDialog.getByRole("button", { name: "Un lieu" }).click();
    await expect(createDialog.getByLabel("Latitude")).toHaveCount(0);
    await expect(createDialog.getByLabel("Longitude")).toHaveCount(0);

    await createDialog.getByRole("combobox", { name: "Rechercher une adresse" }).fill("1 place chatelet");
    await createDialog.getByRole("option", { name: /1 Place du Chatelet/ }).click();
    await expect(createDialog.getByLabel("Code postal")).toHaveValue("75001");
    await expect(createDialog.getByLabel("Ville")).toHaveValue("Paris");
    await expect(createDialog.getByText(/Adresse localis/)).toBeVisible();
    await expect(createDialog.locator('input[name="latitude"]')).toHaveValue("48.857614");
    await page.keyboard.press("Escape");

    await page.getByRole("tab", { name: /Lieux/ }).click();
    await page.getByRole("button", { name: "Importer" }).click();
    const importDialog = page.getByRole("dialog", { name: "Importer des lieux" });
    await expect(importDialog).toBeVisible();
    await importDialog.locator('input[type="file"]').setInputFiles({
      name: "lieux.csv",
      mimeType: "text/csv",
      buffer: Buffer.from([
        "Nom du lieu;Adresse;Code postal;Ville;Site web",
        "Théâtre du Port;2 quai du Port;17000;La Rochelle;theatre-port.example",
        "Salle des Fêtes;5 rue Centrale;44000;Nantes;https://salle-fetes.example",
      ].join("\n")),
    });
    await expect(importDialog.getByText(/2 lieu\(x\) détecté\(s\) sur 2 ligne\(s\)/)).toBeVisible();
    await expect(importDialog.getByRole("button", { name: "Importer 2 lieu(x)" })).toBeVisible();
    await importDialog.getByRole("button", { name: "Importer 2 lieu(x)" }).click();
    await expect(importDialog.getByText(/2 lieu\(x\) importé\(s\).*2 lieu\(x\) positionné\(s\)/)).toBeVisible();
  });

  test("attribue une action a plusieurs contacts", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/contacts");

    await page.getByLabel("Sélectionner Mina Laurent").check();
    await page.getByLabel("Sélectionner Arthur Klein").check();
    await page.getByRole("button", { name: "Créer une action", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Que faut-il faire ?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("2 contacts selectionnes", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Action", { exact: true })).toHaveValue("Appeler @contact");
    await dialog.getByRole("button", { name: "Ajouter l'action" }).click();
    await expect(dialog).toBeHidden();
  });

  test("protege la suppression groupee par un maintien de trois secondes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/contacts");

    await page.getByLabel("Sélectionner Mina Laurent").check();
    await page.getByLabel("Sélectionner Arthur Klein").check();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Supprimer les contacts selectionnes ?" });
    const holdButton = dialog.getByRole("button", { name: "Maintenir 3 secondes pour supprimer 2 contacts" });
    await expect(dialog).toBeVisible();
    const initialSize = await holdButton.boundingBox();
    await holdButton.focus();
    await page.keyboard.down("Space");
    await page.waitForTimeout(1_000);
    const holdingSize = await holdButton.boundingBox();
    expect(holdingSize?.width).toBe(initialSize?.width);
    expect(holdingSize?.height).toBe(initialSize?.height);
    await page.waitForTimeout(2_150);
    await page.keyboard.up("Space");

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Mina Laurent", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Arthur Klein", { exact: true })).toHaveCount(0);
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

    await expect(page.getByRole("heading", { name: "Pièces demandées" })).toBeVisible();
    await expect(page.getByText("RIB", { exact: true })).toBeVisible();
    await expect(page.getByText("Statuts", { exact: true })).toBeVisible();
    await expect(page.getByText("Document compagnie", { exact: true }).first()).toBeVisible();
  });
});
