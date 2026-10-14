import type { Draft } from "@/lib/server/pipeline-store";
import type { WorkspaceData } from "@/lib/server/admin-workspace";
import { adminDate, eventLabel } from "@/lib/admin-views";
import styles from "./admin.module.css";
const fieldLabels: Record<string, string> = {
  name: "Requester",
  email: "Email address",
  organization: "Organization",
  jurisdictions: "Regions",
  timeframe: "Timeframe",
  expertise: "Expertise",
  objective: "Proposal / agenda",
  profileId: "Delegate ID",
  consent: "Consent",
};
export function RequestDetail({
  detail,
}: {
  detail: NonNullable<WorkspaceData["detail"]>;
}) {
  return (
    <article className={styles.card}>
      <h2>Request details</h2>
      <p>{detail.id}</p>
      <p>
        <strong>{String(detail.sender.name)}</strong> ·{" "}
        {String(detail.sender.email)}
        <br />
        Received: {adminDate(detail.created_at)} IST
      </p>
      <dl>
        {Object.entries(detail.payload).map(([key, value]) => (
          <div key={key}>
            <dt>{fieldLabels[key] || eventLabel(key)}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
      {detail.meeting && (
        <>
          <h3>Current meeting</h3>
          <p>
            {detail.meeting.title} · {detail.meeting.bookingStatus} · Session:{" "}
            {detail.meeting.sessionStatus}
          </p>
          <p>
            {adminDate(detail.meeting.startsAt)} IST · Original timezone:{" "}
            {detail.meeting.timezone}
          </p>
          <a href={detail.meeting.meetingUrl} rel="noreferrer">
            Open private meeting details
          </a>
        </>
      )}
      <h3>Prepared emails</h3>
      {detail.notifications.map((n) => {
        const draft = n.content
          ? (JSON.parse(String(n.content)) as Draft)
          : undefined;
        return (
          <div id={`email-${n.id}`} key={String(n.id)} className={styles.draft}>
            <h4>
              {String(n.kind)} · {String(n.status)}
            </h4>
            <p>
              Due: {adminDate(n.due_at)} · Provider reference:{" "}
              {String(n.provider_id || "Awaiting acceptance")}
            </p>
            {draft ? (
              <>
                <p>
                  Preparation: {draft.mode} · Research:{" "}
                  {adminDate(draft.researchedAt)} IST
                </p>
                <p>{draft.introduction}</p>
                <ul>
                  {draft.insights.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
                <h4>Discussion topics</h4>
                <ul>
                  {draft.discussionTopics.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
                {draft.sources.map((s, i) => (
                  <p key={i}>
                    <a href={s.url} rel="noreferrer" target="_blank">
                      {s.title}
                    </a>
                  </p>
                ))}
                <p>
                  Please do not reply to this email. Please bring any questions
                  or additional information to the meeting.
                </p>
                {n.message ? (
                  <details>
                    <summary>Exact outbound email</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(JSON.parse(String(n.message)), null, 2)}
                    </pre>
                  </details>
                ) : null}
              </>
            ) : (
              <p>Preparation pending.</p>
            )}
          </div>
        );
      })}
      <h3>Activity history</h3>
      <ol>
        {detail.events.map((e) => (
          <li key={String(e.id)}>
            {adminDate(e.created_at)} · {String(e.kind)}{" "}
            <small>{String(e.details)}</small>
          </li>
        ))}
      </ol>
    </article>
  );
}
