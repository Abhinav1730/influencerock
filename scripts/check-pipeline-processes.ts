import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PipelineStore, type Draft } from "../lib/server/pipeline-store";
import { prepareOne, sendOne } from "../lib/server/pipeline";

const mode = process.argv[2];
const draft: Draft = {
  introduction: "Thank you for your proposal.",
  insights: [],
  discussionTopics: ["Discuss your objective."],
  sources: [],
  mode: "hermes",
  researchedAt: new Date().toISOString(),
};
const input = {
  name: "Process verification",
  email: "verification@example.com",
  organization: "",
  jurisdictions: "India",
  timeframe: "Within 1 month",
  expertise: "",
  objective: "Discuss market entry",
  profileId: "test-abhinav-saxena",
  consent: true,
};
if (mode) {
  const store = new PipelineStore(process.argv[3]);
  const send = async (_message: unknown, key: string) => {
    store.db
      .prepare(
        "INSERT INTO verification_deliveries VALUES(?,1) ON CONFLICT(id) DO UPDATE SET calls=calls+1",
      )
      .run(key);
    if (mode === "crash") process.exit(17);
    return { id: key };
  };
  while (
    mode === "prepare"
      ? await prepareOne(store, async () => draft)
      : await sendOne(store, send)
  ) {}
  store.close();
} else {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ir-process-check-"));
  const store = new PipelineStore(directory);
  const child = (stage: string) =>
    new Promise<number>((resolve, reject) => {
      const processChild = spawn(
        process.execPath,
        [
          "--conditions=react-server",
          "--import",
          "tsx",
          import.meta.filename,
          stage,
          directory,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      let error = "";
      processChild.stderr.on("data", (value) => {
        error += value.toString();
      });
      processChild.on("error", reject);
      processChild.on("close", (code) =>
        code === 0 || (stage === "crash" && code === 17)
          ? resolve(code!)
          : reject(new Error(error)),
      );
    });
  try {
    store.db.exec(
      "CREATE TABLE verification_deliveries(id TEXT PRIMARY KEY,calls INTEGER NOT NULL)",
    );
    for (let i = 0; i < 60; i++)
      store.enqueueConsultation(input, `parallel-request-${i}`);
    await Promise.all(Array.from({ length: 6 }, () => child("prepare")));
    assert.equal(
      store.db
        .prepare("SELECT count(*) AS n FROM notifications WHERE status='ready'")
        .get()!.n,
      60,
    );
    await Promise.all(Array.from({ length: 6 }, () => child("send")));
    assert.equal(
      store.db
        .prepare(
          "SELECT count(*) AS n FROM notifications WHERE status='accepted'",
        )
        .get()!.n,
      60,
    );
    assert.equal(
      store.db
        .prepare(
          "SELECT count(*) AS n FROM verification_deliveries WHERE calls=1",
        )
        .get()!.n,
      60,
    );
    console.log(
      "PASS Six competing preparation processes and six sender processes process all 60 jobs exactly once",
    );

    const crashTime = Date.now();
    const id = store.enqueueConsultation(
      input,
      "crash-after-provider-acceptance",
      crashTime,
    );
    await prepareOne(store, async () => draft, crashTime);
    assert.equal(await child("crash"), 17);
    const job = store.notification(`mail-${id}`)!;
    assert.equal(job.status, "sending");
    assert(job.message && job.first_send_at);
    assert.equal(store.claim("send", crashTime + 100), undefined);
    const send = async (_message: unknown, key: string) => {
      store.db
        .prepare(
          "INSERT INTO verification_deliveries VALUES(?,1) ON CONFLICT(id) DO UPDATE SET calls=calls+1",
        )
        .run(key);
      return { id: key };
    };
    await sendOne(store, send, undefined, crashTime + 61_000);
    assert.equal(store.notification(job.id)!.status, "accepted");
    assert.equal(
      store.db
        .prepare("SELECT calls FROM verification_deliveries WHERE id=?")
        .get(`ir-delegate-${job.id}`)!.calls,
      2,
    );
    assert.equal(
      store.db
        .prepare("SELECT count(*) AS n FROM verification_deliveries")
        .get()!.n,
      61,
    );
    console.log(
      "PASS Process death after provider acceptance recovers the same stored payload and provider idempotency key",
    );

    const historical = "IR-historical-verification";
    store.importHistorical(input, historical, crashTime - 100 * 86400_000);
    store.importHistorical(input, historical, crashTime - 100 * 86400_000);
    assert.equal(
      store.db
        .prepare("SELECT count(*) AS n FROM notifications WHERE request_id=?")
        .get(historical)!.n,
      0,
    );
    assert.equal(store.prune(crashTime - 90 * 86400_000), 1);
    assert.equal(store.request(historical), undefined);
    assert(store.request(id));
    assert.deepEqual(store.db.prepare("PRAGMA foreign_key_check").all(), []);
    console.log(
      "PASS Historical import is repeatable without sending; retention removes old records and preserves current work",
    );
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}
