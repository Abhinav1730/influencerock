import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  PipelineStore,
  type Draft,
  type QueueRecord,
  type Meeting,
} from "./pipeline-store";
import { profiles } from "../profiles";

export type ResearchInput = {
  topic: string;
  objective: string;
  delegate: { name: string; expertise: string; country: string; bio: string };
};
export function researchInput(
  store: PipelineStore,
  job: QueueRecord,
): ResearchInput {
  const request = store.request(job.request_id)!;
  const payload = JSON.parse(request.payload);
  const meeting = request.meeting_id
    ? store.meeting(request.meeting_id)
    : undefined;
  const profile = profiles.find((p) => p.id === payload.profileId);
  return {
    topic: meeting?.title || payload.title || "Consultation request",
    objective: meeting?.agenda || payload.objective,
    delegate: profile
      ? {
          name: profile.name,
          expertise: profile.expertise,
          country: profile.country,
          bio: profile.bio,
        }
      : {
          name: "Influence Rock",
          expertise: "Strategic access and market entry",
          country: "Global",
          bio: "Influence Rock AI representative",
        },
  };
}
export function validateDraft(value: unknown): Draft {
  const v = value as Draft;
  const text = (x: unknown, max: number) =>
    typeof x === "string" && x.trim().length > 0 && x.length <= max;
  if (
    !v ||
    !text(v.introduction, 2000) ||
    !Array.isArray(v.insights) ||
    !Array.isArray(v.discussionTopics) ||
    !Array.isArray(v.sources) ||
    v.insights.length > 5 ||
    v.discussionTopics.length < 1 ||
    v.discussionTopics.length > 5 ||
    v.sources.length > 5 ||
    !v.insights.every((x) => text(x, 1200)) ||
    !v.discussionTopics.every((x) => text(x, 500))
  )
    throw new Error("Invalid research draft");
  for (const source of v.sources) {
    if (!source || !text(source.title, 300) || !text(source.url, 1500))
      throw new Error("Invalid research source");
    const url = new URL(source.url);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("Invalid research source URL");
  }
  return {
    introduction: v.introduction.trim(),
    insights: v.insights,
    discussionTopics: v.discussionTopics,
    sources: v.sources,
    evidence: v.evidence,
    mode: "hermes",
    researchedAt: new Date().toISOString(),
  };
}
export async function hermesResearch(input: ResearchInput): Promise<Draft> {
  const python =
    process.env.IR_HERMES_PYTHON ||
    "/usr/local/lib/hermes-agent/venv/bin/python";
  const script = path.join(process.cwd(), "scripts", "hermes-research.py");
  return new Promise((resolve, reject) => {
    // No shell and no untrusted argv. Requester email and private meeting links never enter the model prompt.
    const child = spawn(python, [script], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
      env: {
        NODE_ENV: "production",
        PATH: "/usr/local/bin:/usr/bin:/bin",
        LANG: "C.UTF-8",
        HERMES_HOME:
          process.env.IR_HERMES_HOME || "/var/lib/influencerock-agent",
        IR_HERMES_MODEL: process.env.IR_HERMES_MODEL || "gpt-5.6-sol",
        PYTHONUNBUFFERED: "1",
        PYTHONPATH: `${process.env.IR_HERMES_HOME || "/var/lib/influencerock-agent"}/python:/usr/local/lib/hermes-agent`,
      },
    });
    let output = "",
      size = 0,
      settled = false;
    const stop = () => {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {}
    };
    const timer = setTimeout(() => {
      stop();
      finish(new Error("Research timed out"));
    }, 240_000);
    const finish = (error?: Error, draft?: Draft) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(draft!);
    };
    child.stdout.on("data", (data: Buffer) => {
      size += data.length;
      if (size > 128_000) {
        stop();
        finish(new Error("Research output exceeded limit"));
      } else output += data.toString();
    });
    // Discard stderr: provider diagnostics can contain request context or credential details.
    child.stderr.resume();
    child.on("error", () => finish(new Error("Research process unavailable")));
    child.stdin.on("error", () => {});
    child.on("close", (code) => {
      if (code !== 0) {
        finish(new Error("Research process failed"));
        return;
      }
      try {
        const line = output
          .split("\n")
          .findLast((x) => x.startsWith("IR_DRAFT:"));
        if (!line) throw new Error("Research returned no draft");
        finish(undefined, validateDraft(JSON.parse(line.slice(9))));
      } catch {
        finish(new Error("Research returned an invalid draft"));
      }
    });
    child.stdin.end(JSON.stringify(input));
  });
}
export function fallbackDraft(input: ResearchInput, now = Date.now()): Draft {
  return {
    introduction:
      "Thank you for sharing your request. Your selected AI representative can use your objective to guide the discussion.",
    insights: [],
    discussionTopics: [
      `Clarify your objective: ${input.objective.slice(0, 350)}`,
      `Explore relevant questions and next steps with ${input.delegate.name}.`,
    ],
    sources: [],
    mode: "fallback",
    researchedAt: new Date(now).toISOString(),
  };
}
export async function prepareOne(
  store: PipelineStore,
  research = hermesResearch,
  now = Date.now(),
): Promise<boolean> {
  const job = store.claim("prepare", now);
  if (!job) return false;
  const input = researchInput(store, job);
  try {
    const draft = validateDraft(await research(input));
    store.finish(job, "ready", { content: draft }, now);
  } catch {
    if (job.prep_attempts >= 3)
      store.finish(
        job,
        "ready",
        {
          content: fallbackDraft(input, now),
          error: "Research unavailable; factual acknowledgement prepared",
        },
        now,
      );
    else
      store.finish(
        job,
        "pending",
        {
          error: "Research unavailable; retry scheduled",
          nextAt: now + 30_000 * 2 ** job.prep_attempts,
        },
        now,
      );
  }
  return true;
}
function relevant(meeting: Meeting, job: QueueRecord, now: number) {
  if (meeting.revision !== job.revision) return false;
  if (["confirmed", "reminder"].includes(job.kind))
    return (
      meeting.bookingStatus === "confirmed" &&
      meeting.sessionStatus !== "ended" &&
      Date.parse(meeting.startsAt) + 3600_000 > now
    );
  if (job.kind === "proposal") return meeting.bookingStatus === "pending";
  return meeting.bookingStatus === job.kind;
}
export async function verifyMeeting(meeting: Meeting): Promise<Meeting> {
  const origin = process.env.IR_SMARTMEET_API_URL;
  const key = process.env.SMARTMEET_BRIDGE_KEY;
  if (!origin || !key) throw new Error("Booking status bridge is unavailable");
  const response = await fetch(
    `${origin.replace(/\/$/, "")}/api/smartmeet/internal/rooms/${encodeURIComponent(meeting.id)}`,
    {
      headers: { "X-SmartMeet-Bridge-Key": key },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Booking status could not be verified");
  const data = await response.json();
  if (data.meeting?.id !== meeting.id)
    throw new Error("Booking status mismatch");
  return data.meeting;
}
export function composeMessage(
  store: PipelineStore,
  job: QueueRecord,
  meeting?: Meeting,
) {
  const payload = JSON.parse(store.request(job.request_id)!.payload);
  const sender = store.sender(payload.profileId || "");
  const draft = JSON.parse(job.content!) as Draft;
  const meetingLabels: Record<string, string> = {
    confirmed: meeting?.platformConfirmation
      ? "About our meeting"
      : "Meeting confirmed",
    reminder: "Meeting reminder",
    proposal: "Meeting proposal received",
    cancelled: "Meeting cancelled",
    declined: "Meeting declined",
    expired: "Meeting request expired",
  };
  const label = meeting
    ? meetingLabels[job.kind] || "Meeting update"
    : "Proposal received";
  // Limit legacy drafts too: reducing the prompt alone would leave queued emails verbose.
  const brief = (text: string, words: number) => {
    const parts = text.trim().split(/\s+/);
    return parts.length <= words
      ? parts.join(" ")
      : parts
          .slice(0, words)
          .join(" ")
          .replace(/[,.!?;:]+$/, "") + "…";
  };
  const title = brief(
    meeting?.title || payload.objective || "Your proposal",
    14,
  );
  const name = brief(payload.name, 3);
  const lines = [`Hi ${name},`, ""];
  if (meeting) {
    const acknowledgements: Record<string, string> = {
      confirmed: meeting.platformConfirmation
        ? "Thanks for booking a chat about"
        : "Your meeting is confirmed",
      reminder: "A quick reminder about your meeting",
      proposal: "Your meeting request is received",
      cancelled: "Your meeting is cancelled",
      declined: "Your meeting request was declined",
      expired: "Your meeting request has expired",
    };
    lines.push(`${acknowledgements[job.kind] || label}: ${title}.`);
    if (
      ["reminder", "proposal"].includes(job.kind) ||
      (job.kind === "confirmed" && !meeting.platformConfirmation)
    ) {
      const format = new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: meeting.timezone,
      });
      const duration = Math.round(
        (Date.parse(meeting.endsAt) - Date.parse(meeting.startsAt)) / 60_000,
      );
      lines.push(
        `${format.format(new Date(meeting.startsAt))} (${["Asia/Kolkata", "Asia/Calcutta"].includes(meeting.timezone) ? "IST" : meeting.timezone}) · ${duration} minutes`,
        `${job.kind === "proposal" ? "Details" : "Join"}: ${meeting.meetingUrl}`,
      );
    }
  } else {
    lines.push(
      "Thanks for your proposal. A meeting has not been scheduled yet.",
    );
  }
  if (!meeting || ["confirmed", "reminder", "proposal"].includes(job.kind)) {
    // Background must keep its citation; the detailed research stays in the admin record.
    const insight = draft.insights[0]?.trim();
    if (insight && draft.sources.length && insight.split(/\s+/).length <= 22)
      lines.push("", insight);
    lines.push("", brief(draft.discussionTopics[0], 18));
    if (draft.sources.length) lines.push(`Reading: ${draft.sources[0].url}`);
  }
  lines.push(
    "",
    "Please do not reply to this email. Bring your questions to the meeting.",
    "",
    `${sender.name} · Influence Rock AI representative`,
  );
  return {
    from: `${sender.name.replace(/[\r\n<>]/g, " ")} <${sender.email}>`,
    to: [payload.email],
    subject: `${sender.name} — ${label}: ${title}`
      .replace(/[\r\n]/g, " ")
      .slice(0, 250),
    text: lines.join("\n"),
    tags: [{ name: "pipeline", value: "delegate-v1" }],
  };
}
export interface SendResult {
  id: string;
}
export async function resendSend(
  message: ReturnType<typeof composeMessage>,
  key: string,
): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY)
    throw new Error("Email provider unavailable");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(`Email provider rejected request (${response.status})`);
  const body = await response.json();
  if (typeof body.id !== "string" || !body.id)
    throw new Error("Email provider response unavailable");
  return { id: body.id };
}
export async function sendOne(
  store: PipelineStore,
  send = resendSend,
  verify = verifyMeeting,
  now = Date.now(),
): Promise<boolean> {
  const job = store.claim("send", now);
  if (!job) return false;
  // Resend keys expire after 24h. Do not blindly resend an ambiguous attempt beyond that window.
  if (job.first_send_at !== null && now - job.first_send_at >= 23 * 3600_000) {
    store.finish(
      job,
      "uncertain",
      {
        error:
          "Provider acceptance could not be resolved within the idempotency window",
      },
      now,
    );
    return true;
  }
  try {
    const request = store.request(job.request_id)!;
    let meeting = request.meeting_id
      ? store.meeting(request.meeting_id)
      : undefined;
    if (meeting) {
      meeting = await verify(meeting);
      store.ingestMeeting(meeting, [], now);
      if (!relevant(meeting, job, now)) {
        store.finish(job, "superseded", {}, now);
        return true;
      }
    }
    if (send === resendSend && !process.env.RESEND_API_KEY)
      throw new Error("Email provider unavailable");
    const message = job.message
      ? JSON.parse(job.message)
      : composeMessage(store, job, meeting);
    if (!store.markSendStarted(job, message, now)) return true;
    const result = await send(message, `ir-delegate-${job.id}`);
    store.finish(job, "accepted", { providerId: result.id }, now);
  } catch {
    store.finish(
      job,
      "ready",
      {
        error: "Delivery attempt unavailable; retry scheduled",
        nextAt:
          now +
          Math.min(
            3600_000 * 2 ** Math.min(job.send_attempts - 1, 3),
            8 * 3600_000,
          ),
      },
      now,
    );
  }
  return true;
}
