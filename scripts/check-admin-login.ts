import assert from "node:assert/strict";
import http from "node:http";
import { scryptSync } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { adminSessionAuthorized } from "../lib/server/admin-auth";

const directory = await mkdtemp(path.join(os.tmpdir(), "ir-auth-check-"));
const evidenceDirectory = path.join(process.cwd(), "review/admin-workspace");
await mkdir(evidenceDirectory, { recursive: true });
const base = "http://127.0.0.1:4397";
const email = "test-admin@example.com";
const password = "isolated-test-admin-password";
const salt = "0123456789abcdef0123456789abcdef";
const digest =
  salt +
  ":" +
  scryptSync(`${email}:${password}`, Buffer.from(salt, "hex"), 64).toString(
    "hex",
  );
const env = {
  ...process.env,
  IR_DATA_DIR: directory,
  IR_ADMIN_HOST: "127.0.0.1",
  RESEND_API_KEY: "",
  IR_ADMIN_PASSWORD_SCRYPT: digest,
};
const evidence: string[] = [];
let output = "";
let server: ChildProcessWithoutNullStreams;
let browser: any;
function pass(value: string) {
  evidence.push(value);
  console.log(`PASS ${value}`);
}
async function start() {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "4397",
    ],
    { env },
  );
  server.stdout.on("data", (x) => {
    output += x;
  });
  server.stderr.on("data", (x) => {
    output += x;
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/login")).ok) return;
    } catch {}
    if (server.exitCode !== null) throw new Error(output);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server did not start");
}
async function stop() {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
}
function login(
  fields: unknown = { email, password },
  extra: Record<string, string> = {},
  origin: string | null = base,
) {
  return fetch(base + "/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
      ...extra,
    },
    body: JSON.stringify(fields),
  });
}
const overview = (cookie: string) =>
  fetch(base + "/api/admin/overview", { headers: { Cookie: cookie } });
const logout = (cookie: string, origin = base) =>
  fetch(base + "/api/admin/logout", {
    method: "POST",
    headers: { Cookie: cookie, Origin: origin },
  });
const cookieOf = (response: Response) =>
  response.headers.get("set-cookie")!.split(";")[0];
