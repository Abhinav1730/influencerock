import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { scryptSync } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PipelineStore } from "../lib/server/pipeline-store";
import { prepareOne } from "../lib/server/pipeline";

// Playwright is optional verification tooling, installed outside the runtime release.
const moduleName = process.env.IR_PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(moduleName);
const directory = await mkdtemp(path.join(os.tmpdir(), "ir-browser-check-"));
const evidenceDirectory = path.join(
  process.cwd(),
  "review/admin-workspace/pipeline-regression",
);
await mkdir(evidenceDirectory, { recursive: true });
const base = "http://127.0.0.1:4396";
const password = "isolated-browser-admin-password";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "4396",
  ],
  {
    env: {
      ...process.env,
      IR_DATA_DIR: directory,
      IR_ADMIN_HOST: "127.0.0.1",
      RESEND_API_KEY: "",
      IR_ADMIN_PASSWORD_SCRYPT:
        "0123456789abcdef0123456789abcdef:" +
        scryptSync(
          `test@example.com:${password}`,
          Buffer.from("0123456789abcdef0123456789abcdef", "hex"),
          64,
        ).toString("hex"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (data) => {
  logs += data;
});
server.stderr.on("data", (data) => {
  logs += data;
});
let browser: any;
const store = new PipelineStore(directory);
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (server.exitCode !== null) throw new Error(logs);
    if (i === 99) throw new Error("Server did not start");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.IR_BROWSER_EXECUTABLE,
  });
  const visitor = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await visitor.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => errors.push(error.message));
  await page.goto(`${base}/contact?profile=test-abhinav-saxena`);
  await page.locator('[name="name"]').fill("Browser Verification");
  await page.locator('[name="email"]').fill("browser@example.com");
  await page.locator('[name="organization"]').fill("Synthetic verification");
  await page.locator('[name="jurisdictions"]').fill("India");
  await page.locator('[name="timeframe"]').selectOption("Within 1 month");
  await page.locator('[name="objective"]').fill("What is the capital of USA?");
  await page.locator('[name="consent"]').check();
  const received = page.waitForResponse(
    (response: any) =>
      response.url().endsWith("/api/consultations") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save consultation request" }).click();
  const response = await received;
  assert.equal(response.status(), 201);
  const request = await response.json();
  await page
    .getByRole("status")
    .filter({ hasText: "Your proposal has been received" })
    .waitFor();
  assert.equal(store.notification(`mail-${request.id}`)!.status, "pending");
  assert.equal(store.notification(`mail-${request.id}`)!.send_attempts, 0);
  await page.screenshot({
    path: path.join(evidenceDirectory, "proposal-browser.png"),
    fullPage: true,
  });
  await prepareOne(store, async () => ({
    introduction: "Thank you for your proposal.",
    insights: ["Controlled browser verification background."],
    discussionTopics: ["Discuss your requested topic."],
    sources: [{ title: "Verification source", url: "https://example.com" }],
    mode: "hermes",
    researchedAt: new Date().toISOString(),
  }));
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const dashboard = await admin.newPage();
  dashboard.on("pageerror", (error: Error) => errors.push(error.message));
  await dashboard.goto(`${base}/login`);
  await dashboard
    .getByLabel("Email address", { exact: true })
    .fill("test@example.com");
  await dashboard.getByLabel("Password", { exact: true }).fill(password);
  await dashboard.getByRole("button", { name: "Sign in to workspace" }).click();
  await dashboard.waitForURL(`${base}/`);
  assert.equal(
    (await dashboard.goto(`${base}/?id=${request.id}`)).status(),
    200,
  );
  await dashboard.getByRole("heading", { name: "Dashboard" }).waitFor();
  assert.equal(
    await dashboard
      .getByRole("link", { name: "Refresh activity" })
      .evaluate((element: HTMLElement) => getComputedStyle(element).color),
    "rgb(255, 255, 255)",
  );
  assert(
    (await dashboard.locator("body").innerText()).includes(
      "abhinav.saxena@influencerock.com",
    ),
  );
  assert(
    (await dashboard.locator("body").innerText()).includes(
      "consultation · ready",
    ),
  );
  assert.equal(
    await dashboard
      .getByRole("button", { name: /approve|send email|reject/i })
      .count(),
    0,
  );
  await dashboard.screenshot({
    path: path.join(evidenceDirectory, "admin-desktop.png"),
    fullPage: true,
  });
  await dashboard.setViewportSize({ width: 390, height: 844 });
  await dashboard.screenshot({
    path: path.join(evidenceDirectory, "admin-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await dashboard.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  const evidence = {
    checkedAt: new Date().toISOString(),
    browser: "Chromium headless",
    proposalSubmission: "passed",
    noImmediateSend: true,
    adminRendering: "desktop and mobile passed",
    adminMutations: "none",
    documentOverflow: false,
    pageErrors: errors,
    research: "controlled; live Hermes tested separately",
    providers: "disabled",
  };
  await writeFile(
    path.join(evidenceDirectory, "browser.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    "PASS Real browser submits a trivial proposal, sees the receipt, and displays the prepared email in desktop/mobile read-only admin without page errors",
  );
} finally {
  if (browser) await browser.close();
  store.close();
  server.kill("SIGTERM");
  if (server.exitCode === null)
    await new Promise((resolve) => server.once("exit", resolve));
  await rm(directory, { recursive: true, force: true });
}
