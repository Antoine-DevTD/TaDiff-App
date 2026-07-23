import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(root, "assets");
const baseUrl = process.env.PRESENTATION_BASE_URL || "http://127.0.0.1:3100";

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

async function shot(name, path, action) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  if (action) await action(page);
  await page.screenshot({ path: resolve(output, `${name}.png`), animations: "disabled" });
}

await shot("01-cockpit", "/dashboard");
await shot("02-spectacles", "/shows");
await shot("03-spectacle", "/shows/show-1");
await shot("04-dossier", "/shows/show-1?tab=files");
await shot("05-actions", "/reminders");
await shot("06-contacts", "/contacts");
await shot("07-lieux-carte", "/contacts", async (current) => {
  await current.getByRole("tab", { name: /Lieux/ }).click();
  await current.getByRole("button", { name: "Carte" }).click();
  await current.locator(".leaflet-tile-loaded").first().waitFor({ timeout: 10_000 });
});
await shot("08-diffusion", "/pipeline");
await shot("09-diffusion-dialog", "/pipeline", async (current) => {
  await current.getByRole("banner").getByRole("button", { name: "Ajouter une diffusion" }).click();
  await current.getByRole("dialog", { name: "Ajouter une diffusion" }).waitFor();
});
await shot("10-exploitation-dialog", "/pipeline", async (current) => {
  await current.getByRole("button", { name: "Ajouter une exploitation" }).click();
  const dialog = current.getByRole("dialog", { name: /Ajouter des repr/ });
  await dialog.waitFor();
  await dialog.evaluate((element) => {
    element.scrollTop = Math.min(430, element.scrollHeight - element.clientHeight);
  });
  await current.waitForTimeout(150);
});
await shot("11-calendrier", "/calendar");
await shot("12-subventions", "/subventions");
await shot("13-mecenat", "/mecenat");
await shot("14-finances", "/finances");
await shot("15-email", "/campaigns");
await shot("16-william", "/dashboard", async (current) => {
  await current.getByRole("button", { name: "Ouvrir William" }).click();
  await current.getByRole("region", { name: "Assistant William" }).waitFor();
});

await browser.close();
