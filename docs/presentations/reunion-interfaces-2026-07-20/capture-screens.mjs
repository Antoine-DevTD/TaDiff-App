import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(root, "assets");
const baseUrl = process.env.PRESENTATION_BASE_URL || "http://127.0.0.1:3100";

const screens = [
  ["01-landing", "/"],
  ["02-beta", "/beta"],
  ["03-cockpit", "/dashboard"],
  ["05-spectacles", "/shows"],
  ["06-spectacle", "/shows/show-1"],
  ["07-dossier-spectacle", "/shows/show-1?tab=files"],
  ["08-budget-spectacle", "/shows/show-1?tab=budget"],
  ["09-actions", "/reminders"],
  ["10-contacts", "/contacts"],
  ["11-diffusion", "/pipeline"],
  ["12-emails", "/campaigns"],
  ["13-agenda", "/calendar"],
  ["14-subventions", "/subventions"],
  ["15-mecenat", "/mecenat"],
  ["16-finances", "/finances"],
  ["17-dossiers", "/documents"],
  ["18-facturation", "/billing"],
  ["19-parametres", "/settings"],
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

for (const [name, path] of screens) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: resolve(output, `${name}.png`), animations: "disabled" });
}

await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Ouvrir William" }).click();
await page.getByRole("region", { name: "Assistant William" }).waitFor();
await page.screenshot({ path: resolve(output, "04-william.png"), animations: "disabled" });

await browser.close();
