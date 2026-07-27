import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const previews = resolve(root, "previews");
const deckUrl = pathToFileURL(resolve(root, "index.html")).href;
const pdfName =
  process.env.TADIFF_PRESENTATION_PDF ??
  "TaDiff-fonctionnalites-webinaire-23-juillet-2026.pdf";

await mkdir(previews, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto(deckUrl);
const slideCount = await page.locator(".slide").count();

for (let slide = 1; slide <= slideCount; slide += 1) {
  await page.evaluate((target) => window.show(target - 1), slide);
  await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(previews, `slide-${String(slide).padStart(2, "0")}.png`) });
}

await page.goto(deckUrl);
await page.pdf({
  path: resolve(root, pdfName),
  width: "13.333in",
  height: "7.5in",
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});

await browser.close();
