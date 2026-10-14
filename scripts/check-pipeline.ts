import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  PipelineStore,
  type Meeting,
  type Draft,
} from "../lib/server/pipeline-store";
import { prepareOne, sendOne, composeMessage } from "../lib/server/pipeline";

const directory = await mkdtemp(path.join(os.tmpdir(), "ir-pipeline-check-"));
let store = new PipelineStore(directory);
const start = Date.now();
const input = {
  name: "Verification",
  email: "visitor@example.com",
  organization: "Example",
  jurisdictions: "India",
  timeframe: "Within 1 month",
  expertise: "",
  objective: "What is the capital of USA?",
  profileId: "test-abhinav-saxena",
  consent: true,
};
const draft: Draft = {
  introduction: "Thank you for your request.",
  insights: ["A sourced observation."],
  discussionTopics: ["Discuss the requested topic."],
  sources: [{ title: "Primary source", url: "https://example.com/research" }],
  mode: "hermes",
  researchedAt: new Date(start).toISOString(),
};
const passed: string[] = [];
function pass(text: string) {
  passed.push(text);
  console.log(`PASS ${text}`);
}
try {
  const id = store.enqueueConsultation(
    input,
    "a-valid-repeated-request",
    start,
  );
  assert.equal(
    store.enqueueConsultation(input, "a-valid-repeated-request", start),
    id,
  );
  assert.throws(() =>
    store.enqueueConsultation(
      { ...input, objective: "Different objective" },
      "a-valid-repeated-request",
      start,
    ),
  );
  assert.equal(
    store.db.prepare("SELECT count(*) AS n FROM notifications").get()!.n,
    1,
  );
  pass(
    "Repeated submissions reuse one request; conflicting reuse is rejected transactionally",
  );
  store.close();
  store = new PipelineStore(directory);
  assert(store.request(id));
  const researchCalls: string[] = [];
  await prepareOne(
    store,
    async (value) => {
      researchCalls.push(value.objective);
      return draft;
    },
    start,
  );
  assert.equal(researchCalls[0], input.objective);
  const job = store.notification(`mail-${id}`)!;
  assert.equal(job.status, "ready");
  assert.equal(job.send_attempts, 0);
  pass(
    "Saved work survives restart; trivial requests are prepared, with no suitability filtering or immediate email",
  );
  const msg = composeMessage(store, job);
  assert.equal(msg.from, "Abhinav Saxena <abhinav.saxena@influencerock.com>");
  assert.deepEqual(msg.to, [input.email]);
  assert(msg.text.includes("Please do not reply"));
  assert(msg.text.includes("A meeting has not been scheduled"));
  assert.equal((msg as { reply_to?: string }).reply_to, undefined);
  pass(
    "Delegate sender and requester recipient are correct; no-reply notice and honest proposal acknowledgement are included",
  );
  let attempts = 0;
  const keys: string[] = [];
  const sentMessages: string[] = [];
  const provider = async (_msg: unknown, key: string) => {
    keys.push(key);
    sentMessages.push(JSON.stringify(_msg));
    attempts++;
    if (attempts === 1)
      throw new Error("provider accepted but response was lost");
    return { id: "provider-1" };
  };
  await sendOne(store, provider, undefined, start);
  assert.equal(store.notification(job.id)!.status, "ready");
  assert.equal(await sendOne(store, provider, undefined, start + 100), false);
  store.db.prepare("UPDATE notifications SET content=? WHERE id=?").run(
    JSON.stringify({
      ...draft,
      discussionTopics: [
        "A later draft must not replace the first send payload.",
      ],
    }),
    job.id,
  );
  await sendOne(store, provider, undefined, start + 3600_000);
  assert.equal(store.notification(job.id)!.status, "accepted");
  assert.equal(keys[0], keys[1]);
  assert.equal(sentMessages[0], sentMessages[1]);
  assert.equal(
    await sendOne(store, provider, undefined, start + 7200_000),
    false,
  );
  pass(
    "Lost provider response retries with the identical idempotency key; accepted emails are not resent",
  );
  store.recordWebhook(
    "event-delivered",
    "provider-1",
    "email.delivered",
    start,
  );
  store.recordWebhook(
    "event-delivered",
    "provider-1",
    "email.delivered",
    start,
  );
  store.recordWebhook("event-sent-late", "provider-1", "email.sent", start);
  assert.equal(store.notification(job.id)!.status, "delivered");
  assert.equal(
    store.db
      .prepare(
        "SELECT count(*) AS n FROM webhook_events WHERE id='event-delivered'",
      )
      .get()!.n,
    1,
  );
  pass(
    "Provider acceptance and delivery are distinct; duplicate and out-of-order webhooks do not regress delivery",
  );
  const fallbackId = store.enqueueConsultation(
    { ...input, profileId: "IN-4" },
    "fallback-request",
    start,
  );
  const unavailable = async () => {
    throw new Error("Hermes unavailable");
  };
  await prepareOne(store, unavailable, start);
  await prepareOne(store, unavailable, start + 60_000);
  await prepareOne(store, unavailable, start + 180_000);
  assert.equal(store.notification(`mail-${fallbackId}`)!.status, "ready");
  assert.equal(
    JSON.parse(store.notification(`mail-${fallbackId}`)!.content!).mode,
    "fallback",
  );
  pass(
    "Repeated Hermes failures produce a factual acknowledgement instead of silently dropping a request",
  );
  // Drain the acknowledgement to keep the following cases independent.
  await sendOne(
    store,
    async () => ({ id: "provider-fallback" }),
    undefined,
    start + 180_000,
  );
  const meeting: Meeting = {
    id: "sm_60634e8c-75ae-4894-bb80-572e50d638de",
    delegateId: "test-abhinav-saxena",
    organizerName: input.name,
    organizerEmail: input.email,
    title: "Market entry",
    agenda: "Discuss our market entry proposal.",
    startsAt: new Date(start + 86400_000).toISOString(),
    endsAt: new Date(start + 88200_000).toISOString(),
    timezone: "Asia/Kolkata",
    bookingStatus: "confirmed",
    sessionStatus: "idle",
    revision: 1,
    meetingUrl:
      "https://smartmeet.org/meeting/sm_60634e8c-75ae-4894-bb80-572e50d638de#access=controlled",
    resultStatus: "pending",
    platformConfirmation: true,
  };
  // Exercise old verbose drafts as well as new research, across every booking state.
  const verbose: Draft = {
    ...draft,
    introduction: "A long formal preamble. ".repeat(60),
    insights: [
      "This claim should be omitted rather than cut before a qualification. ".repeat(
        20,
      ),
    ],
    discussionTopics: [
      "We can work through a weekly budget and savings plan together. ".repeat(
        30,
      ),
      "Second topic must stay out of the email.",
    ],
    sources: [
      ...draft.sources,
      { title: "Additional reading", url: "https://example.com/second" },
    ],
  };
  for (const kind of [
    "confirmed",
    "reminder",
    "proposal",
    "cancelled",
    "declined",
    "expired",
  ]) {
    const message = composeMessage(
      store,
      { ...job, kind, content: JSON.stringify(verbose) },
      meeting,
    );
    assert(message.text.split(/\s+/).length <= 125);
    assert(message.text.includes("Please do not reply to this email."));
    assert(message.text.includes("AI representative"));
    assert(!message.text.includes("formal preamble"));
    assert(!message.text.includes("This claim should be omitted"));
    assert(!message.text.includes("Second topic"));
    assert(!message.text.includes("https://example.com/second"));
    assert(!message.text.includes("Research checked:"));
    if (kind === "confirmed") {
      assert(!message.text.includes(meeting.meetingUrl));
      assert(!message.text.includes("Your meeting is confirmed"));
      assert(!message.subject.includes("Meeting confirmed"));
      assert(message.text.includes("weekly budget"));
    } else if (["reminder", "proposal"].includes(kind)) {
      assert(message.text.includes(meeting.meetingUrl));
      assert(message.text.includes("30 minutes"));
      assert(message.text.includes("IST"));
    } else {
      assert(!message.text.includes(meeting.meetingUrl));
      assert(!message.text.includes("Join:"));
      assert(!message.subject.includes("Meeting confirmed"));
      assert(message.subject.toLowerCase().includes(kind));
      assert(!message.text.includes("Reading:"));
      assert(
        message.text.includes(
          kind === "cancelled" ? "is cancelled" : `was ${kind}`,
        ) || message.text.includes("has expired"),
      );
    }
  }
  const concise = composeMessage(
    store,
    { ...job, kind: "confirmed", content: JSON.stringify(draft) },
    meeting,
  );
  assert(concise.text.includes(draft.insights[0]));
  assert(concise.text.includes(draft.sources[0].url));
  const legacyConfirmation = composeMessage(
    store,
    { ...job, kind: "confirmed", content: JSON.stringify(draft) },
    { ...meeting, platformConfirmation: undefined },
  );
  assert(legacyConfirmation.text.includes(meeting.meetingUrl));
  assert(legacyConfirmation.text.includes("Your meeting is confirmed"));
  assert(legacyConfirmation.subject.includes("Meeting confirmed"));
  assert(legacyConfirmation.text.includes("30 minutes"));
  assert(legacyConfirmation.text.includes("IST"));
  const unsourced = composeMessage(store, {
    ...job,
    content: JSON.stringify({ ...draft, sources: [] }),
  });
  assert(!unsourced.text.includes(draft.insights[0]));
  assert(unsourced.text.includes("A meeting has not been scheduled"));
  pass(
    "Short emails handle legacy drafts and every booking state, preserve authoritative details and one citation, and omit long or unsourced claims without clipping facts",
  );
  const notification = {
    id: "notification-1",
    kind: "confirmed",
    revision: 1,
    dueAt: new Date(start).toISOString(),
  };
  store.ingestMeeting(meeting, [notification], start);
  store.ingestMeeting(meeting, [notification], start);
  assert.equal(
    store.db
      .prepare(
        "SELECT count(*) AS n FROM notifications WHERE source_key='smartmeet:notification-1'",
      )
      .get()!.n,
    1,
  );
  assert.throws(() =>
    store.ingestMeeting(
      meeting,
      [{ ...notification, kind: "cancelled" }],
      start,
    ),
  );
  await prepareOne(store, async () => draft, start);
  let sends = 0;
  await sendOne(
    store,
    async () => {
      sends++;
      return { id: "must-not-send" };
    },
    async (m) => ({ ...m, bookingStatus: "cancelled" }),
    start,
  );
  assert.equal(sends, 0);
  assert.equal(store.notification("sm-notification-1")!.status, "superseded");
  pass(
    "SmartMeet event replay is idempotent; a cancellation discovered just before sending suppresses stale confirmation",
  );
  store.ingestMeeting(
    { ...meeting, revision: 2 },
    [
      {
        ...notification,
        id: "notification-2",
        revision: 2,
        dueAt: new Date(start + 3600_000).toISOString(),
      },
    ],
    start,
  );
  await prepareOne(store, async () => draft, start);
  assert.equal(store.notification("sm-notification-2")!.status, "ready");
  assert.equal(
    await sendOne(
      store,
      async () => ({ id: "future" }),
      async (m) => m,
      start,
    ),
    false,
  );
  await sendOne(
    store,
    async () => ({ id: "future" }),
    async () => {
      throw new Error("bridge offline");
    },
    start + 3600_000,
  );
  assert.equal(store.notification("sm-notification-2")!.status, "ready");
  assert.equal(store.notification("sm-notification-2")!.first_send_at, null);
  pass(
    "Future reminders are prepared early but respect due time; bridge failure defers sending without assuming a valid booking",
  );
  const leaseId = store.enqueueConsultation(input, "lease-request", start);
  const claimed = store.claim("prepare", start)!;
  assert.equal(claimed.request_id, leaseId);
  const secondStore = new PipelineStore(directory);
  assert.equal(secondStore.claim("prepare", start), undefined);
  const recovered = secondStore.claim("prepare", start + 360_001)!;
  assert(recovered);
  assert.equal(
    store.finish(claimed, "ready", { content: draft }, start),
    false,
  );
  assert.equal(
    secondStore.finish(recovered, "ready", { content: draft }, start),
    true,
  );
  secondStore.close();
  pass(
    "Independent workers cannot claim live leases; expired leases recover and stale workers cannot overwrite newer results",
  );
  await sendOne(
    store,
    async () => {
      throw new Error("response lost");
    },
    async (m) => m,
    start,
  );
  let lateSends = 0;
  // Force just this lease case eligible: unknown acceptance must not duplicate after provider key expiry.
  store.db
    .prepare(
      "UPDATE notifications SET status='uncertain' WHERE id<>? AND status='ready'",
    )
    .run(`mail-${leaseId}`);
  await sendOne(
    store,
    async () => {
      lateSends++;
      return { id: "late" };
    },
    async (m) => m,
    start + 24 * 3600_000,
  );
  assert.equal(lateSends, 0);
  assert.equal(store.notification(`mail-${leaseId}`)!.status, "uncertain");
  pass(
    "Ambiguous sends stop beyond the safe provider idempotency window rather than risking duplicate email",
  );
  const earlyId = store.enqueueConsultation(input, "early-webhook", start);
  await prepareOne(store, async () => draft, start);
  store.recordWebhook(
    "early-event",
    "early-provider",
    "email.delivered",
    start,
  );
  await sendOne(
    store,
    async () => ({ id: "early-provider" }),
    undefined,
    start,
  );
  assert.equal(store.notification(`mail-${earlyId}`)!.status, "delivered");
  pass(
    "A delivery webhook arriving before the send response is retained and reconciled",
  );
  const senders = store.db
    .prepare(
      "SELECT count(*) AS n, count(DISTINCT email) AS unique_n FROM senders",
    )
    .get()!;
  assert.equal(senders.n, 515);
  assert.equal(senders.n, senders.unique_n);
  pass(
    "All 515 visible delegate identities have distinct persisted sender addresses",
  );
  console.log(
    `Verified ${passed.length} pipeline scenarios. Providers were controlled; no real emails sent.`,
  );
} finally {
  store.close();
  await rm(directory, { recursive: true, force: true });
}
