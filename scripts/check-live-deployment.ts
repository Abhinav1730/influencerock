import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { PipelineStore } from "../lib/server/pipeline-store";

// Explicit, deliberate operational verification: real services and real Resend
// test addresses. Never send to customer mailboxes or start paid avatar calls.
if (process.env.IR_LIVE_VERIFICATION !== "yes")
  throw new Error("Set IR_LIVE_VERIFICATION=yes explicitly");
process.loadEnvFile("/etc/influencerock-1.env");
assert.equal(process.env.IR_DATA_DIR, "/srv/influencerock-1/data");
const credentials = Object.fromEntries(
  (await readFile("/root/influencerock-admin-credentials.txt", "utf8"))
    .trim()
    .split("\n")
    .map((line) => {
      const at = line.indexOf(":");
      return [line.slice(0, at), line.slice(at + 1).trim()];
    }),
);
const store = new PipelineStore();
const run = randomUUID().slice(0, 8);
const base = "https://influencerock.com";
const smartmeet = "https://api.smartmeet.org/api/smartmeet";
const evidence: Record<string, unknown> = {
  run,
  startedAt: new Date().toISOString(),
  syntheticRecipientsOnly: true,
  avatarJoinCalls: 0,
};
const ids: string[] = [];
async function until(
  test: () => boolean | Promise<boolean>,
  milliseconds = 300_000,
) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (await test()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Live verification condition timed out");
}
function startSenderForTestOnly() {
  const due = store.db
    .prepare(
      "SELECT request_id FROM notifications WHERE status IN ('ready','sending') AND next_at<=? AND due_at<=?",
    )
    .all(Date.now(), Date.now());
  assert(
    due.every((row) => ids.includes(String(row.request_id))),
    "Refuse a manual verification run when customer mail is due; leave it to the hourly timer",
  );
  execFileSync("systemctl", ["start", "influencerock-1-email.service"], {
    timeout: 90_000,
    stdio: "pipe",
  });
}
try {
  const adminBase = "https://admin.influencerock.com";
  assert.equal((await fetch(adminBase, { redirect: "manual" })).status, 307);
  assert.equal((await fetch(adminBase + "/api/admin/overview")).status, 401);
  const login = await fetch(adminBase + "/api/admin/login", {
    method: "POST",
    headers: { Origin: adminBase, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credentials.Email,
      password: credentials.Password,
    }),
  });
  assert.equal(login.status, 200);
  const session = login.headers.get("set-cookie")!.split(";")[0];
  const dashboard = await fetch(adminBase + "/", {
    headers: { Cookie: session },
  });
  assert.equal(dashboard.status, 200);
  assert((await dashboard.text()).includes("Dashboard"));
  assert(dashboard.headers.get("cache-control")?.includes("no-store"));
  evidence.admin = {
    unauthenticated: 307,
    unauthenticatedApi: 401,
    authenticated: 200,
    https: true,
  };
  assert.equal(
    (
      await fetch(adminBase + "/api/admin/logout", {
        method: "POST",
        headers: { Origin: adminBase, Cookie: session },
      })
    ).status,
    200,
  );
  for (const [profileId, email, objective] of [
    [
      "test-abhinav-saxena",
      `delivered+ir-abhinav-${run}@resend.dev`,
      "What is the capital of USA?",
    ],
    [
      "IN-4",
      `bounced+ir-priya-${run}@resend.dev`,
      "Discuss India UPI architecture and interoperability, using relevant official NPCI public background.",
    ],
  ]) {
    const response = await fetch(`${base}/api/consultations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        name: `Synthetic deployment verification ${run}`,
        email,
        organization: "Platform verification",
        jurisdictions: "India",
        timeframe: "Within 1 month",
        expertise: "",
        objective,
        profileId,
        consent: true,
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert(body.queued && !body.delivered);
    ids.push(body.id);
  }
  const availability = await (
    await fetch(
      `${smartmeet}/delegates/test-abhinav-saxena/availability?duration=30`,
    )
  ).json();
  assert(availability.ok && availability.data.slots.length);
  const bookingResponse = await fetch(`${smartmeet}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      mode: "scheduled",
      delegateId: "test-abhinav-saxena",
      organizerName: `Synthetic booking verification ${run}`,
      organizerEmail: `delivered+ir-booking-${run}@resend.dev`,
      title: `Synthetic verification meeting ${run}`,
      agenda:
        "Discuss general India digital payments architecture and useful planning questions.",
      startsAt: availability.data.slots[0],
      timezone: "Asia/Kolkata",
      durationMinutes: 30,
      consent: true,
    }),
  });
  assert.equal(bookingResponse.status, 201);
  const booking = (await bookingResponse.json()).data;
  assert.equal(booking.bookingStatus, "confirmed");
  assert.equal(booking.sessionStatus, "idle");
  const meetingRequestId = `meeting-${booking.roomId}`;
  ids.push(meetingRequestId);
  await until(() => !!store.request(meetingRequestId), 30_000);
  assert.equal(store.meeting(booking.roomId)!.bookingStatus, "confirmed");
  const confirmation = store.db
    .prepare(
      "SELECT id FROM notifications WHERE request_id=? AND kind='confirmed'",
    )
    .get(meetingRequestId)!;
  const jobIds = [`mail-${ids[0]}`, `mail-${ids[1]}`, String(confirmation.id)];
  assert(jobIds.every((id) => store.notification(id)!.first_send_at === null));
  evidence.booking = {
    roomId: booking.roomId,
    confirmedImmediately: true,
    synchronized: true,
    paidConversationCreated: false,
  };
  console.log(
    "PASS Public HTTPS admin authentication, real intake, immediate booking confirmation, queue publishing, and zero immediate sends",
  );
  await until(() =>
    jobIds.every((id) => store.notification(id)!.status === "ready"),
  );
  const drafts = jobIds.map((id) =>
    JSON.parse(store.notification(id)!.content!),
  );
  assert(drafts.every((draft) => draft.mode === "hermes"));
  assert(drafts.some((draft) => draft.sources.length > 0));
  evidence.preparation = drafts.map((draft, index) => ({
    jobId: jobIds[index],
    mode: draft.mode,
    sourceCount: draft.sources.length,
    evidence: draft.evidence,
  }));
  console.log(
    "PASS Actual sandboxed preparation workers use Hermes/Codex and public research without sending mail",
  );
  startSenderForTestOnly();
  await until(
    () =>
      store.notification(jobIds[0])!.status === "delivered" &&
      store.notification(jobIds[1])!.status === "bounced" &&
      store.notification(jobIds[2])!.status === "delivered",
    90_000,
  );
  const deliveries = [];
  for (const [index, id] of jobIds.entries()) {
    const job = store.notification(id)!;
    const message = JSON.parse(job.message!);
    assert.equal(
      message.from,
      index === 1
        ? "Priya Iyer <priya.iyer@influencerock.com>"
        : "Abhinav Saxena <abhinav.saxena@influencerock.com>",
    );
    assert(message.to[0].endsWith("@resend.dev"));
    assert(message.text.includes("Please do not reply"));
    assert.equal(job.send_attempts, 1);
    const result = await fetch(
      `https://api.resend.com/emails/${job.provider_id}`,
      { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } },
    );
    assert(result.ok);
    const provider = await result.json();
    assert.equal(provider.from, message.from);
    assert.deepEqual(provider.to, message.to);
    deliveries.push({
      jobId: id,
      providerId: job.provider_id,
      from: message.from,
      to: message.to,
      state: job.status,
      providerLastEvent: provider.last_event,
      sendAttempts: job.send_attempts,
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  evidence.deliveries = deliveries;
  evidence.deliveryTestMethod =
    "One controlled invocation of the installed hourly sender service; only these synthetic test jobs were due. Normal dispatch remains hourly.";
  console.log(
    "PASS Installed sender service sends from selected delegate identities; real signed Resend webhooks produce delivered and bounced states",
  );
  const cancelled = await fetch(
    `${smartmeet}/rooms/${booking.roomId}/respond`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SmartMeet-Access": booking.accessToken,
      },
      body: JSON.stringify({ action: "cancel", revision: booking.revision }),
    },
  );
  assert.equal(cancelled.status, 200);
  await until(
    () => store.meeting(booking.roomId)?.bookingStatus === "cancelled",
    30_000,
  );
  evidence.bookingCleanup =
    "Synthetic booking cancelled through the real authenticated API; no meeting join was attempted.";
  evidence.requestIds = ids;
  evidence.completedAt = new Date().toISOString();
  evidence.timer = execFileSync(
    "systemctl",
    [
      "show",
      "influencerock-1-email.timer",
      "--property=NextElapseUSecRealtime",
      "--property=ActiveState",
    ],
    { encoding: "utf8" },
  ).trim();
  await writeFile(
    "review/backend-verification/live-deployment.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    "PASS Synthetic booking cancelled and authoritative admin state updated. Evidence saved.",
  );
} finally {
  store.close();
}
