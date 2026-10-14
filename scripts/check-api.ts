import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ir-api-check-"));
const bridgeKey = "smartmeet-isolated-api-check-key-4399";
const smartMeetUrl = "https://smartmeet-verification.example";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "4399",
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      PORT: "4399",
      IR_DATA_DIR: temporary,
      RESEND_API_KEY: "",
      SMARTMEET_URL: smartMeetUrl,
      SMARTMEET_BRIDGE_KEY: bridgeKey,
      SMARTMEET_DELEGATE_EMAILS: JSON.stringify({
        "LK-4": "configured@example.com",
        "IN-4": "india@example.com",
      }),
      SMARTMEET_TEST_DELEGATE_EMAIL: "test-delegate@example.com",
      SMARTMEET_DELEGATE_TIMEZONE: "Asia/Kolkata",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
for (let i = 0; i < 100; i++) {
  if (child.exitCode !== null)
    throw new Error("Server exited " + child.exitCode);
  try {
    if ((await fetch("http://127.0.0.1:4399")).ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (i === 99) throw new Error("Server did not become ready");
}
const base = "http://127.0.0.1:4399";
try {
  const input = {
    name: "Website Verification",
    email: "verification@example.com",
    organization: "Website test",
    jurisdictions: "India",
    timeframe: "Within 1 month",
    objective: "Verification of the country profile enquiry flow.",
    profileId: "IN-4",
    consent: true,
  };
  const post = async (data: object) =>
    fetch(base + "/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify(data),
    });
  let res = await post(input);
  assert.equal(res.status, 201);
  const saved = (await res.json()) as { saved: boolean; delivered: boolean };
  assert(saved.saved);
  assert.equal(saved.delivered, false);
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.join(temporary, "pipeline.sqlite"));
  const record = JSON.parse(db.prepare("SELECT payload FROM requests LIMIT 1").get()!.payload as string);
  assert.equal(record.profileId, "IN-4");
  assert.equal(db.prepare("SELECT status FROM notifications LIMIT 1").get()!.status, "pending");
  db.close();
  res = await post({ ...input, profileId: "NOT-A-PROFILE" });
  assert.equal(res.status, 400);
  res = await post({ ...input, consent: false });
  assert.equal(res.status, 400);
  res = await post({ ...input, profileId: "01" });
  assert.equal(res.status, 201);
  res = await post({ ...input, profileId: "test-abhinav-saxena" });
  assert.equal(
    res.status,
    201,
    "Test delegate IDs remain valid for enquiries",
  );
  res = await fetch(base + "/api/consultations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://other.example",
    },
    body: JSON.stringify(input),
  });
  assert.equal(res.status, 403);
  res = await fetch(base + "/api/consultations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ ...input, objective: "x".repeat(15000) }),
  });
  assert.equal(res.status, 413);
  res = await fetch(base + "/api/consultations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: "null",
  });
  assert.equal(res.status, 400);
  res = await fetch(base + "/data/consultations.jsonl");
  assert.equal(res.status, 404);
  for (const route of [
    "/",
    "/network",
    "/contact?profile=IN-4",
    "/expertise",
    "/approach",
    "/schedule?delegate=LK-1",
    "/schedule?delegate=test-abhinav-saxena",
    "/schedule?delegate=IN-4",
  ])
    assert.equal((await fetch(base + route)).status, 200);

  const schedule = await (await fetch(base + "/schedule?delegate=LK-1")).text();
  assert(schedule.includes("Choose a meeting time"));
  assert(
    schedule.includes(
      `${smartMeetUrl}/book?delegate=LK-1&amp;source=influence-rock`,
    ),
  );
  assert(schedule.includes("booking is confirmed immediately"));
  assert(schedule.includes("SmartMeet AI representative"));
  assert(!schedule.includes("pending until the delegate accepts"));
  const testSchedule = await (
    await fetch(base + "/schedule?delegate=test-abhinav-saxena")
  ).text();
  assert(testSchedule.includes("Abhinav Saxena"));
  assert(
    testSchedule.includes(`${smartMeetUrl}/book?delegate=test-abhinav-saxena`),
  );
  assert.equal(
    (await fetch(base + "/schedule?delegate=NOT-A-PROFILE")).status,
    404,
  );

  const meetingId = "sm_60634e8c-75ae-4894-bb80-572e50d638de";
  const receipt = await (
    await fetch(base + `/network?delegate=LK-1&smartmeetProposal=${meetingId}`)
  ).text();
  assert(receipt.includes("Booking details received"));
  assert(receipt.includes("AI representative"));
  assert(receipt.includes("Human delegate attendance is not required"));
  assert(receipt.includes(`${smartMeetUrl}/meeting/${meetingId}`));
  assert(!receipt.includes("pending until the delegate confirms"));
  const testReceipt = await (
    await fetch(
      base +
        `/network?delegate=test-abhinav-saxena&smartmeetProposal=${meetingId}`,
    )
  ).text();
  assert(
    testReceipt
      .replace(/<[^>]*>/g, "")
      .includes("Booking details received with Abhinav Saxena’s AI representative."),
  );
  const invalidReceipt = await (
    await fetch(base + "/network?smartmeetProposal=invalid")
  ).text();
  assert(!invalidReceipt.includes("Booking details received"));

  const delegateRequest = (id: string, key = bridgeKey) =>
    fetch(base + `/api/smartmeet/delegates/${encodeURIComponent(id)}`, {
      headers: { "X-SmartMeet-Bridge-Key": key },
    });
  res = await delegateRequest("LK-1", "");
  assert.equal(res.status, 403);
  res = await delegateRequest("LK-1", "wrong-bridge-key");
  assert.equal(res.status, 403);
  res = await delegateRequest("NOT-A-PROFILE");
  assert.equal(res.status, 404);
  res = await delegateRequest("LK-1");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const delegate = await res.json();
  assert.equal(delegate.id, "LK-1");
  assert(delegate.name && delegate.bio && delegate.expertise);
  assert(
    !("email" in delegate),
    "Generated delegates must not have invented mailboxes",
  );
  assert.deepEqual(delegate.workingHours, {
    start: 9,
    end: 17,
    weekdays: [1, 2, 3, 4, 5],
  });
  res = await delegateRequest("US-1");
  assert.equal(res.status, 200);
  assert(
    !("email" in (await res.json())),
    "Unconfigured mailboxes are not invented",
  );
  res = await delegateRequest("LK-4");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, "configured@example.com");
  res = await delegateRequest("IN-4");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, "india@example.com");
  res = await delegateRequest("test-abhinav-saxena");
  assert.equal(res.status, 200);
  const human = await res.json();
  assert.equal(human.name, "Abhinav Saxena");
  assert.equal(human.email, "test-delegate@example.com");
  assert.equal(human.timezone, "Asia/Kolkata");
  console.log(
    "Verified enquiry storage, validation, origin protection, private records, schedule CTA, immediate-confirmation receipt, and authenticated SmartMeet delegate lookup with optional mailboxes. No production enquiries written or emails sent.",
  );
} finally {
  child.kill();
  if (child.exitCode === null)
    await new Promise((resolve) => child.once("exit", resolve));
  await fs.rm(temporary, { recursive: true, force: true });
}
