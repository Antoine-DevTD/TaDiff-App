import { expect, test } from "@playwright/test";

test("recherche un contact sans perdre la sélection", async ({ page }) => {
  await page.goto("/pipeline");
  await page.getByRole("button", { name: "Ajouter une exploitation" }).click();
  const search = page.getByRole("searchbox", { name: "Rechercher un contact" });
  const select = page.getByRole("combobox", { name: "Contact à rattacher" });
  await expect(search).toBeVisible();
  const options = await select.locator("option").evaluateAll((elements) => elements.map((element) => ({ value: (element as HTMLOptionElement).value, text: element.textContent ?? "" })).filter((option) => option.value));
  expect(options.length).toBeGreaterThan(0);
  const contact = options[0];
  await search.fill(contact.text.slice(0, 5).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase());
  await expect(select.locator(`option[value="${contact.value}"]`)).toHaveCount(1);
  await select.selectOption(contact.value);
  await search.fill("aucun-contact-zzzzzz");
  await expect(page.getByText("Aucun résultat. Essayez un autre nom ou créez un contact.")).toBeVisible();
  await expect(select).toHaveValue(contact.value);
  await search.fill("");
  await search.press("Tab");
  await expect(select).toBeFocused();
  await select.selectOption("");
  await expect(select).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(search).toBeVisible();
  const box = await search.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
