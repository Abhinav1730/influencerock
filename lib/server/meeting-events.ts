import "server-only";
import { profiles } from "../profiles";
import type { Meeting, MeetingNotification } from "./pipeline-store";

export function validateMeetingEvent(value: unknown): {
  meeting: Meeting;
  notifications: MeetingNotification[];
} {
  const body = value as {
    meeting: Meeting;
    notifications: MeetingNotification[];
  };
  const m = body?.meeting;
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.length <= max;
  if (
    !m ||
    !/^sm_[a-f0-9-]{36}$/.test(m.id) ||
    !profiles.some((p) => p.id === m.delegateId) ||
    !str(m.organizerName, 120) ||
    !str(m.organizerEmail, 254) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.organizerEmail) ||
    !str(m.title, 200) ||
    !m.title ||
    !str(m.agenda, 5000) ||
    !str(m.meetingUrl, 2000) ||
    !Number.isInteger(m.revision) ||
    m.revision < 1 ||
    !["pending", "confirmed", "declined", "cancelled", "expired"].includes(
      m.bookingStatus,
    ) ||
    ![
      "idle",
      "provisioning",
      "uncertain",
      "active",
      "ending",
      "ended",
    ].includes(m.sessionStatus) ||
    (m.platformConfirmation !== undefined &&
      typeof m.platformConfirmation !== "boolean") ||
    !str(m.resultStatus, 30)
  )
    throw new Error("Invalid meeting event");
  if (
    !Number.isFinite(Date.parse(m.startsAt)) ||
    !Number.isFinite(Date.parse(m.endsAt)) ||
    Date.parse(m.endsAt) <= Date.parse(m.startsAt)
  )
    throw new Error("Invalid meeting time");
  new Intl.DateTimeFormat("en", { timeZone: m.timezone });
  const url = new URL(m.meetingUrl);
  const origin = new URL(process.env.SMARTMEET_URL || "https://smartmeet.org");
  if (
    url.origin !== origin.origin ||
    url.pathname !== `/meeting/${m.id}` ||
    url.username ||
    url.password ||
    !/^#access=[A-Za-z0-9_-]{20,100}$/.test(url.hash)
  )
    throw new Error("Invalid private meeting link");
  if (!Array.isArray(body.notifications) || body.notifications.length > 100)
    throw new Error("Invalid notifications");
  const notifications = body.notifications.map((n) => {
    if (
      !n ||
      !/^[a-f0-9-]{36}$/.test(n.id) ||
      ![
        "proposal",
        "confirmed",
        "reminder",
        "cancelled",
        "declined",
        "expired",
      ].includes(n.kind) ||
      !Number.isInteger(n.revision) ||
      n.revision < 1 ||
      n.revision > m.revision ||
      !Number.isFinite(Date.parse(n.dueAt))
    )
      throw new Error("Invalid notification");
    return { id: n.id, kind: n.kind, revision: n.revision, dueAt: n.dueAt };
  });
  return {
    meeting: {
      id: m.id,
      delegateId: m.delegateId,
      organizerName: m.organizerName,
      organizerEmail: m.organizerEmail,
      title: m.title,
      agenda: m.agenda,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      timezone: m.timezone,
      bookingStatus: m.bookingStatus,
      sessionStatus: m.sessionStatus,
      revision: m.revision,
      meetingUrl: m.meetingUrl,
      resultStatus: m.resultStatus,
      ...(m.platformConfirmation === true
        ? { platformConfirmation: true }
        : {}),
    },
    notifications,
  };
}
