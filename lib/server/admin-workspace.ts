import "server-only";
import type { SQLInputValue } from "node:sqlite";
import { PipelineStore } from "./pipeline-store";
import { readRequestDetail, type AdminFilters } from "./admin";
import { type AdminView, emailStates, adminSortOptions } from "../admin-views";

const proposalJoin = `FROM requests r
  LEFT JOIN senders s ON s.delegate_id=json_extract(r.payload,'$.profileId')
  LEFT JOIN notifications n ON n.id=(SELECT id FROM notifications WHERE request_id=r.id ORDER BY due_at DESC,id DESC LIMIT 1)`;
const emailJoin = `FROM notifications n JOIN requests r ON r.id=n.request_id
  LEFT JOIN senders s ON s.delegate_id=json_extract(r.payload,'$.profileId')`;
const meetingJoin = `FROM meetings m LEFT JOIN requests r ON r.id='meeting-'||m.id LEFT JOIN senders s ON s.delegate_id=json_extract(m.snapshot,'$.delegateId')`;
const eventJoin = `FROM events e LEFT JOIN requests r ON r.id=e.request_id LEFT JOIN senders s ON s.delegate_id=json_extract(r.payload,'$.profileId')`;
const requestFields = `r.id,r.payload,r.created_at,s.name AS delegate_name,s.email AS sender_email,n.id AS notification_id,n.kind,n.status,n.due_at,n.prep_attempts,n.send_attempts,n.last_error,n.provider_id`;
const upcoming = `julianday(json_extract(m.snapshot,'$.startsAt'))>julianday(?) AND json_extract(m.snapshot,'$.bookingStatus') IN ('pending','confirmed')`;
export const ADMIN_PAGE_SIZE = 25;
export function readWorkspace(
  view: AdminView,
  filters: AdminFilters = {},
  now = Date.now(),
) {
  const store = new PipelineStore();
  store.db.exec("BEGIN");
  try {
    const db = store.db;
    const count = (sql: string, ...args: SQLInputValue[]) =>
      Number(db.prepare(sql).get(...args)!.n);
    const q = (filters.q || "").trim().slice(0, 200);
    const status = (filters.status || "").slice(0, 50);
    // Treat user search as literal text, not SQL LIKE wildcard syntax.
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const sortOptions = adminSortOptions[view];
    const sort = sortOptions.some((option) => option.value === filters.sort)
      ? filters.sort!
      : "newest";
    const counts = db
      .prepare(
        "SELECT status,count(*) AS count FROM notifications GROUP BY status ORDER BY status",
      )
      .all();
    const byStatus = Object.fromEntries(
      counts.map((row) => [String(row.status), Number(row.count)]),
    );
    const summary = {
      proposals: count(
        "SELECT count(*) AS n FROM requests WHERE meeting_id IS NULL",
      ),
      meetings: count("SELECT count(*) AS n FROM meetings"),
      upcomingMeetings: count(
        `SELECT count(*) AS n ${meetingJoin} WHERE ${upcoming}`,
        new Date(now).toISOString(),
      ),
      emails: count("SELECT count(*) AS n FROM notifications"),
      queuedEmails: ["pending", "preparing", "ready", "sending"].reduce(
        (sum, state) => sum + (byStatus[state] || 0),
        0,
      ),
      deliveredEmails: byStatus.delivered || 0,
      attentionEmails: ["failed", "bounced", "complained", "uncertain"].reduce(
        (sum, state) => sum + (byStatus[state] || 0),
        0,
      ),
      events: count("SELECT count(*) AS n FROM events"),
    };
    let join = proposalJoin;
    let fields = requestFields;
    let where =
      "WHERE r.meeting_id IS NULL AND (?='' OR r.id LIKE ? ESCAPE '\\' OR r.payload LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\') AND (?='' OR n.status=?)";
    let args: SQLInputValue[] = [q, like, like, like, like, status, status];
    let order =
      sort === "oldest"
        ? "r.created_at ASC,r.id ASC"
        : "r.created_at DESC,r.id DESC";
    let statusOptions = emailStates;
    if (view === "emails") {
      join = emailJoin;
      where =
        "WHERE (?='' OR r.id LIKE ? ESCAPE '\\' OR r.payload LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\' OR n.provider_id LIKE ? ESCAPE '\\') AND (?='' OR n.status=?)";
      args = [q, like, like, like, like, like, status, status];
      order =
        sort === "due_asc"
          ? "n.due_at ASC,n.id ASC"
          : sort === "due_desc"
            ? "n.due_at DESC,n.id DESC"
            : sort === "oldest"
              ? "r.created_at ASC,r.id ASC,n.due_at ASC,n.id ASC"
              : "r.created_at DESC,r.id DESC,n.due_at ASC,n.id ASC";
    } else if (view === "meetings") {
      join = meetingJoin;
      fields =
        "m.id,m.snapshot,m.updated_at,r.created_at,s.name AS delegate_name,s.email AS sender_email";
      where =
        "WHERE (?='' OR m.id LIKE ? ESCAPE '\\' OR json_extract(m.snapshot,'$.title') LIKE ? ESCAPE '\\' OR json_extract(m.snapshot,'$.organizerName') LIKE ? ESCAPE '\\' OR json_extract(m.snapshot,'$.organizerEmail') LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\' OR json_extract(m.snapshot,'$.agenda') LIKE ? ESCAPE '\\') AND (?='' OR json_extract(m.snapshot,'$.bookingStatus')=?)";
      args = [q, like, like, like, like, like, like, like, status, status];
      order =
        sort === "schedule_asc"
          ? "julianday(json_extract(m.snapshot,'$.startsAt')) ASC,m.id ASC"
          : sort === "schedule_desc"
            ? "julianday(json_extract(m.snapshot,'$.startsAt')) DESC,m.id DESC"
            : sort === "oldest"
              ? "coalesce(r.created_at,m.updated_at) ASC,m.id ASC"
              : "coalesce(r.created_at,m.updated_at) DESC,m.id DESC";
      statusOptions = [
        "pending",
        "confirmed",
        "declined",
        "cancelled",
        "expired",
      ];
    } else if (view === "activity") {
      join = eventJoin;
      fields = "e.*,r.payload";
      where =
        "WHERE (?='' OR e.kind LIKE ? ESCAPE '\\' OR e.request_id LIKE ? ESCAPE '\\' OR e.details LIKE ? ESCAPE '\\' OR r.payload LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\') AND (?='' OR e.kind=?)";
      args = [q, like, like, like, like, like, like, status, status];
      order =
        sort === "oldest"
          ? "e.created_at ASC,e.id ASC"
          : "e.created_at DESC,e.id DESC";
      statusOptions = db
        .prepare("SELECT DISTINCT kind FROM events ORDER BY kind LIMIT 100")
        .all()
        .map((row) => String(row.kind));
    }
    const total =
      view === "dashboard"
        ? 0
        : count(`SELECT count(*) AS n ${join} ${where}`, ...args);
    const page = Math.min(
      Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
      Math.max(1, Number.parseInt(filters.page || "1", 10) || 1),
    );
    const rows =
      view === "dashboard"
        ? []
        : db
            .prepare(
              `SELECT ${fields} ${join} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
            )
            .all(...args, ADMIN_PAGE_SIZE, (page - 1) * ADMIN_PAGE_SIZE);
    const result = {
      view,
      q,
      status,
      sort,
      sortOptions,
      page,
      total,
      rows,
      statusOptions,
      summary,
      byStatus,
      detail: readRequestDetail(store, filters.id),
      workers:
        view === "activity"
          ? db.prepare("SELECT * FROM worker_health ORDER BY name").all()
          : [],
      recentProposals:
        view === "dashboard"
          ? db
              .prepare(
                `SELECT ${requestFields} ${proposalJoin} WHERE r.meeting_id IS NULL ORDER BY r.created_at DESC,r.id DESC LIMIT 5`,
              )
              .all()
          : [],
      upcoming:
        view === "dashboard"
          ? db
              .prepare(
                `SELECT m.snapshot,s.name AS delegate_name ${meetingJoin} WHERE ${upcoming} ORDER BY julianday(json_extract(m.snapshot,'$.startsAt')),m.id LIMIT 4`,
              )
              .all(new Date(now).toISOString())
          : [],
      recentEvents:
        view === "dashboard"
          ? db
              .prepare(
                `SELECT e.*,r.payload ${eventJoin} ORDER BY e.created_at DESC,e.id DESC LIMIT 6`,
              )
              .all()
          : [],
    };
    db.exec("COMMIT");
    return result;
  } catch (error) {
    store.db.exec("ROLLBACK");
    throw error;
  } finally {
    store.close();
  }
}
export type WorkspaceData = ReturnType<typeof readWorkspace>;
