import { readFile } from "node:fs/promises";
import { PipelineStore } from "../lib/server/pipeline-store";
import { validateMeetingEvent } from "../lib/server/meeting-events";

// Input is a private snapshot exported from the existing SmartMeet database.
// Historical mail is audit metadata only; this never creates outgoing jobs.
if (!process.argv[2])
  throw new Error("Provide a private SmartMeet history JSON file");
const records = JSON.parse(await readFile(process.argv[2], "utf8"));
if (!Array.isArray(records) || records.length > 10_000)
  throw new Error("Invalid history export");
const store = new PipelineStore();
let meetings = 0,
  deliveries = 0;
try {
  for (const record of records) {
    const createdAt = Date.parse(record.createdAt);
    if (!Number.isFinite(createdAt) || createdAt < Date.now() - 90 * 86400_000)
      continue;
    const { meeting } = validateMeetingEvent({
      meeting: record.meeting,
      notifications: [],
    });
    const requestId = store.ingestMeeting(meeting, []);
    store.transaction(() => {
      store.db
        .prepare("UPDATE requests SET created_at=MIN(created_at,?) WHERE id=?")
        .run(createdAt, requestId);
      for (const delivery of record.deliveries || []) {
        if (
          !delivery ||
          typeof delivery.id !== "string" ||
          !["sent", "failed"].includes(delivery.status)
        )
          throw new Error("Invalid delivery history");
        if (
          store.db
            .prepare(
              "SELECT id FROM events WHERE request_id=? AND kind='historical.email.imported' AND json_extract(details,'$.notificationId')=?",
            )
            .get(requestId, delivery.id)
        )
          continue;
        store.event(requestId, null, "historical.email.imported", {
          notificationId: delivery.id,
          kind: delivery.kind,
          status: delivery.status === "sent" ? "accepted" : "failed",
          providerId: delivery.providerId || null,
          originalBodyAvailable: false,
        });
        deliveries++;
      }
    });
    meetings++;
  }
  console.log(
    `Imported ${meetings} historical meeting snapshots and ${deliveries} delivery audit records. No outgoing notifications created.`,
  );
} finally {
  store.close();
}
