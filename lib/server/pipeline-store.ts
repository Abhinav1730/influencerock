import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { profiles } from "../profiles";
import type { ConsultationInput } from "../types";

export interface Meeting {
  id: string;
  delegateId: string;
  organizerName: string;
  organizerEmail: string;
  title: string;
  agenda: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  bookingStatus: string;
  sessionStatus: string;
  revision: number;
  meetingUrl: string;
  resultStatus: string;
  platformConfirmation?: boolean;
}
export interface MeetingNotification {
  id: string;
  kind: string;
  revision: number;
  dueAt: string;
}
export interface RequestRecord {
  id: string;
  source_key: string;
  payload: string;
  created_at: number;
  meeting_id: string | null;
}
export interface QueueRecord {
  id: string;
  request_id: string;
  source_key: string;
  kind: string;
  revision: number;
  status: string;
  due_at: number;
  next_at: number;
  prep_attempts: number;
  send_attempts: number;
  lease_until: number;
  lease_token: string | null;
  first_send_at: number | null;
  provider_id: string | null;
  message: string | null;
  content: string | null;
  last_error: string | null;
}
export interface Draft {
  introduction: string;
  insights: string[];
  discussionTopics: string[];
  sources: { title: string; url: string }[];
  mode: "hermes" | "fallback";
  researchedAt: string;
  evidence?: {
    availableTools: string[];
    usedTools: string[];
    toolMessages: number;
    claimedSourceCount: number;
  };
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export class PipelineStore {
  db: DatabaseSync;
  constructor(
    directory = process.env.IR_DATA_DIR || path.join(process.cwd(), "data"),
  ) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, "pipeline.sqlite");
    this.db = new DatabaseSync(file);
    chmodSync(file, 0o600);
    this.db
      .exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, source_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL, payload TEXT NOT NULL, meeting_id TEXT, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS meetings(id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS senders(delegate_id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id), source_key TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'pending', due_at INTEGER NOT NULL, next_at INTEGER NOT NULL,
        prep_attempts INTEGER NOT NULL DEFAULT 0, send_attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0, lease_token TEXT,
        first_send_at INTEGER, provider_id TEXT UNIQUE, message TEXT, content TEXT, last_error TEXT);
      CREATE INDEX IF NOT EXISTS queue_work ON notifications(status, next_at, due_at);
      CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, request_id TEXT, notification_id TEXT, kind TEXT NOT NULL, details TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS webhook_events(id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, kind TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS worker_health(name TEXT PRIMARY KEY, updated_at INTEGER NOT NULL, details TEXT NOT NULL);`);
    if (
      !this.db
        .prepare("PRAGMA table_info(notifications)")
        .all()
        .some((c) => c.name === "message")
    )
      this.db.exec("ALTER TABLE notifications ADD COLUMN message TEXT");
    // Persist assignments once: future profile edits must not silently change a sender.
    const domain = process.env.IR_EMAIL_DOMAIN || "influencerock.com";
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain))
      throw new Error("Invalid sender domain");
    const slug = (v: string) =>
      v
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");
    const names = profiles.map(
      (p) => slug(`${p.firstName}.${p.lastName}`) || slug(p.id),
    );
    this.transaction(() => {
      profiles.forEach((p, i) => {
        const local =
          names.filter((n) => n === names[i]).length > 1
            ? `${names[i]}.${slug(p.id)}`
            : names[i];
        this.db
          .prepare("INSERT OR IGNORE INTO senders VALUES(?,?,?)")
          .run(p.id, p.name, `${local}@${domain}`);
      });
    });
  }
  close() {
    this.db.close();
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  event(
    requestId: string | null,
    notificationId: string | null,
    kind: string,
    details: object = {},
    now = Date.now(),
  ) {
    this.db
      .prepare(
        "INSERT INTO events(request_id,notification_id,kind,details,created_at) VALUES(?,?,?,?,?)",
      )
      .run(requestId, notificationId, kind, JSON.stringify(details), now);
  }
  request(id: string) {
    return this.db
      .prepare("SELECT * FROM requests WHERE id=?")
      .get(id) as unknown as RequestRecord | undefined;
  }
  notification(id: string) {
    return this.db
      .prepare("SELECT * FROM notifications WHERE id=?")
      .get(id) as unknown as QueueRecord | undefined;
  }
  meeting(id: string): Meeting | undefined {
    const row = this.db
      .prepare("SELECT snapshot FROM meetings WHERE id=?")
      .get(id);
    return row ? JSON.parse(row.snapshot as string) : undefined;
  }
  sender(delegateId: string) {
    if (!delegateId)
      return {
        name: "Influence Rock",
        email: `hello@${process.env.IR_EMAIL_DOMAIN || "influencerock.com"}`,
      };
    const row = this.db
      .prepare("SELECT name,email FROM senders WHERE delegate_id=?")
      .get(delegateId);
    if (!row) throw new Error("Delegate sender is not configured");
    return row as unknown as { name: string; email: string };
  }
  private insertRequest(
    id: string,
    source: string,
    payload: object,
    meetingId: string | null,
    now: number,
  ) {
    const encoded = JSON.stringify(payload);
    this.db
      .prepare("INSERT INTO requests VALUES(?,?,?,?,?,?)")
      .run(id, source, hash(encoded), encoded, meetingId, now);
    this.event(id, null, "request.saved", {}, now);
  }
  private insertNotification(
    id: string,
    requestId: string,
    source: string,
    kind: string,
    revision: number,
    due: number,
    now: number,
  ) {
    this.db
      .prepare(
        "INSERT INTO notifications(id,request_id,source_key,kind,revision,due_at,next_at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(id, requestId, source, kind, revision, due, now);
    this.event(requestId, id, "preparation.queued", { kind }, now);
  }
  enqueueConsultation(
    input: ConsultationInput,
    key?: string,
    now = Date.now(),
  ) {
    const source = key
      ? `consultation:${hash(key)}`
      : `consultation:${randomUUID()}`;
    return this.transaction(() => {
      const existing = this.db
        .prepare("SELECT * FROM requests WHERE source_key=?")
        .get(source) as unknown as
        (RequestRecord & { payload_hash: string }) | undefined;
      if (existing) {
        if (existing.payload_hash !== hash(JSON.stringify(input)))
          throw new Error("Idempotency key was used for different details");
        return existing.id;
      }
      const id = `IR-${randomUUID()}`;
      this.insertRequest(id, source, input, null, now);
      this.insertNotification(
        `mail-${id}`,
        id,
        source,
        "consultation",
        1,
        now,
        now,
      );
      return id;
    });
  }
  ingestMeeting(
    meeting: Meeting,
    notifications: MeetingNotification[],
    now = Date.now(),
  ) {
    return this.transaction(() => {
      const previous = this.meeting(meeting.id);
      if (previous && previous.revision > meeting.revision)
        throw new Error("Stale meeting revision");
      const id = `meeting-${meeting.id}`;
      if (!this.request(id))
        this.insertRequest(
          id,
          id,
          {
            name: meeting.organizerName,
            email: meeting.organizerEmail,
            profileId: meeting.delegateId,
            objective: meeting.agenda,
            title: meeting.title,
          },
          meeting.id,
          now,
        );
      if (
        previous &&
        (previous.delegateId !== meeting.delegateId ||
          previous.organizerEmail !== meeting.organizerEmail)
      )
        throw new Error("Meeting identity cannot change");
      this.db
        .prepare(
          "INSERT INTO meetings VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot,updated_at=excluded.updated_at",
        )
        .run(meeting.id, JSON.stringify(meeting), now);
      if (JSON.stringify(previous) !== JSON.stringify(meeting))
        this.event(
          id,
          null,
          "meeting.updated",
          {
            bookingStatus: meeting.bookingStatus,
            sessionStatus: meeting.sessionStatus,
            revision: meeting.revision,
            resultStatus: meeting.resultStatus,
          },
          now,
        );
      for (const n of notifications) {
        const source = `smartmeet:${n.id}`;
        const existing = this.db
          .prepare("SELECT * FROM notifications WHERE source_key=?")
          .get(source) as unknown as QueueRecord | undefined;
        if (existing) {
          if (
            existing.request_id !== id ||
            existing.kind !== n.kind ||
            existing.revision !== n.revision ||
            existing.due_at !== Date.parse(n.dueAt)
          )
            throw new Error("Notification identity conflict");
        } else
          this.insertNotification(
            `sm-${n.id}`,
            id,
            source,
            n.kind,
            n.revision,
            Date.parse(n.dueAt),
            now,
          );
      }
      this.db
        .prepare(
          "UPDATE notifications SET status='superseded',lease_token=NULL,lease_until=0 WHERE request_id=? AND status IN ('pending','preparing','ready') AND (revision<>? OR (kind IN ('confirmed','reminder','proposal') AND ? NOT IN ('confirmed','pending')))",
        )
        .run(id, meeting.revision, meeting.bookingStatus);
      return id;
    });
  }
  claim(stage: "prepare" | "send", now = Date.now()): QueueRecord | undefined {
    return this.transaction(() => {
      const status = stage === "prepare" ? "preparing" : "sending";
      const waiting = stage === "prepare" ? "pending" : "ready";
      const due = stage === "send" ? "AND due_at<=?" : "";
      const args =
        stage === "send"
          ? [waiting, status, now, now, now]
          : [waiting, status, now, now];
      const row = this.db
        .prepare(
          `SELECT * FROM notifications WHERE (status=? OR (status=? AND lease_until<=?)) AND next_at<=? ${due} ORDER BY next_at,id LIMIT 1`,
        )
        .get(...args) as unknown as QueueRecord | undefined;
      if (!row) return;
      const token = randomUUID();
      const lease = stage === "prepare" ? 360_000 : 60_000;
      this.db
        .prepare(
          `UPDATE notifications SET status=?,lease_token=?,lease_until=?,${stage === "prepare" ? "prep_attempts" : "send_attempts"}=${stage === "prepare" ? "prep_attempts" : "send_attempts"}+1 WHERE id=?`,
        )
        .run(status, token, now + lease, row.id);
      this.event(
        row.request_id,
        row.id,
        `${stage}.claimed`,
        { recovered: row.status === status },
        now,
      );
      return this.notification(row.id);
    });
  }
  finish(
    job: QueueRecord,
    status: string,
    fields: {
      content?: Draft;
      error?: string;
      nextAt?: number;
      providerId?: string;
      firstSendAt?: number;
    } = {},
    now = Date.now(),
  ) {
    return this.transaction(() => {
      const result = this.db
        .prepare(
          `UPDATE notifications SET status=?,lease_until=0,lease_token=NULL,content=COALESCE(?,content),last_error=?,next_at=COALESCE(?,next_at),provider_id=COALESCE(?,provider_id),first_send_at=COALESCE(first_send_at,?) WHERE id=? AND lease_token=?`,
        )
        .run(
          status,
          fields.content ? JSON.stringify(fields.content) : null,
          fields.error || null,
          fields.nextAt ?? null,
          fields.providerId ?? null,
          fields.firstSendAt ?? null,
          job.id,
          job.lease_token,
        );
      if (!result.changes) return false;
      this.event(
        job.request_id,
        job.id,
        `email.${status}`,
        { error: fields.error || null, providerId: fields.providerId || null },
        now,
      );
      if (fields.providerId) this.applyDelivery(fields.providerId, now);
      return true;
    });
  }
  markSendStarted(job: QueueRecord, message: object, now = Date.now()) {
    return (
      this.db
        .prepare(
          "UPDATE notifications SET first_send_at=COALESCE(first_send_at,?),message=COALESCE(message,?) WHERE id=? AND lease_token=?",
        )
        .run(now, JSON.stringify(message), job.id, job.lease_token).changes > 0
    );
  }
  recordWebhook(
    id: string,
    providerId: string,
    kind: string,
    now = Date.now(),
  ) {
    this.transaction(() => {
      const inserted = this.db
        .prepare("INSERT OR IGNORE INTO webhook_events VALUES(?,?,?,?)")
        .run(id, providerId, kind, now);
      if (inserted.changes) this.applyDelivery(providerId, now);
    });
  }
  private applyDelivery(providerId: string, now: number) {
    const job = this.db
      .prepare("SELECT * FROM notifications WHERE provider_id=?")
      .get(providerId) as unknown as QueueRecord | undefined;
    if (!job) return;
    const events = this.db
      .prepare("SELECT kind FROM webhook_events WHERE provider_id=?")
      .all(providerId)
      .map((x) => x.kind);
    const state = events.includes("email.complained")
      ? "complained"
      : events.includes("email.bounced")
        ? "bounced"
        : events.includes("email.failed")
          ? "failed"
          : events.includes("email.delivered")
            ? "delivered"
            : job.status;
    if (state !== job.status) {
      this.db
        .prepare("UPDATE notifications SET status=? WHERE id=?")
        .run(state, job.id);
      this.event(
        job.request_id,
        job.id,
        `delivery.${state}`,
        { providerId },
        now,
      );
    }
  }
  health(name: string, details: object, now = Date.now()) {
    this.db
      .prepare(
        "INSERT INTO worker_health VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET updated_at=excluded.updated_at,details=excluded.details",
      )
      .run(name, now, JSON.stringify(details));
  }
  importHistorical(input: ConsultationInput, id: string, createdAt: number) {
    if (!id || !Number.isFinite(createdAt))
      throw new Error("Invalid historical record");
    this.transaction(() => {
      if (!this.request(id))
        this.insertRequest(id, `historical:${id}`, input, null, createdAt);
    });
  }
  prune(cutoff: number) {
    return this.transaction(() => {
      this.db.exec("PRAGMA secure_delete=ON");
      this.db
        .prepare(
          "DELETE FROM notifications WHERE request_id IN (SELECT id FROM requests WHERE created_at<?)",
        )
        .run(cutoff);
      this.db
        .prepare(
          "DELETE FROM events WHERE created_at<? OR request_id IN (SELECT id FROM requests WHERE created_at<?)",
        )
        .run(cutoff, cutoff);
      const removed = this.db
        .prepare("DELETE FROM requests WHERE created_at<?")
        .run(cutoff).changes;
      this.db
        .prepare(
          "DELETE FROM meetings WHERE updated_at<? AND id NOT IN (SELECT meeting_id FROM requests WHERE meeting_id IS NOT NULL)",
        )
        .run(cutoff);
      this.db
        .prepare("DELETE FROM webhook_events WHERE created_at<?")
        .run(cutoff);
      return removed;
    });
  }
}
