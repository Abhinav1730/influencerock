import "server-only";
import {
  createHash,
  createPublicKey,
  verify,
  type KeyObject,
} from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { profiles, networkStats } from "../profiles";

const CAPABILITY = "overview:read";
const CAPABILITIES = [CAPABILITY];
const RECORDS_CAPABILITY = "records:read";
const SECTIONS = [
  "opportunities",
  "organizations",
  "delegates",
  "introductions",
  "contracts",
  "funding",
  "activity",
] as const;
type Section = (typeof SECTIONS)[number];
const DETAILS_CAPABILITY = "details:read";
type Capability =
  typeof CAPABILITY | typeof RECORDS_CAPABILITY | typeof DETAILS_CAPABILITY;
// Each aggregate returns one row; the preflight also bounds the rows scanned.
const MAX_SOURCE_ROWS = 100_000;
const directoryRevision = createHash("sha256")
  .update(JSON.stringify(profiles))
  .digest("hex");
type Environment = Record<string, string | undefined>;
type Delegation = {
  issuer: string;
  subject: string;
  expires: number;
};
type Metric = { id: string; label: string; value: number; unit: string };
class AdminReadError extends Error {
  constructor(readonly status: number) {
    super("Administrative access denied");
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function trustKeys(env: Environment) {
  try {
    const raw = env.ADMIN_DELEGATION_KEYS || "{}";
    if (raw.length > 65_536) throw new Error();
    const parsed: unknown = JSON.parse(raw);
    if (
      !object(parsed) ||
      Object.keys(parsed).length < 1 ||
      Object.keys(parsed).length > 8
    )
      throw new Error();
    const keys = new Map<string, KeyObject>();
    for (const [issuer, pem] of Object.entries(parsed)) {
      const url = new URL(issuer);
      if (
        issuer.length > 2048 ||
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        typeof pem !== "string" ||
        pem.length > 4096 ||
        !pem.startsWith("-----BEGIN PUBLIC KEY-----")
      )
        throw new Error();
      const key = createPublicKey({ key: pem, format: "pem", type: "spki" });
      if (key.asymmetricKeyType !== "ed25519") throw new Error();
      keys.set(issuer, key);
    }
    const audience = env.ADMIN_DELEGATION_AUDIENCE || "ir-admin";
    if (!audience || audience.length > 255) throw new Error();
    return { keys, audience };
  } catch {
    throw new AdminReadError(503);
  }
}
function decodeSegment(segment: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error();
  const bytes = Buffer.from(segment, "base64url");
  if (bytes.toString("base64url") !== segment) throw new Error();
  return JSON.parse(bytes.toString("utf8"));
}
function delegation(
  token: string,
  env: Environment,
  now: number,
  capability: Capability,
): Delegation {
  const { keys, audience } = trustKeys(env);
  try {
    if (token.length > 8192) throw new Error();
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error();
    const header = decodeSegment(parts[0]);
    const claims = decodeSegment(parts[1]);
    if (
      !object(header) ||
      !object(claims) ||
      header.alg !== "EdDSA" ||
      header.typ !== "admin-delegation+jwt" ||
      header.crit !== undefined ||
      header.b64 !== undefined
    )
      throw new Error();
    const issuer = claims.iss;
    const key = typeof issuer === "string" ? keys.get(issuer) : undefined;
    if (!key || !/^[A-Za-z0-9_-]+$/.test(parts[2])) throw new Error();
    const signature = Buffer.from(parts[2], "base64url");
    if (
      signature.length !== 64 ||
      signature.toString("base64url") !== parts[2] ||
      !verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), key, signature)
    )
      throw new Error();
    const actor = claims.actor;
    const aud = claims.aud;
    const second = Math.floor(now / 1000);
    if (
      !(
        aud === audience ||
        (Array.isArray(aud) &&
          aud.every((v) => typeof v === "string") &&
          aud.includes(audience))
      ) ||
      claims.product !== "ir" ||
      claims.capability !== capability ||
      !Number.isSafeInteger(claims.grantVersion) ||
      Number(claims.grantVersion) < 1 ||
      typeof claims.sub !== "string" ||
      !claims.sub ||
      claims.sub.length > 255 ||
      !object(actor) ||
      typeof actor.issuer !== "string" ||
      !actor.issuer ||
      actor.issuer.length > 2048 ||
      actor.subject !== claims.sub ||
      !Number.isSafeInteger(claims.iat) ||
      !Number.isSafeInteger(claims.exp) ||
      Number(claims.iat) > second ||
      second - Number(claims.iat) > 90 ||
      Number(claims.exp) <= second ||
      Number(claims.exp) <= Number(claims.iat) ||
      Number(claims.exp) - Number(claims.iat) > 90 ||
      (claims.nbf !== undefined &&
        (!Number.isSafeInteger(claims.nbf) || Number(claims.nbf) > second))
    )
      throw new Error();
    new URL(actor.issuer as string);
    return {
      issuer: actor.issuer as string,
      subject: claims.sub,
      expires: Number(claims.exp) * 1000,
    };
  } catch {
    throw new AdminReadError(401);
  }
}

