import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID, scryptSync } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PipelineStore, type Meeting } from "../lib/server/pipeline-store";
import { readWorkspace } from "../lib/server/admin-workspace";

const directory = await mkdtemp(path.join(os.tmpdir(), "ir-workspace-"));
const emptyDirectory = await mkdtemp(
  path.join(os.tmpdir(), "ir-empty-workspace-"),
);
const evidenceDirectory = path.join(process.cwd(), "review/admin-workspace");
await mkdir(evidenceDirectory, { recursive: true });
process.env.IR_DATA_DIR = directory;
const store = new PipelineStore();
const now = Date.now();
const ids: string[] = [];
for (let index = 0; index < 26; index++)
  ids.push(
    store.enqueueConsultation(
      {
        name: `Workspace Contact ${String(index).padStart(2, "0")}`,
        email: `contact${index}@example.com`,
        organization: "Synthetic verification",
        jurisdictions: "India",
        timeframe: "Within 1 month",
        expertise: "",
        objective:
          index === 0
            ? "Trade policy briefing for an international market entry proposal"
            : "Discuss a regional market entry proposal",
        profileId: "test-abhinav-saxena",
        consent: true,
      },
      `workspace-${index}`,
      now + index,
    ),
  );
const draft = {
  introduction: "Thank you for the proposal.",
  insights: ["Controlled research background for this test."],
  discussionTopics: ["Discuss trade policy and market entry."],
  sources: [
    {
      title: "Controlled research source",
      url: "https://example.com/research",
    },
  ],
  mode: "hermes",
  researchedAt: new Date(now).toISOString(),
};
store.db
  .prepare(
    "UPDATE notifications SET status='delivered',content=?,message=?,provider_id='controlled-provider' WHERE request_id=?",
  )
  .run(
    JSON.stringify(draft),
    JSON.stringify({
      from: "Abhinav Saxena <abhinav.saxena@influencerock.com>",
      to: ["contact0@example.com"],
      subject: "Your proposal",
      text: "Please do not reply to this email.",
    }),
    ids[0],
  );
store.db
  .prepare(
    "INSERT INTO notifications(id,request_id,source_key,kind,status,due_at,next_at,last_error) VALUES(?,?,?,'consultation','failed',?,?,?)",
  )
  .run(
    "extra-email",
    ids[0],
    "controlled-extra-email",
    now + 1000,
    now,
    "Controlled provider rejection",
  );
const meetingIds: string[] = [];
for (const [index, status, offset] of [
  [0, "confirmed", 86400_000],
  [1, "cancelled", 86400_000],
  [2, "confirmed", -86400_000],
  [3, "pending", 84600_000],
] as const) {
  const id = `sm_${randomUUID()}`;
  meetingIds.push(id);
  const meeting: Meeting = {
    id,
    delegateId: "test-abhinav-saxena",
    organizerName: `Meeting Organizer ${index}`,
    organizerEmail: `meeting${index}@example.com`,
    title: `Workspace Meeting ${index}`,
    agenda: "Discuss the market entry proposal",
    startsAt:
      index === 3
        ? new Date(now + offset + 19800_000)
            .toISOString()
            .replace("Z", "+05:30")
        : new Date(now + offset).toISOString(),
    endsAt: new Date(now + offset + 1800_000).toISOString(),
    timezone: "America/New_York",
    bookingStatus: status,
    sessionStatus: "idle",
    revision: 1,
    meetingUrl: `https://smartmeet.org/meeting/${id}#access=controlled-private-access-token`,
    resultStatus: "pending",
  };
  store.ingestMeeting(
    meeting,
    [
      {
        id: randomUUID(),
        kind: "confirmed",
        revision: 1,
        dueAt: new Date(now).toISOString(),
      },
      {
        id: randomUUID(),
        kind: "reminder",
        revision: 1,
        dueAt: new Date(now + 1000).toISOString(),
      },
    ],
    now + index * 1000,
  );
}
// A later update must not turn an old booking into the newest booking.
store.db
  .prepare("UPDATE meetings SET updated_at=? WHERE id=?")
  .run(now + 99999, meetingIds[0]);
store.db
  .prepare("INSERT INTO worker_health VALUES(?,?,?)")
  .run("preparation-1", now, "Controlled worker heartbeat");
