import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

if (process.env.IR_LIVE_ADMIN_LOGIN_CHECK !== "yes")
  throw new Error("Set IR_LIVE_ADMIN_LOGIN_CHECK=yes explicitly");
const credentials = Object.fromEntries(
  (await readFile("/root/influencerock-admin-credentials.txt", "utf8"))
    .trim()
    .split("\n")
    .map((line) => {
      const at = line.indexOf(":");
      return [line.slice(0, at), line.slice(at + 1).trim()];
    }),
);
const base = "https://admin.influencerock.com";
const evidenceDirectory = path.join(process.cwd(), "review/admin-workspace");
const moduleName = process.env.IR_PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(moduleName);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.IR_BROWSER_EXECUTABLE,
});
const errors: string[] = [];
try {
  const root = await fetch(base, { redirect: "manual" });
  assert.equal(root.status, 307);
  assert.equal(
    new URL(root.headers.get("location")!, base).href,
    base + "/login",
  );
  assert.equal(root.headers.has("www-authenticate"), false);
  assert.equal((await fetch(base + "/api/admin/overview")).status, 401);
  for (const [legacy, destination] of [
    ["/admin/login", "/login"],
    ["/admin?status=ready", "/?status=ready"],
  ]) {
    const response = await fetch(base + legacy, { redirect: "manual" });
    assert.equal(response.status, 308);
    assert.equal(
      new URL(response.headers.get("location")!, base).href,
      base + destination,
    );
  }

  assert.equal((await fetch("https://influencerock.com")).status, 200);
  const publicLogin = await fetch("https://influencerock.com/login", {
    redirect: "manual",
  });
  assert.equal(publicLogin.status, 307);
  assert.equal(publicLogin.headers.get("location"), base + "/login");

  for (const [label, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", (error: Error) => errors.push(error.message));
    await page.goto(base);
    await page.waitForURL(base + "/login");
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("#header").count(), 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(evidenceDirectory, `live-login-${label}.png`),
      fullPage: true,
    });
    await page
      .getByLabel("Email address", { exact: true })
      .fill(credentials.Email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(credentials.Password);
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    await page.waitForURL(base + "/");
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();
    assert.equal(await page.locator('a[href^="/admin"]').count(), 0);
    assert.equal(await page.locator("#header").count(), 0);

    assert.equal(
      (await context.request.get(base + "/api/admin/overview")).status(),
      200,
    );
    for (const [tab, route] of [
      ["Proposals", "/proposals"],
      ["Meetings", "/meetings"],
      ["Emails", "/emails"],
      ["Activity", "/activity"],
      ["Dashboard", "/"],
    ]) {
      if (width < 761)
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
      await page
        .getByRole("navigation", { name: "Admin navigation" })
        .getByRole("link", { name: tab, exact: true })
        .click();
      await page.waitForURL(base + route);
      await page.getByRole("heading", { name: tab, exact: true }).waitFor();
      if (width < 761)
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
      assert.equal(
        await page
          .getByRole("navigation", { name: "Admin navigation" })
          .getByRole("link", { name: tab, exact: true })
          .getAttribute("aria-current"),
        "page",
      );
      if (width < 761)
        await page
          .getByRole("button", { name: "Close navigation", exact: true })
          .click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
      );
    }
    await page.reload();
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();
    const cookie = (await context.cookies()).find(
      (x: any) => x.name === "__Host-ir_admin",
    );
    assert(cookie?.httpOnly && cookie.secure && cookie.sameSite === "Lax");
    assert.equal(
      await page.evaluate(() => document.cookie.includes("ir_admin")),
      false,
    );
    if (width < 761)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(base + "/login");
    assert.equal(
      (
        await fetch(base + "/api/admin/overview", {
          headers: { Cookie: `__Host-ir_admin=${cookie.value}` },
        })
      ).status,
      401,
    );
    await context.close();
    console.log(
      `PASS Public HTTPS ${label} login, dashboard, refresh, secure cookie and server-side logout revocation`,
    );
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(evidenceDirectory, "live-verification.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        base,
        https: true,
        paths: { login: "/login", dashboard: "/" },
        identity: "email and password",
        legacyRoutes: "308 redirects with query preservation",
        desktop: "login / all five sidebar views / refresh / logout passed",
        mobile:
          "login / responsive navigation / all five views / refresh / logout passed",
        anonymousApi: 401,
        revokedCookieApi: 401,
        publicHomepage: 200,
        cookie: "host-only, Secure, HttpOnly, SameSite=Lax",
        pageErrors: errors,
        screenshots: "login only; no credentials or customer data",
        mailSentByTest: false,
        meetingsCreatedByTest: false,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
