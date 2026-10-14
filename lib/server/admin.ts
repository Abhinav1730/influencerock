import "server-only";
import { PipelineStore } from "./pipeline-store";
export interface AdminFilters {
  q?: string;
  status?: string;
  page?: string;
  sort?: string;
  id?: string;
}
export function readAdmin(filters: AdminFilters = {}) {
  const store = new PipelineStore();
  try {
    const page = Math.min(
      100_000,
      Math.max(1, Number.parseInt(filters.page || "1", 10) || 1),
    );
    const q = (filters.q || "").slice(0, 200);
    const status = (filters.status || "").slice(0, 30);
    const where =
      "WHERE (?='' OR r.id LIKE ? OR json_extract(r.payload,'$.name') LIKE ? OR json_extract(r.payload,'$.email') LIKE ? OR s.name LIKE ?) AND (?='' OR n.status=?)";
    const args = [q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, status, status];
    const join =
      "FROM requests r LEFT JOIN notifications n ON n.request_id=r.id LEFT JOIN senders s ON s.delegate_id=json_extract(r.payload,'$.profileId')";
    const rows = store.db
      .prepare(
        `SELECT r.id,r.created_at,r.meeting_id,r.payload,s.name AS delegate_name,s.email AS sender_email,n.id AS notification_id,n.kind,n.status,n.prep_attempts,n.send_attempts,n.due_at,n.last_error,n.provider_id ${join} ${where} ORDER BY r.created_at DESC,n.due_at DESC LIMIT 50 OFFSET ?`,
      )
      .all(...args, (page - 1) * 50);
    const total = store.db
      .prepare(`SELECT count(*) AS count ${join} ${where}`)
      .get(...args)!.count as number;
    const detail = readRequestDetail(store, filters.id);
    return {
      page,
      total,
      rows,
      detail,
      counts: store.db
        .prepare(
          "SELECT status,count(*) AS count FROM notifications GROUP BY status ORDER BY status",
        )
        .all(),
      requests: store.db
        .prepare("SELECT count(*) AS count FROM requests")
        .get()!.count as number,
      meetings: store.db
        .prepare("SELECT count(*) AS count FROM meetings")
        .get()!.count as number,
      workers: store.db
        .prepare("SELECT * FROM worker_health ORDER BY name")
        .all(),
      recentMeetings: store.db
        .prepare(
          "SELECT snapshot,updated_at FROM meetings ORDER BY updated_at DESC LIMIT 30",
        )
        .all(),
    };
  } finally {
    store.close();
  }
}

export function readRequestDetail(store: PipelineStore, id?: string) {
  const selected = id ? store.request(id) : undefined;
  return selected
    ? {
        ...selected,
        payload: JSON.parse(selected.payload),
        sender:
          store.db
            .prepare(
              "SELECT name,email FROM senders WHERE delegate_id=json_extract(?, '$.profileId')",
            )
            .get(selected.payload) || store.sender(""),
        meeting: selected.meeting_id
          ? store.meeting(selected.meeting_id)
          : undefined,
        notifications: store.db
          .prepare(
            "SELECT * FROM notifications WHERE request_id=? ORDER BY due_at",
          )
          .all(selected.id),
        events: store.db
          .prepare(
            "SELECT * FROM events WHERE request_id=? ORDER BY id DESC LIMIT 200",
          )
          .all(selected.id),
      }
    : undefined;
}
