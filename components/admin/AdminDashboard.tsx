import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminSessionAuthorized } from "@/lib/server/admin-auth";
import { isAdminHost } from "@/lib/server/admin-host";
import {
  readWorkspace,
  ADMIN_PAGE_SIZE,
  type WorkspaceData,
} from "@/lib/server/admin-workspace";
import {
  adminViews,
  adminDate,
  eventLabel,
  type AdminView,
} from "@/lib/admin-views";
import type { AdminFilters } from "@/lib/server/admin";
import type { Meeting } from "@/lib/server/pipeline-store";
import { AdminFilterForm } from "./AdminFilterForm";
import { AdminSidebar } from "./AdminSidebar";
import { AdminIcon } from "./AdminIcon";
import { RequestDetail } from "./RequestDetail";
import styles from "./admin.module.css";

type Row = WorkspaceData["rows"][number];
const value = (row: Row, key: string) => String(row[key] ?? "");
const payload = (row: Row) =>
  JSON.parse(value(row, "payload") || "{}") as Record<string, string>;
const labels: Record<string, string> = {
  pending: "Queued",
  preparing: "Preparing",
  ready: "Ready to send",
  sending: "Sending",
  accepted: "Accepted",
  delivered: "Delivered",
  bounced: "Bounced",
  complained: "Complaint",
  failed: "Failed",
  superseded: "Superseded",
  uncertain: "Uncertain",
};
function Badge({ status, email = true }: { status: string; email?: boolean }) {
  const tone = ["delivered", "confirmed", "ended"].includes(status)
    ? styles.good
    : ["failed", "bounced", "complained", "uncertain", "declined"].includes(
          status,
        )
      ? styles.bad
      : ["preparing", "sending", "pending", "provisioning"].includes(status)
        ? styles.waiting
        : styles.neutral;
  return (
    <span className={`${styles.badge} ${tone}`}>
      <i />
      {email
        ? labels[status] || status || "Stored"
        : eventLabel(status) || "Unknown"}
    </span>
  );
}
function Empty({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className={styles.empty}>
      <AdminIcon name={icon} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function CardTitle({
  title,
  href,
  action = "View all",
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className={styles.cardTitle}>
      <h2>{title}</h2>
      {href ? (
        <Link href={href}>
          {action}
          <AdminIcon name="arrow" />
        </Link>
      ) : null}
    </div>
  );
}
function ActivityList({ rows }: { rows: Row[] }) {
  return (
    <ol className={styles.timeline}>
      {rows.map((row) => (
        <li key={value(row, "id")}>
          <span className={styles.timelineDot} />
          <div>
            <strong>{eventLabel(value(row, "kind"))}</strong>
            <p>
              {payload(row).name || "Platform"}
              {row.request_id ? (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/?id=${encodeURIComponent(value(row, "request_id"))}`}
                  >
                    View request
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <time>{adminDate(row.created_at)}</time>
        </li>
      ))}
    </ol>
  );
}
function DashboardOverview({ data }: { data: WorkspaceData }) {
  const metrics = [
    {
      label: "Total proposals",
      value: data.summary.proposals,
      note: "All incoming proposals",
      href: "/proposals",
      icon: "proposals",
    },
    {
      label: "Upcoming meetings",
      value: data.summary.upcomingMeetings,
      note: "Pending or confirmed bookings",
      href: "/meetings",
      icon: "meetings",
    },
    {
      label: "Emails in queue",
      value: data.summary.queuedEmails,
      note: "Preparing or awaiting delivery",
      href: "/emails",
      icon: "emails",
    },
    {
      label: "Emails delivered",
      value: data.summary.deliveredEmails,
      note: "Verified delivery events",
      href: "/emails?status=delivered",
      icon: "check",
    },
  ];
  return (
    <>
      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <Link className={styles.metric} href={metric.href} key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <AdminIcon name={metric.icon} />
            </div>
            <strong>{metric.value.toLocaleString("en-IN")}</strong>
            <small>
              {metric.note}
              <AdminIcon name="arrow" />
            </small>
          </Link>
        ))}
      </div>
      {data.summary.attentionEmails ? (
        <div className={styles.attention}>
          <AdminIcon name="activity" />
          <p>
            <strong>
              {data.summary.attentionEmails} email{" "}
              {data.summary.attentionEmails === 1
                ? "record needs"
                : "records need"}{" "}
              attention.
            </strong>{" "}
            Review failures, bounces, complaints and uncertain delivery.
          </p>
          <Link href="/emails">View emails →</Link>
        </div>
      ) : null}
      <div className={styles.overviewGrid}>
        <section className={styles.card}>
          <CardTitle title="Recent proposals" href="/proposals" />
          {data.recentProposals.length ? (
            <div className={styles.tableScroll}>
              <table className={styles.compactTable}>
                <caption className="sr-only">
                  Five most recent proposals
                </caption>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Delegate</th>
                    <th>Email state</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProposals.map((row) => (
                    <tr key={value(row, "id")}>
                      <td>
                        <Link
                          href={`/proposals?id=${encodeURIComponent(value(row, "id"))}`}
                        >
                          {payload(row).name || "Unnamed requester"}
                        </Link>
                        <small>{adminDate(row.created_at)}</small>
                      </td>
                      <td>{value(row, "delegate_name") || "Central intake"}</td>
                      <td>
                        <Badge status={value(row, "status")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon="proposals"
              title="No proposals yet"
              description="New proposals will appear here as they arrive."
            />
          )}
        </section>
        <section className={styles.card}>
          <CardTitle title="Upcoming meetings" href="/meetings" />
          {data.upcoming.length ? (
            <div className={styles.meetingList}>
              {data.upcoming.map((row) => {
                const meeting = JSON.parse(value(row, "snapshot")) as Meeting;
                return (
                  <Link
                    href={`/meetings?id=${encodeURIComponent(`meeting-${meeting.id}`)}`}
                    key={meeting.id}
                  >
                    <span className={styles.meetingIcon}>
                      <AdminIcon name="meetings" />
                    </span>
                    <div>
                      <strong>{meeting.title}</strong>
                      <p>
                        {meeting.organizerName} ·{" "}
                        {value(row, "delegate_name") || "Delegate"}
                      </p>
                      <small>{adminDate(meeting.startsAt)} IST</small>
                    </div>
                    <AdminIcon name="arrow" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty
              icon="meetings"
              title="No upcoming meetings"
              description="Future pending and confirmed bookings appear here."
            />
          )}
        </section>
      </div>
      <div className={styles.overviewGrid}>
        <section className={styles.card}>
          <CardTitle title="Recent activity" href="/activity" />
          {data.recentEvents.length ? (
            <ActivityList rows={data.recentEvents} />
          ) : (
            <Empty
              icon="activity"
              title="Awaiting platform activity"
              description="Request and delivery events will be recorded automatically."
            />
          )}
        </section>
        <section className={styles.card}>
          <CardTitle title="Email pipeline" href="/emails" />
          {[
            [
              "Awaiting preparation",
              (data.byStatus.pending || 0) + (data.byStatus.preparing || 0),
            ],
            ["Ready to send", data.byStatus.ready || 0],
            ["Sending", data.byStatus.sending || 0],
            ["Accepted by provider", data.byStatus.accepted || 0],
            ["Delivery verified", data.byStatus.delivered || 0],
          ].map(([label, count]) => (
            <div className={styles.pipelineRow} key={String(label)}>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ))}
          <p className={styles.explanation}>
            Emails are sent automatically each hour. Provider acceptance and
            verified delivery are tracked separately.
          </p>
        </section>
      </div>
    </>
  );
}
function RecordsTable({
  view,
  rows,
  detailHref,
}: {
  view: AdminView;
  rows: Row[];
  detailHref: (id: string) => string;
}) {
  const headings =
    view === "meetings"
      ? [
          "Meeting",
          "Organizer / delegate",
          "Scheduled for · IST",
          "Booking / session",
          "Details",
        ]
      : view === "emails"
        ? [
            "Recipient",
            "Delegate / sender",
            "Email / delivery state",
            "Due · IST",
            "Attempts",
            "Details",
          ]
        : view === "activity"
          ? ["Time · IST", "Event", "Request", "Details"]
          : [
              "Requester",
              "Proposal",
              "Delegate",
              "Received · IST",
              "Email state",
              "Details",
            ];
  return (
    <div className={styles.tableScroll}>
      <table className={styles.recordsTable}>
        <caption className="sr-only">{adminViews[view].label} records</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th scope="col" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const p = payload(row);
            if (view === "meetings") {
              const m = JSON.parse(value(row, "snapshot")) as Meeting;
              return (
                <tr key={m.id}>
                  <td>
                    <strong>{m.title}</strong>
                    <small>
                      Booked: {adminDate(row.created_at ?? row.updated_at)} IST
                    </small>
                    <small>Results: {eventLabel(m.resultStatus)}</small>
                  </td>
                  <td>
                    {m.organizerName}
                    <small>{m.organizerEmail}</small>
                    <small>{value(row, "delegate_name") || "Delegate"}</small>
                  </td>
                  <td>
                    {adminDate(m.startsAt)}
                    <small>Source timezone: {m.timezone}</small>
                  </td>
                  <td>
                    <Badge status={m.bookingStatus} email={false} />
                    <small>Session: {eventLabel(m.sessionStatus)}</small>
                  </td>
                  <td>
                    <Link href={detailHref(`meeting-${m.id}`)}>
                      View meeting →
                    </Link>
                  </td>
                </tr>
              );
            }
            if (view === "activity")
              return (
                <tr key={value(row, "id")}>
                  <td>{adminDate(row.created_at)}</td>
                  <td>
                    <strong>{eventLabel(value(row, "kind"))}</strong>
                  </td>
                  <td>
                    {p.name || "Platform"}
                    {row.request_id ? (
                      <small>
                        <Link href={detailHref(value(row, "request_id"))}>
                          View request →
                        </Link>
                      </small>
                    ) : null}
                  </td>
                  <td>
                    <details>
                      <summary>Event details</summary>
                      <pre>
                        {JSON.stringify(
                          JSON.parse(value(row, "details") || "{}"),
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </td>
                </tr>
              );
            if (view === "emails")
              return (
                <tr key={value(row, "notification_id")}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.email}</small>
                  </td>
                  <td>
                    {value(row, "delegate_name") || "Influence Rock"}
                    <small>
                      {value(row, "sender_email") || "Central intake"}
                    </small>
                  </td>
                  <td>
                    {eventLabel(value(row, "kind"))}
                    <small>
                      <Badge status={value(row, "status")} />
                    </small>
                    {row.last_error ? (
                      <small className={styles.errorText}>
                        {value(row, "last_error")}
                      </small>
                    ) : null}
                  </td>
                  <td>{adminDate(row.due_at)}</td>
                  <td>
                    {Number(row.prep_attempts || 0)} preparation
                    <small>{Number(row.send_attempts || 0)} delivery</small>
                  </td>
                  <td>
                    <Link
                      href={`${detailHref(value(row, "id"))}#email-${encodeURIComponent(value(row, "notification_id"))}`}
                    >
                      View email →
                    </Link>
                  </td>
                </tr>
              );
            return (
              <tr key={value(row, "id")}>
                <td>
                  <strong>{p.name}</strong>
                  <small>{p.email}</small>
                  <small>{p.organization}</small>
                </td>
                <td>
                  <span className={styles.excerpt}>
                    {p.objective || "Historical proposal"}
                  </span>
                </td>
                <td>
                  {value(row, "delegate_name") || "Central intake"}
                  <small>{value(row, "sender_email")}</small>
                </td>
                <td>{adminDate(row.created_at)}</td>
                <td>
                  <Badge status={value(row, "status")} />
                </td>
                <td>
                  <Link href={detailHref(value(row, "id"))}>
                    View proposal →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export default async function AdminDashboard({
  searchParams,
  view = "dashboard",
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  view?: AdminView;
}) {
  const requestHeaders = await headers();
  if (!isAdminHost(requestHeaders)) notFound();
  if (!adminSessionAuthorized(requestHeaders)) redirect("/login");
  const params = await searchParams;
  const filters: AdminFilters = Object.fromEntries(
    Object.entries(params).filter(([, value]) => typeof value === "string"),
  );
  const data = readWorkspace(view, filters);
  const definition = adminViews[view];
  const href = (page: number, id?: string) =>
    `${definition.href}?${new URLSearchParams({ ...(data.q ? { q: data.q } : {}), ...(data.status ? { status: data.status } : {}), sort: data.sort, page: String(page), ...(id ? { id } : {}) })}`;
  return (
    <div className={styles.workspace}>
      <AdminSidebar
        view={view}
        counts={{
          proposals: data.summary.proposals,
          meetings: data.summary.meetings,
          emails: data.summary.emails,
        }}
      />
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span>Workspace</span>
            <span>/</span>
            <strong>{definition.label}</strong>
          </div>
          <span className={styles.timezone}>
            <AdminIcon name="clock" /> All times in IST
          </span>
        </header>
        <section className={styles.content}>
          <div className={styles.heading}>
            <div>
              <span className={styles.eyebrow}>INFLUENCE ROCK · ADMIN</span>
              <h1>{definition.label}</h1>
              <p>{definition.description}</p>
            </div>
            <a
              className={styles.primaryButton}
              href={href(data.page, filters.id)}
            >
              <AdminIcon name="refresh" /> Refresh activity
            </a>
          </div>
          {filters.id ? (
            <>
              <Link className={styles.backLink} href={href(data.page)}>
                ← Back to {definition.label.toLowerCase()}
              </Link>
              {data.detail ? (
                <RequestDetail detail={data.detail} />
              ) : (
                <section className={styles.card}>
                  <Empty
                    icon="proposals"
                    title="Request not found"
                    description="The request may have been removed by the retention policy."
                  />
                </section>
              )}
            </>
          ) : view === "dashboard" ? (
            <DashboardOverview data={data} />
          ) : (
            <>
              {view === "activity" ? (
                <section
                  className={styles.workerGrid}
                  aria-label="Worker heartbeats"
                >
                  {data.workers.length ? (
                    data.workers.map((worker) => (
                      <div
                        className={styles.worker}
                        key={value(worker, "name")}
                      >
                        <AdminIcon name="activity" />
                        <div>
                          <strong>{value(worker, "name")}</strong>
                          <small>
                            Last heartbeat: {adminDate(worker.updated_at)}
                          </small>
                          <p>{value(worker, "details")}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.card}>
                      <p>No worker heartbeat has been recorded yet.</p>
                    </div>
                  )}
                </section>
              ) : null}
              <section className={styles.card}>
                <div className={styles.cardTitle}>
                  <div>
                    <h2>
                      {view === "activity"
                        ? "Event history"
                        : `All ${definition.label.toLowerCase()}`}
                    </h2>
                    <p>
                      {data.total.toLocaleString("en-IN")} matching{" "}
                      {view === "emails"
                        ? "emails"
                        : view === "activity"
                          ? "events"
                          : definition.label.toLowerCase()}
                      {" · "}
                      {
                        data.sortOptions.find(
                          (option) => option.value === data.sort,
                        )?.label
                      }
                    </p>
                  </div>
                </div>
                <AdminFilterForm
                  key={`${view}:${data.q}:${data.status}:${data.sort}`}
                  action={definition.href}
                >
                  <div className={styles.filterField}>
                    <label htmlFor="admin-search">
                      Find request, person or delegate
                    </label>
                    <input
                      id="admin-search"
                      type="search"
                      name="q"
                      defaultValue={data.q}
                      placeholder={
                        view === "activity"
                          ? "Search events or requests…"
                          : `Search ${definition.label.toLowerCase()}…`
                      }
                      maxLength={200}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <label htmlFor="admin-status">
                      {view === "meetings"
                        ? "Booking status"
                        : view === "activity"
                          ? "Event type"
                          : "Email state"}
                    </label>
                    <select
                      id="admin-status"
                      name="status"
                      defaultValue={data.status}
                    >
                      <option value="">
                        All {view === "activity" ? "events" : "states"}
                      </option>
                      {data.statusOptions.map((state) => (
                        <option value={state} key={state}>
                          {view === "meetings" || view === "activity"
                            ? eventLabel(state)
                            : labels[state] || state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label htmlFor="admin-sort">Order</label>
                    <select
                      id="admin-sort"
                      name="sort"
                      defaultValue={data.sort}
                    >
                      {data.sortOptions.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className={styles.filterButton} type="submit">
                    Filter
                  </button>
                  {data.q || data.status || data.sort !== "newest" ? (
                    <a className={styles.clearLink} href={definition.href}>
                      Clear filters
                    </a>
                  ) : null}
                </AdminFilterForm>
                {data.rows.length ? (
                  <RecordsTable
                    view={view}
                    rows={data.rows}
                    detailHref={(id) => href(data.page, id)}
                  />
                ) : (
                  <Empty
                    icon={view}
                    title={
                      data.q || data.status
                        ? `No matching ${definition.label.toLowerCase()}`
                        : `No ${definition.label.toLowerCase()} yet`
                    }
                    description={
                      data.q || data.status
                        ? "Try a different search or clear your filters."
                        : "Records will appear here as the platform processes requests."
                    }
                  />
                )}
                <nav
                  className={styles.pagination}
                  aria-label={`${definition.label} pages`}
                >
                  <span>
                    {data.total
                      ? `${(data.page - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(data.page * ADMIN_PAGE_SIZE, data.total)} of ${data.total}`
                      : "0 records"}
                  </span>
                  <div>
                    {data.page > 1 ? (
                      <Link href={href(data.page - 1)}>← Previous</Link>
                    ) : null}
                    <span>Page {data.page}</span>
                    {data.page * ADMIN_PAGE_SIZE < data.total ? (
                      <Link href={href(data.page + 1)}>Next →</Link>
                    ) : null}
                  </div>
                </nav>
              </section>
              {view === "emails" ? (
                <p className={styles.explanation}>
                  “Accepted” means the provider accepted the email. “Delivered”
                  requires a verified delivery event. Emails are dispatched
                  automatically each hour.
                </p>
              ) : null}
            </>
          )}
          <footer className={styles.footer}>
            <span>© 2026 Influence Rock</span>
            <span>Administrative workspace · Automatic processing</span>
          </footer>
        </section>
      </div>
    </div>
  );
}
