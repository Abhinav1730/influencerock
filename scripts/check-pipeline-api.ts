import assert from "node:assert/strict";
import http from "node:http";
import { createHmac, randomUUID, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PipelineStore } from "../lib/server/pipeline-store";
import { prepareOne, sendOne } from "../lib/server/pipeline";

const directory = await mkdtemp(path.join(os.tmpdir(), "ir-pipeline-api-"));
const bridgeKey = "isolated-bridge-credential-at-least-thirty-two";
const webhookKey = Buffer.from("isolated-webhook-secret-at-least-thirty-two");
const base = "http://127.0.0.1:4398";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "4398",
  ],
  {
    env: {
      ...process.env,
      IR_DATA_DIR: directory,
      IR_ADMIN_HOST: "127.0.0.1",
      RESEND_API_KEY: "",
      SMARTMEET_BRIDGE_KEY: bridgeKey,
      SMARTMEET_URL: "https://smartmeet.org",
      IR_ADMIN_PASSWORD_SCRYPT:
        "0123456789abcdef0123456789abcdef:" +
        scryptSync(
          "test-admin@example.com:isolated-admin-credential",
          Buffer.from("0123456789abcdef0123456789abcdef", "hex"),
          64,
        ).toString("hex"),
      RESEND_WEBHOOK_SECRET: `whsec_${webhookKey.toString("base64")}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
server.stdout.on("data", (x) => {
  output += x;
});
server.stderr.on("data", (x) => {
  output += x;
});
const evidence: string[] = [];
function pass(value: string) {
  evidence.push(value);
  console.log(`PASS ${value}`);
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (server.exitCode !== null) throw new Error(output);
    if (i === 99) throw new Error("Test server did not start");
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const url of ["/", "/?_rsc=private"]) {
    const response = await fetch(base + url, { redirect: "manual" });
    assert.equal(response.status, 307);
    assert.equal(
      new URL(response.headers.get("location")!, base).href,
      base + "/login",
    );
  }
  assert.equal((await fetch(base + "/api/admin/overview")).status, 401);
  assert.equal(
    (
      await fetch(base + "/api/admin/overview", {
        headers: { Authorization: "Basic d3Jvbmc6d3Jvbmc=" },
      })
    ).status,
    401,
  );
  const login = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      email: "test-admin@example.com",
      password: "isolated-admin-credential",
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const admin = await fetch(base + "/", { headers: { Cookie: cookie } });
  assert.equal(admin.status, 200);
  assert.equal(admin.headers.get("cache-control")?.includes("no-store"), true);
  assert((await admin.text()).includes("Dashboard"));
  assert.equal(
    (
      await fetch(base + "/api/admin/overview", {
        method: "POST",
        headers: { Cookie: cookie },
      })
    ).status,
    405,
  );
  pass(
    "Admin HTML, React server responses, and API require credentials; authenticated rendering works and mutation is unavailable",
  );
  // Node fetch ignores a custom Host header; reproduce the Nginx boundary
  // using an actual HTTP request, rather than accidentally testing localhost.
  const virtualHost = (session?: string) =>
    new Promise<{ status: number; html: string; location?: string }>(
      (resolve, reject) => {
        const request = http.get(
          base,
          {
            headers: {
              Host: "influencerock.com",
              "X-Forwarded-Proto": "https",
              ...(session ? { Cookie: session } : {}),
            },
          },
          (response) => {
            let html = "";
            response.on("data", (chunk) => {
              html += chunk;
            });
            response.on("end", () =>
              resolve({
                status: response.statusCode!,
                html,
                location: response.headers.location,
              }),
            );
          },
        );
        request.on("error", reject);
      },
    );
  for (const session of [undefined, cookie]) {
    const publicHome = await virtualHost(session);
    assert.equal(publicHome.status, 200);
    assert(publicHome.html.includes("Intelligence."));
    assert(!publicHome.html.includes("Dashboard"));
  }
  for (const [legacy, destination] of [
    ["/admin/login", "/login"],
    ["/admin?status=ready&page=2", "/?status=ready&page=2"],
  ]) {
    const redirect = await fetch(base + legacy, { redirect: "manual" });
    assert.equal(redirect.status, 308);
    assert.equal(
      new URL(redirect.headers.get("location")!, base).href,
      base + destination,
    );
  }
  assert.equal(
    (
      await fetch(base + "/api/admin/overview", {
        headers: {
          Authorization: `Basic ${Buffer.from("test-admin@example.com:isolated-admin-credential").toString("base64")}`,
        },
      })
    ).status,
    401,
  );
  const payload = {
    name: "<script>Verification</script>",
    email: "visitor@example.com",
    organization: "Example",
    jurisdictions: "India",
    timeframe: "Within 1 month",
    expertise: "",
    objective: "What is the capital of USA?",
    profileId: "test-abhinav-saxena",
    consent: true,
  };
  const key = randomUUID();
  const submit = (value = payload) =>
    fetch(base + "/api/consultations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        "Idempotency-Key": key,
      },
      body: JSON.stringify(value),
    });
  const created = await submit();
  assert.equal(created.status, 201);
  const received = await created.json();
  assert.equal(received.queued, true);
  assert.equal(received.delivered, false);
  assert.equal((await (await submit()).json()).id, received.id);
  assert.equal(
    (
      await submit({
        ...payload,
        objective: "Another request with different details",
      })
    ).status,
    409,
  );
  const store = new PipelineStore(directory);
  assert.equal(store.notification(`mail-${received.id}`)!.status, "pending");
  await prepareOne(store, async () => ({
    introduction: "Thank you.",
    insights: [],
    discussionTopics: ["Discuss your topic."],
    sources: [],
    mode: "hermes",
    researchedAt: new Date().toISOString(),
  }));
  const overview = await (
    await fetch(base + "/api/admin/overview", {
      headers: { Cookie: cookie },
    })
  ).json();
  assert.equal(overview.requests, 1);
  assert.equal(overview.rows[0].status, "ready");
  pass(
    "Real HTTP intake persists and deduplicates trivial requests; preparation becomes visible in the read-only dashboard without sending",
  );
  const meetingId = `sm_${randomUUID()}`;
  const notificationId = randomUUID();
  const event = {
    meeting: {
      id: meetingId,
      delegateId: payload.profileId,
      organizerName: "Verification",
      organizerEmail: payload.email,
      title: "Market entry discussion",
      agenda: "Discuss our market entry proposal",
      startsAt: new Date(Date.now() + 86400_000).toISOString(),
      endsAt: new Date(Date.now() + 88200_000).toISOString(),
      timezone: "Asia/Kolkata",
      bookingStatus: "confirmed",
      sessionStatus: "idle",
      revision: 1,
      meetingUrl: `https://smartmeet.org/meeting/${meetingId}#access=controlled-private-access-token`,
      resultStatus: "pending",
    },
    notifications: [
      {
        id: notificationId,
        kind: "confirmed",
        revision: 1,
        dueAt: new Date().toISOString(),
      },
    ],
  };
  const bridge = (value: object, key?: string) =>
    fetch(base + "/api/smartmeet/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-SmartMeet-Bridge-Key": key } : {}),
      },
      body: JSON.stringify(value),
    });
  assert.equal((await bridge(event)).status, 403);
  assert.equal((await bridge(event, bridgeKey)).status, 200);
  assert.equal((await bridge(event, bridgeKey)).status, 200);
  assert.equal(
    (
      await bridge(
        {
          ...event,
          meeting: { ...event.meeting, meetingUrl: "http://127.0.0.1/private" },
        },
        bridgeKey,
      )
    ).status,
    400,
  );
  assert.equal(
    store.db
      .prepare("SELECT count(*) AS n FROM notifications WHERE source_key=?")
      .get(`smartmeet:${notificationId}`)!.n,
    1,
  );
  pass(
    "Authenticated booking ingestion is replay-safe and rejects attacker-controlled private meeting URLs",
  );
  const webhook = async (
    id: string,
    type: string,
    providerId: string,
    signatureOverride?: string,
    secondsOffset = 0,
  ) => {
    const raw = JSON.stringify({ type, data: { email_id: providerId } });
    const timestamp = String(Math.floor(Date.now() / 1000) + secondsOffset);
    const signature = createHmac("sha256", webhookKey)
      .update(`${id}.${timestamp}.${raw}`)
      .digest("base64");
    return fetch(base + "/api/webhooks/resend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "svix-id": id,
        "svix-timestamp": timestamp,
        "svix-signature": signatureOverride || `v1,${signature}`,
      },
      body: raw,
    });
  };
  assert.equal(
    (await webhook("wrong", "email.delivered", "provider-api", "v1,invalid"))
      .status,
    401,
  );
  assert.equal(
    (
      await webhook(
        "expired",
        "email.delivered",
        "provider-api",
        undefined,
        -600,
      )
    ).status,
    401,
  );
  await sendOne(store, async (message, key) => {
    assert.equal(
      message.from,
      "Abhinav Saxena <abhinav.saxena@influencerock.com>",
    );
    assert(key.startsWith("ir-delegate-"));
    assert.equal(
      (await webhook("early", "email.delivered", "provider-api")).status,
      200,
    );
    return { id: "provider-api" };
  });
  assert.equal(store.notification(`mail-${received.id}`)!.status, "delivered");
  assert.equal(
    (await webhook("early", "email.delivered", "provider-api")).status,
    200,
  );
  assert.equal(
    (await webhook("late", "email.sent", "provider-api")).status,
    200,
  );
  assert.equal(store.notification(`mail-${received.id}`)!.status, "delivered");
  const detailResponse = await fetch(`${base}/?id=${received.id}`, {
    headers: { Cookie: cookie },
  });
  const html = await detailResponse.text();
  assert(html.includes("Exact outbound email"));
  assert(html.includes("&lt;script&gt;Verification&lt;/script&gt;"));
  assert(!html.includes("<script>Verification</script>"));
  store.close();
  pass(
    "Actual webhook HTTP route rejects forged/expired signatures, reconciles early delivery, and safely renders the exact outbound email",
  );
  console.log(
    `Verified ${evidence.length} HTTP boundary scenarios; no real email or paid meeting created.`,
  );
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null)
    await new Promise((resolve) => server.once("exit", resolve));
  await rm(directory, { recursive: true, force: true });
}
