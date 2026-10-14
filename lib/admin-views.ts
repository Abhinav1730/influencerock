export const adminViews = {
  dashboard: {
    label: "Dashboard",
    href: "/",
    description: "A clear view of your network, conversations and delivery.",
  },
  proposals: {
    label: "Proposals",
    href: "/proposals",
    description: "Follow incoming proposals and the delegates receiving them.",
  },
  meetings: {
    label: "Meetings",
    href: "/meetings",
    description:
      "Scheduled conversations, booking status and meeting outcomes.",
  },
  emails: {
    label: "Emails",
    href: "/emails",
    description: "Follow every delegate email from preparation to delivery.",
  },
  activity: {
    label: "Activity",
    href: "/activity",
    description:
      "Worker heartbeats and a chronological record of platform events.",
  },
} as const;
export type AdminView = keyof typeof adminViews;
export const emailStates = [
  "pending",
  "preparing",
  "ready",
  "sending",
  "accepted",
  "delivered",
  "bounced",
  "complained",
  "failed",
  "superseded",
  "uncertain",
];
export function adminDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(typeof value === "number" ? value : String(value));
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(date)
    : "—";
}
export function eventLabel(value: string): string {
  return value
    .replace(/[._-]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export const adminSortOptions = {
  dashboard: [],
  proposals: [
    { value: "newest", label: "Newest received first" },
    { value: "oldest", label: "Oldest received first" },
  ],
  meetings: [
    { value: "newest", label: "Newest booked first" },
    { value: "oldest", label: "Oldest booked first" },
    { value: "schedule_asc", label: "Scheduled date: earliest first" },
    { value: "schedule_desc", label: "Scheduled date: latest first" },
  ],
  emails: [
    { value: "newest", label: "Newest request first" },
    { value: "oldest", label: "Oldest request first" },
    { value: "due_asc", label: "Due date: earliest first" },
    { value: "due_desc", label: "Due date: latest first" },
  ],
  activity: [
    { value: "newest", label: "Newest event first" },
    { value: "oldest", label: "Oldest event first" },
  ],
} as const;