/** Never creates pipeline tables, sender assignments, or operator grants. */
export function initializeAdminConnection(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS admin_grants (
    issuer TEXT NOT NULL, subject TEXT NOT NULL, capability TEXT NOT NULL,
    grant_version INTEGER NOT NULL CHECK(grant_version > 0),
    revoked_at INTEGER, expires_at INTEGER,
    PRIMARY KEY(issuer,subject,capability)
  );`);
  const auditSchema = `CREATE TABLE IF NOT EXISTS admin_read_audit (
    id INTEGER PRIMARY KEY, actor_hash TEXT NOT NULL,
    capability TEXT NOT NULL, resource TEXT NOT NULL CHECK(resource IN ('overview','capabilities','opportunities','organizations','delegates','introductions','contracts','funding','activity')),
    outcome TEXT NOT NULL CHECK(outcome IN ('allowed','denied')),
    source_revision TEXT, created_at INTEGER NOT NULL
  )`;
  db.exec(auditSchema);
  const current = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='admin_read_audit'",
    )
    .get()!;
  if (SECTIONS.every((section) => String(current.sql).includes(`'${section}'`)))
    return;
  // SQLite cannot alter a CHECK. Copy within one write transaction, retaining
  // historical audit IDs and re-creating source-owned indexes and triggers.
  db.exec("SAVEPOINT admin_connection_migration");
  try {
    const objects = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE tbl_name='admin_read_audit' AND type IN ('index','trigger') AND sql IS NOT NULL",
      )
      .all();
    db.exec(auditSchema.replace("admin_read_audit", "admin_read_audit_v2"));
    db.exec(`INSERT INTO admin_read_audit_v2(id,actor_hash,capability,resource,outcome,source_revision,created_at)
      SELECT id,actor_hash,capability,resource,outcome,source_revision,created_at FROM admin_read_audit;
      DROP TABLE admin_read_audit;
      ALTER TABLE admin_read_audit_v2 RENAME TO admin_read_audit;`);
    for (const item of objects) db.exec(String(item.sql));
    db.exec("RELEASE admin_connection_migration");
  } catch (error) {
    db.exec(
      "ROLLBACK TO admin_connection_migration; RELEASE admin_connection_migration",
    );
    throw error;
  }
}
function bound(
  db: DatabaseSync,
  actor: Delegation,
  now: number,
  capability: Capability,
) {
  return !!db
    .prepare(
      `SELECT 1 FROM admin_grants WHERE issuer=? AND subject=? AND capability=?
    AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?) LIMIT 1`,
    )
    .get(actor.issuer, actor.subject, capability, now);
}
function count(db: DatabaseSync, sql: string, ...params: SQLInputValue[]) {
  const value = Number(db.prepare(sql).get(...params)!.n);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid aggregate");
  return value;
}
function overview(db: DatabaseSync, now: Date) {
  // Names are source-owned constants. No URL/query/filter ever reaches SQLite.
  for (const table of ["requests", "meetings", "notifications", "events"]) {
    if (
      count(
        db,
        `SELECT count(*) AS n FROM (SELECT 1 FROM ${table} LIMIT ${MAX_SOURCE_ROWS + 1})`,
      ) > MAX_SOURCE_ROWS
    )
      throw new Error("Aggregate source limit exceeded");
  }
  const request = db
    .prepare(
      "SELECT count(*) AS total,coalesce(sum(meeting_id IS NULL),0) AS proposals,max(created_at) AS observed FROM requests",
    )
    .get()!;
  const meeting = db
    .prepare(
      `SELECT count(*) AS total,
    coalesce(sum(julianday(json_extract(snapshot,'$.startsAt'))>julianday(?) AND json_extract(snapshot,'$.bookingStatus') IN ('pending','confirmed')),0) AS upcoming,
    coalesce(sum(json_extract(snapshot,'$.bookingStatus')='confirmed'),0) AS confirmed,
    coalesce(sum(json_extract(snapshot,'$.sessionStatus')='active'),0) AS active,
    coalesce(sum(json_extract(snapshot,'$.sessionStatus')='ended'),0) AS ended,max(updated_at) AS observed FROM meetings`,
    )
    .get(now.toISOString())!;
  const email = db
    .prepare(
      `SELECT count(*) AS total,
    coalesce(sum(status IN ('pending','preparing','ready','sending')),0) AS queued,
    coalesce(sum(status='delivered'),0) AS delivered,
    coalesce(sum(status IN ('failed','bounced','complained','uncertain')),0) AS attention FROM notifications`,
    )
    .get()!;
  const event = db
    .prepare("SELECT count(*) AS total,max(created_at) AS observed FROM events")
    .get()!;
  const metrics: Metric[] = [
    ["requests", "Requests", request.total],
    ["proposals", "Proposals", request.proposals],
    ["meetings", "Meetings", meeting.total],
    ["meetings_upcoming", "Upcoming meetings", meeting.upcoming],
    ["meetings_confirmed", "Confirmed bookings", meeting.confirmed],
    ["meetings_active", "Active sessions", meeting.active],
    ["meetings_ended", "Ended sessions", meeting.ended],
    ["emails", "Emails", email.total],
    ["emails_queued", "Queued emails", email.queued],
    ["emails_delivered", "Delivered emails", email.delivered],
    ["emails_attention", "Emails needing attention", email.attention],
    ["events", "Pipeline events", event.total],
    ["directory_profiles", "Directory profiles", profiles.length],
    ["directory_countries", "Directory countries", networkStats.countries],
  ].map(([id, label, value]) => {
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric) || numeric < 0)
      throw new Error("Invalid aggregate");
    return {
      id: String(id),
      label: String(label),
      value: numeric,
      unit: "count",
    };
  });
  const timestamps = [request.observed, meeting.observed, event.observed]
    .filter((value) => value !== null)
    .map(Number);
  if (
    timestamps.some(
      (value) =>
        !Number.isSafeInteger(value) || value < 0 || value > now.getTime(),
    )
  )
    throw new Error("Invalid source timestamp");
  const lastMutationAt = timestamps.length
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;
  const sourceRevision = `sha256:${createHash("sha256").update(JSON.stringify({ metrics, lastMutationAt, directoryRevision })).digest("hex")}`;
  return {
    schemaVersion: 1,
    product: "ir",
    sourceRevision,
    observedAt: now.toISOString(),
    fetchedAt: now.toISOString(),
    state: "connected",
    metrics,
    capabilities: CAPABILITIES,
  };
}
type RecordRow = Record<string, string | number | null>;
const sectionLabels: Record<
  Section,
  { title: string; description: string; fields: [string, string][] }
> = {
  opportunities: {
    title: "Opportunities",
    description: "Live consultation requests from the Influence Rock pipeline.",
    fields: [
      ["reference", "Reference"],
      ["organization", "Organization"],
      ["expertise", "Expertise"],
      ["jurisdictions", "Jurisdictions"],
      ["timeframe", "Timeframe"],
      ["status", "Request status"],
      ["createdAt", "Created"],
    ],
  },
  organizations: {
    title: "Organizations",
    description:
      "Organization names supplied on consultation requests, grouped by exact name; this is not a verified organization registry.",
    fields: [
      ["organization", "Organization from request"],
      ["requests", "Requests"],
      ["lastRequestAt", "Latest request"],
    ],
  },
  delegates: {
    title: "Delegates",
    description: "Public profiles in the deployed Influence Rock directory.",
    fields: [
      ["name", "Name"],
      ["title", "Role"],
      ["representation", "Representation"],
      ["country", "Country"],
      ["city", "City"],
      ["region", "Region"],
      ["expertise", "Expertise"],
      ["industry", "Industry"],
      ["seniority", "Network role"],
    ],
  },
  introductions: {
    title: "Introductions",
    description:
      "Actual meeting bookings and session schedules from the Influence Rock pipeline.",
    fields: [
      ["reference", "Reference"],
      ["bookingStatus", "Booking status"],
      ["sessionStatus", "Session status"],
      ["resultStatus", "Result status"],
      ["startsAt", "Starts"],
      ["endsAt", "Ends"],
      ["timezone", "Timezone"],
      ["updatedAt", "Updated"],
    ],
  },
  activity: {
    title: "Activity",
    description:
      "Actual pipeline event kinds and timestamps. Event details are private.",
    fields: [
      ["kind", "Event kind"],
      ["createdAt", "Recorded"],
    ],
  },
  contracts: {
    title: "Contracts",
    description: "Contract records in the Influence Rock source.",
    fields: [],
  },
  funding: {
    title: "Funding",
    description: "Funding records in the Influence Rock source.",
    fields: [],
  },
};
// These SQL expressions and table names are all source-owned constants. Search
// values, limits and offsets are bound; queries never search private JSON fields.
const safeRequestProjection = `SELECT id AS _id,
  CASE WHEN json_type(payload,'$.organization')='text' THEN substr(json_extract(payload,'$.organization'),1,300) END AS organization,
  CASE WHEN json_type(payload,'$.expertise')='text' THEN substr(json_extract(payload,'$.expertise'),1,300) END AS expertise,
  CASE WHEN json_type(payload,'$.jurisdictions')='text' THEN substr(json_extract(payload,'$.jurisdictions'),1,300) END AS jurisdictions,
  CASE WHEN json_type(payload,'$.timeframe')='text' THEN substr(json_extract(payload,'$.timeframe'),1,300) END AS timeframe,
  CASE WHEN meeting_id IS NULL THEN 'proposal' ELSE 'meeting linked' END AS status,
  created_at AS createdAt FROM requests`;
const safeMeetingProjection = `SELECT id AS _id,
  CASE WHEN json_type(snapshot,'$.bookingStatus')='text' THEN substr(json_extract(snapshot,'$.bookingStatus'),1,300) END AS bookingStatus,
  CASE WHEN json_type(snapshot,'$.sessionStatus')='text' THEN substr(json_extract(snapshot,'$.sessionStatus'),1,300) END AS sessionStatus,
  CASE WHEN json_type(snapshot,'$.resultStatus')='text' THEN substr(json_extract(snapshot,'$.resultStatus'),1,300) END AS resultStatus,
  CASE WHEN json_type(snapshot,'$.startsAt')='text' THEN substr(json_extract(snapshot,'$.startsAt'),1,300) END AS startsAt,
  CASE WHEN json_type(snapshot,'$.endsAt')='text' THEN substr(json_extract(snapshot,'$.endsAt'),1,300) END AS endsAt,
  CASE WHEN json_type(snapshot,'$.timezone')='text' THEN substr(json_extract(snapshot,'$.timezone'),1,300) END AS timezone,
  updated_at AS updatedAt FROM meetings`;
const sectionSQL = {
  opportunities: {
    projection: safeRequestProjection,
    searchable: [
      "organization",
      "expertise",
      "jurisdictions",
      "timeframe",
      "status",
    ],
    order: "createdAt DESC,_id ASC",
  },
  organizations: {
    projection: `SELECT organization,count(*) AS requests,max(createdAt) AS lastRequestAt FROM (${safeRequestProjection}) WHERE organization IS NOT NULL AND trim(organization)<>'' GROUP BY organization`,
    searchable: ["organization"],
    order:
      "lastRequestAt DESC,organization COLLATE NOCASE ASC,organization ASC",
  },
  introductions: {
    projection: safeMeetingProjection,
    searchable: [
      "bookingStatus",
      "sessionStatus",
      "resultStatus",
      "startsAt",
      "endsAt",
      "timezone",
    ],
    order: "updatedAt DESC,_id ASC",
  },
  activity: {
    projection:
      "SELECT id AS _id,substr(kind,1,300) AS kind,created_at AS createdAt FROM events",
    searchable: ["kind"],
    order: "createdAt DESC,_id DESC",
  },
} as const;
function sectionQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawPage = params.get("page") ?? "1";
  const q = params.get("q") ?? "";
  if (
    params.getAll("page").length > 1 ||
    params.getAll("q").length > 1 ||
    !/^[1-9][0-9]{0,4}$/.test(rawPage) ||
    Number(rawPage) > 20_000 ||
    q.length > 120
  )
    throw new AdminReadError(400);
  return { page: Number(rawPage), q: q.trim() };
}
function sectionRecords(
  db: DatabaseSync,
  section: Section,
  request: Request,
  now: Date,
) {
  const { page, q } = sectionQuery(request);
  const base = overview(db, now);
  const metadata = sectionLabels[section];
  const offset = (page - 1) * 50;
  let rows: RecordRow[] = [];
  let rowIds: string[] = [];
  let total: number | null = null;
  let notice: string | null = null;
  if (section === "contracts" || section === "funding") {
    notice = `Influence Rock does not currently store authoritative ${section} records. The total is unknown.`;
  } else if (section === "delegates") {
    const directory = profiles
      .map((profile) => ({
        id: opaqueId(section, profile.id),
        row: Object.fromEntries(
          metadata.fields.map(([key]) => [
            key,
            String(profile[key as keyof typeof profile] ?? "").slice(0, 300),
          ]),
        ) as RecordRow,
      }))
      .filter(({ row }) =>
        Object.values(row).join(" ").toLowerCase().includes(q.toLowerCase()),
      )
      .sort(
        (a, b) =>
          String(a.row.name).localeCompare(String(b.row.name)) ||
          JSON.stringify(a.row).localeCompare(JSON.stringify(b.row)),
      );
    total = directory.length;
    const pageRows = directory.slice(offset, offset + 50);
    rows = pageRows.map((entry) => entry.row);
    rowIds = pageRows.map((entry) => entry.id);
  } else {
    const query = sectionSQL[section];
    const searchable = query.searchable
      .map((field) => `coalesce(${field},'')`)
      .join("||' '||");
    const from = `FROM (${query.projection}) WHERE instr(lower(${searchable}),lower(?))>0`;
    total = count(db, `SELECT count(*) AS n ${from}`, q);
    rows = db
      .prepare(`SELECT * ${from} ORDER BY ${query.order} LIMIT ? OFFSET ?`)
      .all(q, 50, offset)
      .map((source) => {
        rowIds.push(
          opaqueId(
            section,
            section === "organizations" ? source.organization : source._id,
          ),
        );
        const row: RecordRow = {};
        for (const [key] of metadata.fields) {
          if (key === "reference") {
            row[key] = createHash("sha256")
              .update(JSON.stringify([section, source._id]))
              .digest("hex")
              .slice(0, 16);
            continue;
          }
          const value = source[key];
          if (
            ["createdAt", "updatedAt", "lastRequestAt"].includes(key) &&
            value !== null
          ) {
            const timestamp = Number(value);
            if (
              !Number.isSafeInteger(timestamp) ||
              timestamp < 0 ||
              timestamp > now.getTime()
            )
              throw new Error("Invalid source timestamp");
            row[key] = new Date(timestamp).toISOString();
          } else if (typeof value === "string") row[key] = value.slice(0, 300);
          else if (typeof value === "number" && Number.isFinite(value))
            row[key] = value;
          else if (value === null || value === undefined) row[key] = null;
          else throw new Error("Invalid section value");
        }
        return row;
      });
  }
  return {
    ...base,
    sourceRevision: `sha256:${createHash("sha256")
      .update(
        JSON.stringify({
          revision: base.sourceRevision,
          section,
          total,
          rows,
          rowIds,
        }),
      )
      .digest("hex")}`,
    capabilities: [RECORDS_CAPABILITY],
    section,
    title: metadata.title,
    description: metadata.description,
    columns: metadata.fields.map(([key, label]) => ({ key, label })),
    rows,
    rowIds,
    page,
    pageSize: 50,
    total,
    notice,
  };
}
// IDs are scoped to the source section. They never contain source keys or room URLs.
function opaqueId(section: string, value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify([section, String(value)]))
    .digest("hex")
    .slice(0, 32);
}
type DetailField = { label: string; value: string | number | null };
type DetailGroup = { title: string; fields: DetailField[] };
type DetailTimeline = { at: string | null; title: string; description: string };
type DetailRelated = { section: string; resourceId: string; label: string };
function detailText(value: unknown, max = 6000): string | null {
  if (typeof value !== "string") return null;
  return value
    .replace(/https?:\/\/[^\s<>]+/gi, "[link withheld]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email withheld]")
    .replace(
      /\b(?:Bearer\s+\S+|(?:token|credential|password|secret|api[_ -]?key)\s*[:=]\s*\S+)/gi,
      "[credential withheld]",
    )
    .slice(0, max);
}
function eventTitle(value: unknown): string {
  const text = detailText(value, 160)
    ?.replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "Pipeline event";
}
function notificationDescription(kind: unknown, status: unknown): string {
  const value = detailText(status, 300);
  return value
    ? `Notification: ${detailText(kind, 300) || "email"}; current status: ${value}.`
    : "";
}
function detailTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(typeof value === "number" ? value : String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function sectionDetails(
  db: DatabaseSync,
  section: Section,
  resourceId: string,
  now: Date,
) {
  const base = overview(db, now); // Fixed source preflight bounds every table at 100,000 rows.
  db.function("admin_record_id", { deterministic: true }, (scope, value) =>
    opaqueId(String(scope), value),
  );
  const groups: DetailGroup[] = [];
  const timeline: DetailTimeline[] = [];
  const related: DetailRelated[] = [];
  let title = sectionLabels[section].title;
  let found = false;
  let notice: string | null = null;
  const group = (name: string, values: [string, unknown][]) => {
    groups.push({
      title: name.slice(0, 120),
      fields: values.slice(0, 30).map(([label, value]) => ({
        label: label.slice(0, 120),
        value:
          typeof value === "number" && Number.isFinite(value)
            ? value
            : detailText(value),
      })),
    });
  };
  const link = (target: Section, id: unknown, label: unknown) => {
    if (id === null || id === undefined || related.length >= 50) return;
    const key = opaqueId(target, id);
    if (
      !related.some(
        (entry) => entry.section === target && entry.resourceId === key,
      )
    )
      related.push({
        section: target,
        resourceId: key,
        label: detailText(label, 160) || sectionLabels[target].title,
      });
  };
  const profileInfo = (profileId: unknown) => {
    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) return;
    group("Public delegate", [
      ["Name", profile.name],
      ["Role", profile.title],
      ["Representation", profile.representation],
      ["Country", profile.country],
      ["City", profile.city],
      ["Region", profile.region],
      ["Expertise", profile.expertise],
      ["Industry", profile.industry],
      ["Network role", profile.seniority],
      ["Languages", profile.languages.join(", ")],
      ["Biography", profile.bio],
    ]);
    if (section !== "delegates") link("delegates", profile.id, profile.name);
  };
  // These fragments are selected only by source-owned code, never a URL value.
  const requestProjection = `SELECT id,meeting_id,created_at,CASE WHEN json_type(payload,'$.organization')='text' THEN substr(json_extract(payload,'$.organization'),1,6000) END organization,CASE WHEN json_type(payload,'$.expertise')='text' THEN substr(json_extract(payload,'$.expertise'),1,6000) END expertise,CASE WHEN json_type(payload,'$.jurisdictions')='text' THEN substr(json_extract(payload,'$.jurisdictions'),1,6000) END jurisdictions,CASE WHEN json_type(payload,'$.timeframe')='text' THEN substr(json_extract(payload,'$.timeframe'),1,6000) END timeframe,CASE WHEN json_type(payload,'$.profileId')='text' THEN substr(json_extract(payload,'$.profileId'),1,6000) END profileId FROM requests`;
  const meetingProjection = `SELECT id,updated_at,CASE WHEN json_type(snapshot,'$.title')='text' THEN substr(json_extract(snapshot,'$.title'),1,6000) END title,CASE WHEN json_type(snapshot,'$.agenda')='text' THEN substr(json_extract(snapshot,'$.agenda'),1,6000) END agenda,CASE WHEN json_type(snapshot,'$.delegateId')='text' THEN substr(json_extract(snapshot,'$.delegateId'),1,6000) END delegateId,CASE WHEN json_type(snapshot,'$.startsAt')='text' THEN substr(json_extract(snapshot,'$.startsAt'),1,6000) END startsAt,CASE WHEN json_type(snapshot,'$.endsAt')='text' THEN substr(json_extract(snapshot,'$.endsAt'),1,6000) END endsAt,CASE WHEN json_type(snapshot,'$.timezone')='text' THEN substr(json_extract(snapshot,'$.timezone'),1,6000) END timezone,CASE WHEN json_type(snapshot,'$.bookingStatus')='text' THEN substr(json_extract(snapshot,'$.bookingStatus'),1,6000) END bookingStatus,CASE WHEN json_type(snapshot,'$.sessionStatus')='text' THEN substr(json_extract(snapshot,'$.sessionStatus'),1,6000) END sessionStatus,CASE WHEN json_type(snapshot,'$.resultStatus')='text' THEN substr(json_extract(snapshot,'$.resultStatus'),1,6000) END resultStatus,json_extract(snapshot,'$.revision') revision FROM meetings`;
  const requestInfo = (record: Record<string, unknown>) => {
    group("Consultation request", [
      ["Organization", record.organization],
      ["Expertise", record.expertise],
      ["Jurisdictions", record.jurisdictions],
      ["Timeframe", record.timeframe],
      ["Status", record.meeting_id ? "meeting linked" : "proposal"],
      ["Created", detailTime(record.created_at)],
    ]);
    link(
      "organizations",
      typeof record.organization === "string"
        ? record.organization.slice(0, 300)
        : null,
      record.organization,
    );
    link("introductions", record.meeting_id, "Linked meeting");
    profileInfo(record.profileId);
    if (record.meeting_id) {
      const meeting = db
        .prepare(`${meetingProjection} WHERE id=? LIMIT 1`)
        .get(record.meeting_id as string);
      if (meeting)
        group("Linked meeting", [
          ["Title", meeting.title],
          ["Booking status", meeting.bookingStatus],
          ["Session status", meeting.sessionStatus],
          ["Result status", meeting.resultStatus],
          ["Starts", detailTime(meeting.startsAt)],
          ["Ends", detailTime(meeting.endsAt)],
          ["Timezone", meeting.timezone],
        ]);
    }
  };
  const requestLinks = (records: Record<string, unknown>[]) => {
    for (const record of records) {
      link(
        "opportunities",
        record.id,
        record.organization || "Consultation request",
      );
      link("introductions", record.meeting_id, "Linked meeting");
    }
  };
  const history = (where: string, params: SQLInputValue[]) => {
    const events = db
      .prepare(
        `SELECT e.id,e.kind,e.created_at,n.kind notificationKind,n.status notificationStatus FROM events e LEFT JOIN notifications n ON n.id=e.notification_id WHERE ${where} ORDER BY e.created_at DESC,e.id DESC LIMIT 100`,
      )
      .all(...params);
    for (const event of events) {
      timeline.push({
        at: detailTime(event.created_at),
        title: eventTitle(event.kind),
        description: notificationDescription(
          event.notificationKind,
          event.notificationStatus,
        ),
      });
      link("activity", event.id, event.kind);
    }
  };
  const notifications = (where: string, params: SQLInputValue[]) => {
    const counts = db
      .prepare(
        `SELECT n.kind,n.status,count(*) count FROM notifications n JOIN requests r ON r.id=n.request_id WHERE ${where} GROUP BY n.kind,n.status ORDER BY n.kind,n.status LIMIT 30`,
      )
      .all(...params);
    group(
      "Notifications",
      counts.length
        ? counts.map((entry) => [
            `${detailText(entry.kind, 70) || "Email"}: ${detailText(entry.status, 40) || "unknown"}`,
            Number(entry.count),
          ])
        : [["Recorded notifications", 0]],
    );
  };
  if (section === "opportunities") {
    const record = db
      .prepare(
        `${requestProjection} WHERE admin_record_id('opportunities',id)=? LIMIT 1`,
      )
      .get(resourceId);
    if (record) {
      found = true;
      title = detailText(record.organization, 160) || "Consultation request";
      requestInfo(record);
      notifications("r.id=?", [record.id as string]);
      history(
        "e.request_id=? OR e.notification_id IN (SELECT id FROM notifications WHERE request_id=?)",
        [record.id as string, record.id as string],
      );
      notice =
        "The source stores request metadata and pipeline events; private consultation objectives and email content are withheld.";
    }
  } else if (section === "introductions") {
    const record = db
      .prepare(
        `${meetingProjection} WHERE admin_record_id('introductions',id)=? LIMIT 1`,
      )
      .get(resourceId);
    if (record) {
      found = true;
      title = detailText(record.title, 160) || "Meeting introduction";
      group("Meeting context", [
        ["Title", record.title],
        ["Agenda", record.agenda],
      ]);
      group("Schedule and recorded outcome", [
        ["Starts", detailTime(record.startsAt)],
        ["Ends", detailTime(record.endsAt)],
        ["Timezone", record.timezone],
        ["Booking status", record.bookingStatus],
        ["Session status", record.sessionStatus],
        ["Result status", record.resultStatus],
        ["Revision", record.revision],
        ["Last updated", detailTime(record.updated_at)],
      ]);
      profileInfo(record.delegateId);
      requestLinks(
        db
          .prepare(
            `${requestProjection} WHERE meeting_id=? ORDER BY created_at DESC,id LIMIT 50`,
          )
          .all(record.id as string),
      );
      notifications("r.meeting_id=?", [record.id as string]);
      history(
        "e.request_id IN (SELECT id FROM requests WHERE meeting_id=?) OR e.notification_id IN (SELECT n2.id FROM notifications n2 JOIN requests r2 ON r2.id=n2.request_id WHERE r2.meeting_id=?)",
        [record.id as string, record.id as string],
      );
      notice =
        "A meeting conversation summary or transcript is not stored in this source. The timeline shows recorded pipeline events; notification statuses describe delivery, not what participants discussed. The latest 100 events and up to 50 related records are shown.";
    }
  } else if (section === "organizations") {
    const record = db
      .prepare(
        `SELECT organization,requests,lastRequestAt FROM (${sectionSQL.organizations.projection}) WHERE admin_record_id('organizations',organization)=? LIMIT 1`,
      )
      .get(resourceId);
    if (record) {
      found = true;
      title = detailText(record.organization, 160) || "Organization";
      group("Organization from consultation requests", [
        ["Organization", record.organization],
        ["Requests", record.requests],
        ["Latest request", detailTime(record.lastRequestAt)],
      ]);
      const records = db
        .prepare(
          `${requestProjection} WHERE substr(json_extract(payload,'$.organization'),1,300)=? ORDER BY created_at DESC,id LIMIT 50`,
        )
        .all(record.organization as string);
      requestLinks(records);
      group("Linked meeting activity", [
        [
          "Requests with a linked meeting",
          count(
            db,
            "SELECT count(*) n FROM requests WHERE substr(json_extract(payload,'$.organization'),1,300)=? AND meeting_id IS NOT NULL",
            record.organization as string,
          ),
        ],
      ]);
      history(
        "e.request_id IN (SELECT id FROM requests WHERE substr(json_extract(payload,'$.organization'),1,300)=?)",
        [record.organization as string],
      );
      notice =
        "Organization names are supplied on requests and grouped by their displayed name; this source is not a verified organization registry. Up to 50 related records and the latest 100 events are shown.";
    }
  } else if (section === "delegates") {
    const profile = profiles.find(
      (entry) => opaqueId(section, entry.id) === resourceId,
    );
    if (profile) {
      found = true;
      title = profile.name.slice(0, 160);
      profileInfo(profile.id);
      group("Pipeline activity", [
        [
          "Consultation requests",
          count(
            db,
            "SELECT count(*) n FROM requests WHERE json_extract(payload,'$.profileId')=?",
            profile.id,
          ),
        ],
        [
          "Meeting bookings",
          count(
            db,
            "SELECT count(*) n FROM meetings WHERE json_extract(snapshot,'$.delegateId')=?",
            profile.id,
          ),
        ],
      ]);
      requestLinks(
        db
          .prepare(
            `${requestProjection} WHERE json_extract(payload,'$.profileId')=? ORDER BY created_at DESC,id LIMIT 50`,
          )
          .all(profile.id),
      );
      for (const meeting of db
        .prepare(
          `${meetingProjection} WHERE json_extract(snapshot,'$.delegateId')=? ORDER BY updated_at DESC,id LIMIT 50`,
        )
        .all(profile.id))
        link(
          "introductions",
          meeting.id,
          meeting.title || "Meeting introduction",
        );
      history(
        "e.request_id IN (SELECT r.id FROM requests r WHERE json_extract(r.payload,'$.profileId')=? OR r.meeting_id IN (SELECT m.id FROM meetings m WHERE json_extract(m.snapshot,'$.delegateId')=?)) OR e.notification_id IN (SELECT n2.id FROM notifications n2 JOIN requests r2 ON r2.id=n2.request_id WHERE json_extract(r2.payload,'$.profileId')=? OR r2.meeting_id IN (SELECT m2.id FROM meetings m2 WHERE json_extract(m2.snapshot,'$.delegateId')=?))",
        [profile.id, profile.id, profile.id, profile.id],
      );
      notice =
        "Public directory biography and recorded pipeline counts. Up to 50 related records and the latest 100 events are shown.";
    }
  } else if (section === "activity") {
    const record = db
      .prepare(
        "SELECT e.id,e.kind,e.created_at,e.request_id,n.request_id notificationRequest,n.kind notificationKind,n.status notificationStatus,n.due_at dueAt FROM events e LEFT JOIN notifications n ON n.id=e.notification_id WHERE admin_record_id('activity',e.id)=? LIMIT 1",
      )
      .get(resourceId);
    if (record) {
      found = true;
      title = eventTitle(record.kind);
      group("Recorded event", [
        ["Event kind", record.kind],
        ["Recorded", detailTime(record.created_at)],
      ]);
      group("Related notification", [
        ["Kind", record.notificationKind],
        ["Current status", record.notificationStatus],
        ["Due", detailTime(record.dueAt)],
      ]);
      const requestId = record.request_id || record.notificationRequest;
      if (requestId) {
        const request = db
          .prepare(`${requestProjection} WHERE id=? LIMIT 1`)
          .get(requestId as string);
        if (request) {
          requestInfo(request);
          link(
            "opportunities",
            request.id,
            request.organization || "Consultation request",
          );
        }
      }
      timeline.push({
        at: detailTime(record.created_at),
        title,
        description: notificationDescription(
          record.notificationKind,
          record.notificationStatus,
        ),
      });
      notice =
        "Raw event payloads, email messages, errors, credentials and transcripts are private and are withheld.";
    }
  }
  const content = {
    schemaVersion: 1,
    product: "ir",
    section,
    resourceId,
    state: found ? "connected" : "notfound",
    sourceRevision: null as string | null,
    observedAt: found ? now.toISOString() : null,
    fetchedAt: now.toISOString(),
    capabilities: [DETAILS_CAPABILITY],
    title: title.slice(0, 160),
    groups: groups.slice(0, 12),
    timeline: timeline.slice(0, 100),
    related: related.slice(0, 50),
    notice,
  };
  if (found)
    content.sourceRevision = `sha256:${createHash("sha256")
      .update(
        JSON.stringify({
          base: base.sourceRevision,
          section,
          resourceId,
          title: content.title,
          groups: content.groups,
          timeline: content.timeline,
          related: content.related,
          notice,
        }),
      )
      .digest("hex")}`;
  return content;
}

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization",
  "X-Content-Type-Options": "nosniff",
};

export async function handleAdminRead(
  request: Request,
  resource: string,
  env: Environment = process.env,
  now = new Date(),
): Promise<Response> {
  const startedAt = performance.now();
  let db: DatabaseSync | undefined;
  try {
    const parts = resource.split("/");
    const sectionName =
      parts[0] === "sections" && (parts.length === 2 || parts.length === 3)
        ? parts[1]
        : null;
    const resourceId = parts.length === 3 ? parts[2] : null;
    if (resourceId !== null && !/^[A-Za-z0-9_-]{1,128}$/.test(resourceId))
      return Response.json({ error: "Not found" }, { status: 404, headers });
    const section = SECTIONS.find((value) => value === sectionName);
    if (resource !== "overview" && resource !== "capabilities" && !section)
      return Response.json({ error: "Not found" }, { status: 404, headers });
    const capability = section
      ? resourceId !== null
        ? DETAILS_CAPABILITY
        : RECORDS_CAPABILITY
      : CAPABILITY;
    const authorization = request.headers.get("authorization") || "";
    const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization);
    if (!match) throw new AdminReadError(401);
    const actor = delegation(match[1], env, now.getTime(), capability);
    const filename = path.join(
      env.IR_DATA_DIR || path.join(process.cwd(), "data"),
      "pipeline.sqlite",
    );
    // An absent pipeline is unavailable, never an empty database silently created.
    if (!existsSync(filename)) throw new AdminReadError(503);
    db = new DatabaseSync(filename);
    db.exec("PRAGMA busy_timeout=1000; PRAGMA foreign_keys=ON;");
    initializeAdminConnection(db);
    if (!bound(db, actor, now.getTime(), capability))
      throw new AdminReadError(403);
    let body;
    db.exec("BEGIN");
    try {
      body = section
        ? resourceId !== null
          ? sectionDetails(db, section, resourceId, now)
          : sectionRecords(db, section, request, now)
        : resource === "overview"
          ? overview(db, now)
          : { schemaVersion: 1, product: "ir", capabilities: CAPABILITIES };
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    const audit = db
      .prepare(
        "INSERT INTO admin_read_audit(actor_hash,capability,resource,outcome,source_revision,created_at) VALUES(?,?,?,'allowed',?,?)",
      )
      .run(
        createHash("sha256")
          .update(JSON.stringify([actor.issuer, actor.subject]))
          .digest("hex"),
        capability,
        section || resource,
        "sourceRevision" in body ? body.sourceRevision : null,
        now.getTime(),
      );
    // Outside the read snapshot: a concurrent revocation must be visible here.
    // Include elapsed time so a long read cannot outlive its delegated token.
    const finishedAt =
      now.getTime() + Math.max(0, performance.now() - startedAt);
    if (
      actor.expires <= finishedAt ||
      !bound(db, actor, finishedAt, capability)
    ) {
      db.prepare("UPDATE admin_read_audit SET outcome='denied' WHERE id=?").run(
        audit.lastInsertRowid,
      );
      throw new AdminReadError(403);
    }
    return Response.json(body, {
      headers,
      status: "state" in body && body.state === "notfound" ? 404 : 200,
    });
  } catch (error) {
    const status = error instanceof AdminReadError ? error.status : 503;
    return Response.json(
      {
        error:
          status === 503
            ? "Administrative service unavailable"
            : status === 400
              ? "Invalid section query"
              : "Administrative access denied",
      },
      { status, headers },
    );
  } finally {
    db?.close();
  }
}
