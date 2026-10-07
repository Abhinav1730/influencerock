import { chromium } from "playwright-core";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const qaRoot = path.join(projectRoot, "qa");
const baseUrl = "http://localhost:4173";
const reference = "C:\\Users\\Abhinav Saxena\\.codex\\generated_images\\01a11558-700b-7df3-a656-7398b0a560b1\\exec-ed3638c8-b7af-48dc-90c2-9bf3c9aeee26.png";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

const errors = [];
const failedResources = [];
const results = {};
const progress = (step) => process.stderr.write(`QA: ${step}\n`);

async function waitForHydration(page) {
  await page.waitForFunction(() => {
    const form = document.querySelector(".network-search");
    return form && Object.keys(form).some((key) => key.startsWith("__reactFiber$"));
  }, { timeout: 30000 });
}

async function loadPageImages(page) {
  await page.evaluate(async () => {
    for (let position = 0; position < document.documentElement.scrollHeight; position += window.innerHeight * 0.75) {
      window.scrollTo(0, position);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    await Promise.race([
      Promise.all([...document.images].map(async (image) => {
        if (!image.complete) await new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
        if (image.complete && image.naturalWidth && image.decode) await image.decode().catch(() => {});
      })),
      new Promise((resolve) => setTimeout(resolve, 10000)),
    ]);
    window.scrollTo(0, 0);
  });
}

try {
  progress("desktop navigation");
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  desktop.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  desktop.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()} @ ${message.location().url}`); });
  desktop.on("response", (response) => { if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`); });
  await desktop.goto(baseUrl, { waitUntil: "load" });
  await waitForHydration(desktop);
  await desktop.evaluate(() => document.fonts.ready);
  await loadPageImages(desktop);
  progress("desktop images loaded");
  await desktop.locator(".hero-photo-image").waitFor({ state: "visible" });
  await desktop.screenshot({ path: path.join(qaRoot, "desktop-full.png"), fullPage: true });
  await desktop.screenshot({ path: path.join(qaRoot, "desktop-hero.png") });
  results.title = await desktop.title();
  results.desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  results.heroImage = await desktop.locator(".hero-photo-image").evaluate((image) => ({ complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }));

  await desktop.getByRole("textbox", { name: "Search by country, region, expertise or sector" }).fill("Brazil");
  await desktop.getByRole("button", { name: /^Search$/ }).click();
  if (!(await desktop.locator(".search-results").count())) {
    await desktop.screenshot({ path: path.join(qaRoot, "search-debug.png") });
    throw new Error(`Search results not visible. URL: ${desktop.url()}; input: ${await desktop.locator(".search-input-wrap input").inputValue()}; errors: ${errors.join(" | ")}`);
  }
  results.searchBrazil = await desktop.locator(".search-results").innerText();
  await desktop.getByRole("button", { name: "Clear search and filters" }).click();
  await desktop.locator("select").first().selectOption("Europe");
  results.regionEurope = await desktop.locator(".search-results").innerText();
  progress("search checked");

  await desktop.getByRole("tab", { name: "Global Market Entry" }).click();
  results.capability = await desktop.getByRole("tabpanel").locator("h2").innerText();
  await desktop.getByRole("button", { name: "Next scenario", exact: true }).click();
  results.scenario = await desktop.locator(".scenario-active h2").innerText();
  progress("capabilities and carousel checked");

  await desktop.locator('input[name="name"]').fill("Preview Tester");
  await desktop.locator('input[name="organization"]').fill("Example Organization");
  await desktop.locator('input[name="email"]').fill("test@example.com");
  await desktop.locator('input[name="jurisdictions"]').fill("Brazil");
  await desktop.locator('textarea[name="summary"]').fill("Assessing a complex market entry with regional partners.");
  await desktop.locator('select[name="timeframe"]').selectOption("Within 3 months");
  await desktop.getByRole("button", { name: "Prepare confidential overview" }).click();
  results.form = await desktop.locator(".overview-prepared").innerText();
  progress("consultation checked");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobile.goto(baseUrl, { waitUntil: "load" });
  await waitForHydration(mobile);
  await mobile.evaluate(() => document.fonts.ready);
  await loadPageImages(mobile);
  progress("mobile images loaded");
  await mobile.screenshot({ path: path.join(qaRoot, "mobile-full.png"), fullPage: true });
  results.mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await mobile.getByRole("button", { name: "Open menu" }).click();
  results.mobileMenu = await mobile.getByRole("navigation", { name: "Primary navigation" }).isVisible();

  const reducedMotion = await browser.newPage({ reducedMotion: "reduce" });
  await reducedMotion.goto(baseUrl, { waitUntil: "load" });
  results.reducedMotionTraveler = await reducedMotion.locator(".network-traveler").first().evaluate((element) => getComputedStyle(element).display);
  await reducedMotion.close();

  const source = await sharp(reference).png().toBuffer();
  const implementation = await sharp(path.join(qaRoot, "desktop-full.png")).resize({ width: 866 }).png().toBuffer();
  const sourceMeta = await sharp(source).metadata();
  const implementationMeta = await sharp(implementation).metadata();
  const comparisonHeight = Math.max(sourceMeta.height ?? 0, implementationMeta.height ?? 0);
  await sharp({ create: { width: 1732, height: comparisonHeight, channels: 4, background: "#ffffff" } })
    .composite([{ input: source, left: 0, top: 0 }, { input: implementation, left: 866, top: 0 }])
    .png()
    .toFile(path.join(qaRoot, "comparison.png"));

  results.sourceDimensions = `${sourceMeta.width}x${sourceMeta.height}`;
  results.implementationDimensions = `${implementationMeta.width}x${implementationMeta.height}`;
  results.consoleErrors = errors;
  results.failedResources = failedResources;
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  await browser.close();
}