function root(cookie = "") {
  return new Promise<{ status: number; location?: string }>(
    (resolve, reject) => {
      http
        .get(
          base,
          {
            headers: {
              Host: "127.0.0.1:4397",
              Cookie: cookie,
              "X-Forwarded-Proto": "http",
            },
          },
          (response) => {
            response.resume();
            response.on("end", () =>
              resolve({
                status: response.statusCode!,
                location: response.headers.location,
              }),
            );
          },
        )
        .on("error", reject);
    },
  );
}
try {
  await start();
  for (const suffix of ["", "?_rsc=private"]) {
    const response = await fetch(base + "/" + suffix, {
      redirect: "manual",
    });
    assert.equal(response.status, 307);
    assert.equal(
      new URL(response.headers.get("location")!, base).href,
      base + "/login",
    );
    assert.equal(response.headers.has("www-authenticate"), false);
  }
  assert.equal(new URL((await root()).location!, base).href, base + "/login");
  assert.equal((await fetch(base + "/api/admin/overview")).status, 401);
  const forged = "__Host-ir_admin=" + "a".repeat(43);
  assert.equal((await overview(forged)).status, 401);
  const forgedPage = await fetch(base + "/", {
    headers: { Cookie: forged },
    redirect: "manual",
  });
  assert.equal(forgedPage.status, 307);
  assert.equal(forgedPage.headers.get("location"), "/login");
  pass(
    "Anonymous HTML/RSC requests redirect to login; API and forged cookies cannot access data; no browser Basic prompt",
  );

  assert.equal((await login(undefined, {}, null)).status, 403);
  assert.equal(
    (await login(undefined, {}, "https://evil.example")).status,
    403,
  );
  assert.equal(
    (await login(undefined, { "Sec-Fetch-Site": "cross-site" })).status,
    403,
  );
  assert.equal((await fetch(base + "/api/admin/login")).status, 405);
  assert.equal((await fetch(base + "/api/admin/logout")).status, 405);
  const invalid = await login({ email, password: "incorrect" });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.headers.has("set-cookie"), false);
  assert.deepEqual(
    await invalid.json(),
    await (
      await login({ email: "unknown@example.com", password: "incorrect" })
    ).json(),
  );
  assert.equal((await login({})).status, 401);
  assert.equal(
    (await login({ email, password: "x".repeat(5000) })).status,
    400,
  );
  pass(
    "Wrong credentials have a generic error; cross-site/missing-origin requests, GET mutations, and oversized bodies are rejected",
  );

  const signedIn = await login();
  assert.equal(signedIn.status, 200);
  const setCookie = signedIn.headers.get("set-cookie")!;
  for (const flag of [
    "HttpOnly",
    "Secure",
    "SameSite=lax",
    "Path=/",
    "Max-Age=43200",
  ])
    assert(setCookie.includes(flag));
  assert(!setCookie.includes("Domain="));
  assert(signedIn.headers.get("cache-control")!.includes("no-store"));
  const cookie1 = cookieOf(signedIn);
  assert.equal((await root(cookie1)).status, 200);
  assert.equal((await overview(cookie1)).status, 200);
  const dashboard = await fetch(base + "/", {
    headers: { Cookie: cookie1 },
  });
  assert.equal(dashboard.status, 200);
  const html = await dashboard.text();
  assert(html.includes("Dashboard"));
  assert(!html.includes(password));
  assert(!html.includes(cookie1));
  assert.equal((await logout(cookie1, "https://evil.example")).status, 403);
  assert.equal((await overview(cookie1)).status, 200);
  const rotated = await login(undefined, { Cookie: cookie1 });
  const cookie2 = cookieOf(rotated);
  assert.notEqual(cookie1, cookie2);
  assert.equal((await overview(cookie1)).status, 401);
  assert.equal((await overview(cookie2)).status, 200);
  pass(
    "Valid login sets a 12-hour host-only secure HttpOnly cookie; login rotates sessions; forged cross-site logout leaves the session intact",
  );

  const db = new DatabaseSync(path.join(directory, "admin-auth.sqlite"));
  assert.equal(
    db
      .prepare("SELECT token_hash FROM sessions")
      .all()
      .some((row) => cookie2.includes(String(row.token_hash))),
    false,
  );
  process.env.IR_DATA_DIR = directory;
  process.env.IR_ADMIN_PASSWORD_SCRYPT = digest;
  assert.equal(adminSessionAuthorized(new Headers({ Cookie: cookie2 })), true);
  process.env.IR_ADMIN_PASSWORD_SCRYPT =
    salt +
    ":" +
    scryptSync("rotated-credential", Buffer.from(salt, "hex"), 64).toString(
      "hex",
    );
  assert.equal(adminSessionAuthorized(new Headers({ Cookie: cookie2 })), false);
  process.env.IR_ADMIN_PASSWORD_SCRYPT = digest;
  db.prepare("UPDATE sessions SET expires_at=?").run(Date.now() - 1);
  assert.equal((await overview(cookie2)).status, 401);
  const expiredPage = await fetch(base + "/", {
    headers: { Cookie: cookie2 },
    redirect: "manual",
  });
  assert.equal(expiredPage.headers.get("location"), "/login");
  db.close();
  const fresh = cookieOf(await login());
  const signedOut = await logout(fresh);
  assert.equal(signedOut.status, 200);
  assert(signedOut.headers.get("set-cookie")!.includes("Max-Age=0"));
  assert.equal((await overview(fresh)).status, 401);
  pass(
    "Server enforces expiry and credential rotation; logout revokes the retained cookie; only token hashes are persisted",
  );

  const attempts = await Promise.all(
    Array.from({ length: 12 }, () =>
      login({ email, password: "incorrect" }, { "X-Real-IP": "198.51.100.19" }),
    ),
  );
  assert.equal(attempts.filter((r) => r.status === 401).length, 10);
  assert.equal(attempts.filter((r) => r.status === 429).length, 2);
  await stop();
  await start();
  const limited = await login(undefined, { "X-Real-IP": "198.51.100.19" });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "600");
  assert.equal((await overview(fresh)).status, 401);
  pass(
    "Concurrent attempts are limited atomically to 10 per IP per 10 minutes; limits and revocations survive a server restart",
  );

  const moduleName = process.env.IR_PLAYWRIGHT_MODULE || "playwright";
  const { chromium } = await import(moduleName);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.IR_BROWSER_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => errors.push(error.message));
  await page.goto(base + "/");
  await page.waitForURL(base + "/login");
  await page.getByRole("heading", { name: "Welcome back." }).waitFor();
  assert.equal(await page.locator("#header").count(), 0);
  assert.equal(await page.locator("#footer").count(), 0);
  await page.screenshot({
    path: path.join(evidenceDirectory, "login-desktop.png"),
    fullPage: true,
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Sign in to workspace" })
        .isVisible(),
      true,
    );
    if (width === 390)
      await page.screenshot({
        path: path.join(evidenceDirectory, "login-mobile.png"),
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator("#password")
      .evaluate((x: HTMLElement) => x === document.activeElement),
    true,
  );
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Show password" }).click();
  assert.equal(await page.locator("#password").getAttribute("type"), "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  assert.equal(
    await page.locator("#password").getAttribute("type"),
    "password",
  );
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "email or password is incorrect" })
    .waitFor();
  await page.route("**/api/admin/login", (route: any) => route.abort(), {
    times: 1,
  });
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Unable to connect" })
    .waitFor();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.waitForURL(base + "/");
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
    0,
  );
  assert.equal(
    await page.evaluate(() => document.cookie.includes("ir_admin")),
    false,
  );
  const validCookie = (await context.cookies()).find(
    (x: any) => x.name === "__Host-ir_admin",
  );
  assert(validCookie?.httpOnly && validCookie.secure);
  await page.goto(base + "/login");
  await page.waitForURL(base + "/");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(base + "/login");
  await page.goBack();
  assert.equal(page.url().endsWith("/login"), true);
  assert.equal(
    (await overview(`__Host-ir_admin=${validCookie.value}`)).status,
    401,
  );
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobilePage = await mobile.newPage();
  mobilePage.on("pageerror", (error: Error) => errors.push(error.message));
  await mobilePage.goto(base + "/login");
  await mobilePage.getByLabel("Email address", { exact: true }).fill(email);
  await mobilePage.getByLabel("Password", { exact: true }).fill(password);
  await mobilePage
    .getByRole("button", { name: "Sign in to workspace" })
    .click();
  await mobilePage.waitForURL(base + "/");
  await mobilePage.getByRole("heading", { name: "Dashboard" }).waitFor();
  await mobilePage.getByRole("button", { name: "Open navigation" }).click();
  await mobilePage
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await mobilePage.waitForURL(base + "/login");
  await mobile.close();
  assert.deepEqual(errors, []);
  pass(
    "Chromium desktop/mobile login, accessible labels/tab order, password toggle, error recovery, session redirect and logout work with no overflow or page errors",
  );
  await writeFile(
    path.join(evidenceDirectory, "verification.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        scenarios: evidence,
        pageErrors: errors,
        providers: "disabled",
        realEmailSent: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Verified ${evidence.length} authentication scenarios against a production build.`,
  );
} finally {
  if (browser) await browser.close();
  await stop();
  await rm(directory, { recursive: true, force: true });
}