const before = JSON.stringify({
  notifications: store.db
    .prepare("SELECT id,status,send_attempts FROM notifications ORDER BY id")
    .all(),
  events: store.db.prepare("SELECT count(*) AS n FROM events").get(),
});
const evidence: string[] = [];
function pass(message: string) {
  evidence.push(message);
  console.log(`PASS ${message}`);
}
let browser: any;
let server: ReturnType<typeof spawn> | undefined;
let logs = "";
try {
  const overview = readWorkspace("dashboard", {}, now);
  assert.deepEqual(overview.summary, {
    proposals: 26,
    meetings: 4,
    upcomingMeetings: 2,
    emails: 35,
    queuedEmails: 31,
    deliveredEmails: 1,
    attentionEmails: 1,
    events: Number(
      store.db.prepare("SELECT count(*) AS n FROM events").get()!.n,
    ),
  });
  assert.equal(overview.recentProposals.length, 5);
  assert.deepEqual(
    overview.upcoming.map((row) => JSON.parse(String(row.snapshot)).id),
    [meetingIds[3], meetingIds[0]],
  );
  const page1 = readWorkspace("proposals", { q: "Workspace", page: "1" });
  const page2 = readWorkspace("proposals", { q: "Workspace", page: "2" });
  assert.equal(page1.total, 26);
  assert.equal(page1.rows.length, 25);
  assert.equal(page2.rows.length, 1);
  assert.equal(
    new Set([...page1.rows, ...page2.rows].map((row) => row.id)).size,
    26,
  );
  assert.equal(readWorkspace("proposals", { page: "999999" }).page, 2);
  assert.equal(readWorkspace("emails").total, 35);
  assert.equal(
    readWorkspace("proposals", { q: "Trade policy briefing" }).total,
    1,
  );
  assert.equal(
    readWorkspace("emails", { q: "Trade policy briefing" }).total,
    2,
  );
  assert.equal(readWorkspace("emails", { status: "delivered" }).total, 1);
  assert.equal(readWorkspace("emails", { status: "accepted" }).total, 0);
  assert.equal(readWorkspace("meetings", { status: "cancelled" }).total, 1);
  assert.equal(
    readWorkspace("activity", { status: "request.saved" }).total,
    30,
  );
  for (const view of ["proposals", "meetings", "emails", "activity"] as const)
    assert.equal(readWorkspace(view, { q: "' OR 1=1--" }).total, 0);
  assert.deepEqual(
    readWorkspace("meetings").rows.map((row) => row.id),
    [...meetingIds].reverse(),
  );
  assert.deepEqual(
    readWorkspace("meetings", { sort: "oldest" }).rows.map((row) => row.id),
    meetingIds,
  );
  assert.deepEqual(
    readWorkspace("meetings", { sort: "schedule_asc" }).rows.map(
      (row) => row.id,
    ),
    [meetingIds[2], meetingIds[0], meetingIds[1], meetingIds[3]].sort(
      (a, b) => {
        const left = store.meeting(a)!,
          right = store.meeting(b)!;
        return (
          Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
          a.localeCompare(b)
        );
      },
    ),
  );
  const descending = readWorkspace("meetings", {
    sort: "schedule_desc",
  }).rows.map((row) => row.id);
  assert.deepEqual(
    descending,
    [
      ...readWorkspace("meetings", { sort: "schedule_asc" }).rows.map(
        (row) => row.id,
      ),
    ].reverse(),
  );
  assert.equal(readWorkspace("proposals").rows[0].id, ids[25]);
  assert.equal(
    readWorkspace("proposals", { sort: "oldest" }).rows[0].id,
    ids[0],
  );
  assert.equal(readWorkspace("emails").rows[0].id, `meeting-${meetingIds[3]}`);
  assert.equal(readWorkspace("emails", { sort: "oldest" }).rows[0].id, ids[0]);
  const eventFirst = readWorkspace("activity", { sort: "oldest" }).rows[0];
  assert.equal(
    eventFirst.id,
    store.db
      .prepare("SELECT id FROM events ORDER BY created_at,id LIMIT 1")
      .get()!.id,
  );
  assert.equal(
    readWorkspace("meetings", { sort: "not-a-sort;DROP TABLE meetings" }).sort,
    "newest",
  );
  for (const view of ["proposals", "meetings", "emails", "activity"] as const) {
    assert.equal(readWorkspace(view, { q: "%" }).total, 0);
    assert.equal(readWorkspace(view, { q: "a_b" }).total, 0);
    assert.equal(readWorkspace(view, { q: "\\" }).total, 0);
    assert.ok(
      readWorkspace(view, { q: "abhinav.saxena@influencerock.com" }).total > 0,
    );
    assert.equal(
      readWorkspace(view, { q: "missing-search-text", status: "confirmed" })
        .total,
      0,
    );
  }
  assert.equal(
    readWorkspace("meetings", {
      q: "market entry proposal",
      status: "cancelled",
    }).total,
    1,
  );
  const deliveredSearch = readWorkspace("emails", {
    q: "contact0@example.com",
    status: "delivered",
  });
  assert.equal(deliveredSearch.total, 1);
  assert.equal(deliveredSearch.rows[0].status, "delivered");
  pass(
    "Default and alternate ordering use booking/received time rather than future due dates; booking updates do not reorder old records; schedule sorting compares real instants across UTC offsets; filters combine and search is literal across delegates/agenda",
  );
  process.env.IR_DATA_DIR = emptyDirectory;
  const empty = readWorkspace("dashboard");
  assert.equal(
    Object.values(empty.summary).every((count) => count === 0),
    true,
  );
  assert.equal(empty.recentEvents.length, 0);
  process.env.IR_DATA_DIR = directory;
  pass(
    "Summary counts match stored records; proposals are unique despite multiple emails; upcoming excludes past/cancelled meetings; delivery is distinct from acceptance; pagination/search/filtering/empty data are correct",
  );

  const base = "http://127.0.0.1:4395";
  const email = "workspace-admin@example.com",
    password = "isolated-workspace-password";
  const salt = Buffer.from("0123456789abcdef0123456789abcdef", "hex");
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "4395",
    ],
    {
      env: {
        ...process.env,
        IR_ADMIN_HOST: "127.0.0.1",
        IR_ADMIN_PASSWORD_SCRYPT:
          salt.toString("hex") +
          ":" +
          scryptSync(`${email}:${password}`, salt, 64).toString("hex"),
        RESEND_API_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout!.on("data", (x) => {
    logs += x;
  });
  server.stderr!.on("data", (x) => {
    logs += x;
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(base + "/login")).ok) break;
    } catch {}
    if (server.exitCode !== null) throw new Error(logs);
    if (attempt === 99) throw new Error("Server did not start");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  for (const route of [
    "/",
    "/proposals",
    "/meetings",
    "/emails",
    "/activity",
  ]) {
    for (const cookie of ["", "__Host-ir_admin=" + "a".repeat(43)]) {
      const response = await fetch(base + route, {
        headers: { Cookie: cookie },
        redirect: "manual",
      });
      assert.equal(response.status, 307);
      assert.equal(
        new URL(response.headers.get("location")!, base).pathname,
        "/login",
      );
    }
    const response = await fetch(base + route + "?_rsc=protected", {
      headers: { RSC: "1" },
      redirect: "manual",
    });
    assert.equal(response.status, 307);
  }
  for (const route of ["/proposals", "/meetings", "/emails", "/activity"]) {
    const status = await new Promise<number>((resolve, reject) =>
      http
        .get(
          base + route,
          { headers: { Host: "influencerock.com" } },
          (response) => {
            response.resume();
            response.on("end", () => resolve(response.statusCode!));
          },
        )
        .on("error", reject),
    );
    assert.equal(status, 404);
  }
  pass(
    "Every page rejects anonymous/forged-cookie/RSC access; dedicated admin views return 404 on the public host",
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
  await page.goto(base + "/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.waitForURL(base + "/");
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page
    .getByRole("link", { name: /Total proposals/ })
    .getByText("26", { exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: /Upcoming meetings/ })
    .getByText("2", { exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(evidenceDirectory, "dashboard-desktop.png"),
    fullPage: true,
  });
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  for (const label of [
    "Proposals",
    "Meetings",
    "Emails",
    "Activity",
    "Dashboard",
  ]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await page.getByRole("heading", { name: label, exact: true }).waitFor();
    assert.equal(
      await nav
        .getByRole("link", { name: label, exact: true })
        .getAttribute("aria-current"),
      "page",
    );
    await page.reload();
    await page.getByRole("heading", { name: label, exact: true }).waitFor();
  }
  await nav.getByRole("link", { name: "Proposals", exact: true }).click();
  await page.getByLabel("Find request, person or delegate").fill("Workspace");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.waitForURL(/q=Workspace/);
  await page.getByRole("link", { name: "Next →", exact: true }).click();
  await page.waitForURL(/page=2/);
  assert.equal(new URL(page.url()).searchParams.get("q"), "Workspace");
  await page
    .getByRole("link", { name: "View proposal →", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Request details", exact: true })
    .waitFor();
  await page
    .getByText("Controlled research background for this test.")
    .waitFor();
  await page.getByText("Exact outbound email").click();
  await page.getByText("Your proposal", { exact: false }).last().waitFor();
  await page
    .getByRole("link", { name: "← Back to proposals", exact: true })
    .click();
  assert.equal(new URL(page.url()).searchParams.get("q"), "Workspace");
  assert.equal(new URL(page.url()).searchParams.get("page"), "2");
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await page.waitForURL(base + "/proposals");
  await page
    .getByRole("link", { name: "Clear filters", exact: true })
    .waitFor({ state: "detached" });
  assert.equal(
    await page.getByLabel("Find request, person or delegate").inputValue(),
    "",
  );
  // Changing order submits immediately, retains typed search, and resets pagination.
  await page.getByLabel("Find request, person or delegate").fill("Workspace");
  await page.getByLabel("Order", { exact: true }).selectOption("oldest");
  await page.waitForURL(/sort=oldest/);
  assert.equal(new URL(page.url()).searchParams.get("q"), "Workspace");
  assert.equal(
    await page
      .locator("tbody tr")
      .first()
      .locator("td strong")
      .first()
      .innerText(),
    "Workspace Contact 00",
  );
  await page.getByRole("link", { name: "Next →", exact: true }).click();
  await page.waitForURL(/page=2/);
  assert.equal(new URL(page.url()).searchParams.get("sort"), "oldest");
  await page
    .getByRole("link", { name: "View proposal →", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Request details", exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).searchParams.get("sort"), "oldest");
  await page
    .getByRole("link", { name: "← Back to proposals", exact: true })
    .click();
  assert.equal(new URL(page.url()).searchParams.get("sort"), "oldest");
  assert.equal(new URL(page.url()).searchParams.get("page"), "2");
  await page.getByLabel("Email state", { exact: true }).selectOption("failed");
  await page.waitForURL(/status=failed/);
  assert.equal(new URL(page.url()).searchParams.has("page"), false);
  assert.equal(new URL(page.url()).searchParams.get("sort"), "oldest");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page
    .getByRole("link", { name: "Refresh activity", exact: true })
    .click();
  assert.equal(new URL(page.url()).searchParams.get("sort"), "oldest");
  assert.equal(new URL(page.url()).searchParams.get("status"), "failed");
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await page.waitForURL(base + "/proposals");
  assert.equal(
    await page.getByLabel("Order", { exact: true }).inputValue(),
    "newest",
  );
  assert.equal(
    await page.getByLabel("Email state", { exact: true }).inputValue(),
    "",
  );
  await page
    .getByLabel("Find request, person or delegate")
    .fill("No matching fixture");
  await page.getByLabel("Find request, person or delegate").press("Enter");
  await page.waitForURL(/q=No/);
  await page
    .getByRole("heading", { name: "No matching proposals", exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await page.waitForURL(base + "/proposals");
  await page.getByLabel("Order", { exact: true }).selectOption("oldest");
  await page.waitForURL(/sort=oldest/);
  await page.getByLabel("Order", { exact: true }).selectOption("newest");
  await page.waitForURL(/sort=newest/);
  await page.goBack();
  await page.waitForURL(/sort=oldest/);
  await page
    .getByRole("status")
    .getByText("Status and order apply automatically.", { exact: false })
    .waitFor();
  pass(
    "Dropdowns submit without a button click; typed search and sort survive pagination/detail/back/refresh; changing state resets page; clear resets all controls; Enter search and browser back work",
  );
  await nav.getByRole("link", { name: "Emails", exact: true }).click();
  await page.waitForURL(base + "/emails");
  await page.getByRole("heading", { name: "Emails", exact: true }).waitFor();
  await page
    .getByLabel("Email state", { exact: true })
    .selectOption("delivered");
  await page.waitForURL(/status=delivered/);
  assert.equal(
    await page.getByRole("link", { name: "View email →", exact: true }).count(),
    1,
  );
  await page.screenshot({
    path: path.join(evidenceDirectory, "emails-desktop.png"),
    fullPage: true,
  });
  await nav.getByRole("link", { name: "Meetings", exact: true }).click();
  await page.getByLabel("Booking status").selectOption("cancelled");
  await page.waitForURL(/status=cancelled/);
  assert.equal(
    await page
      .getByRole("link", { name: "View meeting →", exact: true })
      .count(),
    1,
  );
  await page.getByLabel("Order", { exact: true }).selectOption("schedule_asc");
  await page.waitForURL(/sort=schedule_asc/);
  assert.equal(new URL(page.url()).searchParams.get("status"), "cancelled");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByRole("link", { name: "View meeting →", exact: true }).click();
  await page
    .getByRole("heading", { name: "Current meeting", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Open private meeting details", exact: true })
    .waitFor();
  await nav.getByRole("link", { name: "Activity", exact: true }).click();
  await page
    .getByText("Controlled worker heartbeat", { exact: true })
    .waitFor();
  await page.getByLabel("Event type").selectOption("request.saved");
  await page.waitForURL(/status=request.saved/);
  await page.getByRole("link", { name: "Next →", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: /approve|send email|reject/i })
      .count(),
    0,
  );
  pass(
    "Desktop sidebar, active state, direct refresh, list filters, pagination, filter-preserving detail/back links, exact email, meeting details and worker/event views work in Chromium",
  );

  store.db
    .prepare("UPDATE worker_health SET details=? WHERE name=?")
    .run("Fresh heartbeat after refresh check", "preparation-1");
  await page
    .getByRole("link", { name: "Refresh activity", exact: true })
    .click();
  await page
    .getByText("Fresh heartbeat after refresh check", { exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).searchParams.get("status"), "request.saved");
  pass(
    "Refresh activity reads a new database snapshot and preserves the active filter",
  );

  let releaseMeeting!: () => void;
  let observePrefetch!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseMeeting = resolve;
  });
  const prefetched = new Promise<void>((resolve) => {
    observePrefetch = resolve;
  });
  const meetingRoute = "**/meetings?*";
  await page.route(meetingRoute, async (route: any) => {
    observePrefetch();
    await gate;
    await route.continue();
  });
  try {
    await page.goto(base + "/");
    await page
      .getByRole("heading", { name: "Dashboard", exact: true })
      .waitFor();
    await Promise.race([
      prefetched,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Meetings was not prefetched")),
          5000,
        ),
      ),
    ]);
    const meetingTab = nav.getByRole("link", { name: "Meetings", exact: true });
    await meetingTab.click();
    await meetingTab.locator('[aria-busy="true"]').waitFor({ timeout: 3000 });
    releaseMeeting();
    await page
      .getByRole("heading", { name: "Meetings", exact: true })
      .waitFor();
    await meetingTab.locator('[aria-busy="false"]').waitFor();
    pass(
      "Sidebar prefetches dynamic tab pages; a deliberately held response shows a pending indicator until navigation completes",
    );
  } finally {
    releaseMeeting();
    await page.unroute(meetingRoute);
  }

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + "/");
    await page
      .getByRole("heading", { name: "Dashboard", exact: true })
      .waitFor();
    if (width === 390)
      await page.screenshot({
        path: path.join(evidenceDirectory, "dashboard-mobile.png"),
        fullPage: true,
      });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    if (width < 761) {
      for (const label of [
        "Proposals",
        "Meetings",
        "Emails",
        "Activity",
        "Dashboard",
      ]) {
        const toggle = page.getByRole("button", {
          name: "Open navigation",
          exact: true,
        });
        await toggle.click();
        assert.equal(
          await page
            .getByRole("button", { name: "Close navigation", exact: true })
            .getAttribute("aria-expanded"),
          "true",
        );
        await nav.getByRole("link", { name: label, exact: true }).click();
        await page.getByRole("heading", { name: label, exact: true }).waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "Open navigation", exact: true })
            .getAttribute("aria-expanded"),
          "false",
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        );
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/emails");
  await page
    .getByLabel("Email state", { exact: true })
    .selectOption("delivered");
  await page.waitForURL(/status=delivered/);
  await page.getByLabel("Order", { exact: true }).selectOption("due_asc");
  await page.waitForURL(/sort=due_asc/);
  assert.equal(new URL(page.url()).searchParams.get("status"), "delivered");
  assert.equal(await page.locator("tbody tr").count(), 1);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  pass(
    "Mobile status and ordering dropdowns apply immediately together without viewport overflow",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(base + "/login");
  assert.deepEqual(errors, []);
  const after = JSON.stringify({
    notifications: store.db
      .prepare("SELECT id,status,send_attempts FROM notifications ORDER BY id")
      .all(),
    events: store.db.prepare("SELECT count(*) AS n FROM events").get(),
  });
  assert.equal(after, before);
  pass(
    "Responsive navigation and all views work at 320/390px, tablet has no overflow, logout works, browser errors are absent, and viewing records never changes the queue or sends mail",
  );
  await writeFile(
    path.join(evidenceDirectory, "workspace-verification.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        scenarios: evidence,
        syntheticCounts: overview.summary,
        pageErrors: errors,
        readOnly: true,
        realEmailSent: false,
        paidMeetingStarted: false,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  if (browser) await browser.close();
  store.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server!.once("exit", resolve));
  }
  await rm(directory, { recursive: true, force: true });
  await rm(emptyDirectory, { recursive: true, force: true });
}
