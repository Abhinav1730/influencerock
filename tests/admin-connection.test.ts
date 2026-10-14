import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const signingIssuer = "https://super-admin.universa.science";
const issuer = "https://super-admin.universa.science/identity";
const subject = "universa-super-admin";
const now = new Date("2026-10-13T12:00:00.000Z");
const second = now.getTime() / 1000;
const pair = generateKeyPairSync("ed25519");
const envKeys = JSON.stringify({
  [signingIssuer]: pair.publicKey.export({ type: "spki", format: "pem" }),
});
function token(
  overrides: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
  key = pair.privateKey,
) {
  const encoded = [
    { alg: "EdDSA", typ: "admin-delegation+jwt", ...header },
    {
      iss: signingIssuer,
      sub: subject,
      aud: "ir-admin",
      iat: second,
      exp: second + 90,
      actor: { issuer, subject },
      product: "ir",
      capability: "overview:read",
      grantVersion: 1,
      ...overrides,
    },
  ]
    .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
    .join(".");
  return `${encoded}.${sign(null, Buffer.from(encoded), key).toString("base64url")}`;
}
async function connector() {
  assert.ok(
    existsSync(new URL("../lib/server/admin-connection.ts", import.meta.url)),
    "delegated aggregate connector must exist",
  );
  return import("../lib/server/admin-connection");
}
async function fixture() {
  const module = await connector();
  const directory = mkdtempSync(path.join(os.tmpdir(), "ir-admin-"));
  const db = new DatabaseSync(path.join(directory, "pipeline.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE requests(id TEXT PRIMARY KEY, payload TEXT, meeting_id TEXT, created_at INTEGER);
    CREATE TABLE meetings(id TEXT PRIMARY KEY, snapshot TEXT, updated_at INTEGER);
    CREATE TABLE notifications(id TEXT PRIMARY KEY, status TEXT, due_at INTEGER);
    CREATE TABLE events(id INTEGER PRIMARY KEY, details TEXT, created_at INTEGER);`);
  module.initializeAdminConnection(db);
  db.prepare(
    "INSERT INTO admin_grants(issuer,subject,capability,grant_version) VALUES(?,?,?,?)",
  ).run(issuer, subject, "overview:read", 1);
  db.prepare("INSERT INTO requests VALUES(?,?,?,?)").run(
    "private-request-id",
    JSON.stringify({ email: "secret@example.com", name: "Private Name" }),
    null,
    now.getTime() - 1000,
  );
  db.prepare("INSERT INTO requests VALUES(?,?,?,?)").run(
    "private-booking-id",
    "{}",
    "private-meeting-id",
    now.getTime() - 1000,
  );
  const meeting = db.prepare("INSERT INTO meetings VALUES(?,?,?)");
  for (const [id, bookingStatus, sessionStatus, startsAt] of [
    ["private-meeting-id", "confirmed", "scheduled", "2026-10-14T12:00:00Z"],
    ["private-active-id", "confirmed", "active", "2026-10-13T11:00:00Z"],
    ["private-ended-id", "confirmed", "ended", "2026-10-12T11:00:00Z"],
    ["private-cancelled-id", "cancelled", "scheduled", "2026-10-14T12:00:00Z"],
  ])
    meeting.run(
      id,
      JSON.stringify({
        bookingStatus,
        sessionStatus,
        startsAt,
        organizerEmail: "secret@example.com",
        meetingUrl: "https://private.invalid/join/token",
        agenda: "private conversation",
      }),
      now.getTime() - 1000,
    );
  for (const [i, status] of [
    "pending",
    "preparing",
    "ready",
    "sending",
    "delivered",
    "failed",
    "bounced",
    "complained",
    "uncertain",
    "sent",
  ].entries())
    db.prepare("INSERT INTO notifications VALUES(?,?,?)").run(
      `private-mail-${i}`,
      status,
      now.getTime(),
    );
  db.prepare("INSERT INTO events VALUES(?,?,?)").run(
    1,
    JSON.stringify({ email: "secret@example.com", credential: "secret-key" }),
    now.getTime() - 1000,
  );
  const env = { ADMIN_DELEGATION_KEYS: envKeys, IR_DATA_DIR: directory };
  const read = (signed = token(), resource = "overview", customEnv = env) =>
    module.handleAdminRead(
      new Request(`https://admin.influencerock.com/api/admin/v1/${resource}`, {
        headers: { authorization: `Bearer ${signed}` },
      }),
      resource,
      customEnv,
      now,
    );
  return {
    db,
    read,
    env,
    cleanup() {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("valid delegation exposes only real aggregate counts and no private records, with persistent audit", async () => {
  const f = await fixture();
  try {
    const response = await f.read();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    const body = await response.json();
    assert.deepEqual(
      Object.keys(body).sort(),
      [
        "schemaVersion",
        "product",
        "sourceRevision",
        "observedAt",
        "fetchedAt",
        "state",
        "metrics",
        "capabilities",
      ].sort(),
    );
    assert.equal(body.product, "ir");
    assert.equal(body.schemaVersion, 1);
    assert.equal(body.state, "connected");
    assert.match(body.sourceRevision, /^sha256:[a-f0-9]{64}$/);
    assert.equal(body.observedAt, now.toISOString());
    const values = Object.fromEntries(
      body.metrics.map((metric: { id: string; value: number }) => [
        metric.id,
        metric.value,
      ]),
    );
    assert.equal(values.requests, 2);
    assert.equal(values.proposals, 1);
    assert.equal(values.meetings, 4);
    assert.equal(values.meetings_upcoming, 1);
    assert.equal(values.meetings_confirmed, 3);
    assert.equal(values.meetings_active, 1);
    assert.equal(values.meetings_ended, 1);
    assert.equal(values.emails, 10);
    assert.equal(values.emails_queued, 4);
    assert.equal(values.emails_delivered, 1);
    assert.equal(values.emails_attention, 4);
    assert.equal(values.events, 1);
    assert.ok(values.directory_profiles > 0);
    const serialized = JSON.stringify(body);
    for (const secret of [
      "secret@example.com",
      "private-",
      "private conversation",
      "secret-key",
      "join/token",
    ])
      assert.ok(!serialized.includes(secret), secret);
    const audit = f.db.prepare("SELECT * FROM admin_read_audit").all();
    assert.equal(audit.length, 1);
    assert.equal(audit[0].outcome, "allowed");
    assert.ok(!JSON.stringify(audit).includes("secret@example.com"));
    assert.ok(!JSON.stringify(audit).includes(subject));
    assert.equal((await f.read()).status, 200);
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM admin_read_audit").get()!.n,
      2,
    );
  } finally {
    f.cleanup();
  }
});

test("capabilities requires independent local binding and follows its own strict response", async () => {
  const f = await fixture();
  try {
    const response = await f.read(token(), "capabilities");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      schemaVersion: 1,
      product: "ir",
      capabilities: ["overview:read"],
    });
    f.db.exec("DELETE FROM admin_grants");
    assert.equal((await f.read(token(), "capabilities")).status, 403);
  } finally {
    f.cleanup();
  }
});

for (const [name, claims, header] of [
  ["wrong product", { product: "smartmeet" }, {}],
  ["wrong capability", { capability: "records:read" }, {}],
  ["unknown issuer", { iss: "https://evil.invalid" }, {}],
  ["wrong audience", { aud: "smartmeet-admin" }, {}],
  ["expired", { iat: second - 90, exp: second }, {}],
  ["future issued", { iat: second + 1 }, {}],
  ["old issued", { iat: second - 91, exp: second + 1 }, {}],
  ["excessive lifetime", { exp: second + 91 }, {}],
  ["missing timestamp", { iat: undefined }, {}],
  ["malformed actor issuer", { actor: { issuer: "invalid", subject } }, {}],
  ["wrong actor subject", { actor: { issuer, subject: "another" } }, {}],
  ["zero grant version", { grantVersion: 0 }, {}],
  ["wrong typ", {}, { typ: "JWT" }],
  ["wrong algorithm", {}, { alg: "HS256" }],
] as const)
  test(`rejects ${name} before reading aggregates`, async () => {
    const f = await fixture();
    try {
      assert.equal((await f.read(token(claims, header))).status, 401);
      assert.equal(
        f.db.prepare("SELECT count(*) AS n FROM admin_read_audit").get()!.n,
        0,
      );
    } finally {
      f.cleanup();
    }
  });

test("rejects forgery and missing or malformed trust configuration", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await f.read(token({}, {}, generateKeyPairSync("ed25519").privateKey)))
        .status,
      401,
    );
    assert.equal((await f.read("bad.token.payload")).status, 401);
    assert.equal(
      (
        await f.read(token(), "overview", {
          ...f.env,
          ADMIN_DELEGATION_KEYS: "{}",
        })
      ).status,
      503,
    );
    assert.equal(
      (
        await f.read(token(), "overview", {
          ...f.env,
          ADMIN_DELEGATION_KEYS: "[]",
        })
      ).status,
      503,
    );
    assert.equal(
      (
        await f.read(token(), "overview", {
          ...f.env,
          ADMIN_DELEGATION_KEYS: JSON.stringify({ [signingIssuer]: "bad pem" }),
        })
      ).status,
      503,
    );
  } finally {
    f.cleanup();
  }
});

test("rejects revoked and expired local grants while portal versions remain independent", async () => {
  const f = await fixture();
  try {
    f.db.exec("UPDATE admin_grants SET revoked_at=1");
    assert.equal((await f.read()).status, 403);
    f.db
      .prepare("UPDATE admin_grants SET revoked_at=NULL,expires_at=?")
      .run(now.getTime());
    assert.equal((await f.read()).status, 403);
    f.db.exec("UPDATE admin_grants SET expires_at=NULL,grant_version=2");
    assert.equal((await f.read(token({ grantVersion: 7 }))).status, 200);
  } finally {
    f.cleanup();
  }
});

test("rechecks revocation after aggregation before returning the response", async () => {
  const f = await fixture();
  try {
    f.db.exec(
      "CREATE TRIGGER revoke_during_read AFTER INSERT ON admin_read_audit BEGIN UPDATE admin_grants SET revoked_at=1; END",
    );
    const response = await f.read();
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "Administrative access denied",
    });
    assert.equal(
      f.db.prepare("SELECT outcome FROM admin_read_audit").get()!.outcome,
      "denied",
    );
  } finally {
    f.cleanup();
  }
});

test("malformed source data fails closed and never echoes database details", async () => {
  const f = await fixture();
  try {
    f.db.exec("UPDATE meetings SET snapshot='not json'");
    const response = await f.read();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Administrative service unavailable",
    });
    assert.match(response.headers.get("cache-control")!, /no-store/);
  } finally {
    f.cleanup();
  }
});

test("unbound requests do not touch private source tables or mutate grants", async () => {
  const f = await fixture();
  try {
    f.db.exec("DELETE FROM admin_grants; DROP TABLE meetings");
    assert.equal((await f.read()).status, 403);
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM admin_grants").get()!.n,
      0,
    );
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM admin_read_audit").get()!.n,
      0,
    );
  } finally {
    f.cleanup();
  }
});

test("aggregate scan limit fails closed instead of returning partial totals", async () => {
  const f = await fixture();
  try {
    f.db
      .exec(`WITH RECURSIVE counter(n) AS (VALUES(2) UNION ALL SELECT n+1 FROM counter WHERE n<100001)
      INSERT INTO events(id,details,created_at) SELECT n,'{}',0 FROM counter`);
    const response = await f.read();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Administrative service unavailable",
    });
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM admin_read_audit").get()!.n,
      0,
    );
  } finally {
    f.cleanup();
  }
});

test("an absent pipeline fails closed without creating a new database", async () => {
  const f = await fixture();
  const absent = path.join(f.env.IR_DATA_DIR, "missing");
  try {
    const response = await f.read(token(), "overview", {
      ...f.env,
      IR_DATA_DIR: absent,
    });
    assert.equal(response.status, 503);
    assert.ok(!existsSync(path.join(absent, "pipeline.sqlite")));
  } finally {
    f.cleanup();
  }
});

test("source corruption rolls back and later reads use fresh source state", async () => {
  const f = await fixture();
  try {
    const first = await (await f.read()).json();
    f.db.exec("UPDATE meetings SET snapshot='bad json'");
    assert.equal((await f.read()).status, 503);
    f.db.exec("DELETE FROM meetings");
    const response = await f.read();
    assert.equal(response.status, 200);
    const next = await response.json();
    assert.notEqual(first.sourceRevision, next.sourceRevision);
    assert.equal(
      next.metrics.find((metric: { id: string }) => metric.id === "meetings")
        .value,
      0,
    );
  } finally {
    f.cleanup();
  }
});

// Mirrors issueDelegation: JWT issuer signs for an independently issued OIDC actor.
test("portal signing issuer and OIDC actor issuer are distinct exact identities", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.read()).status, 200);
    f.db.prepare("UPDATE admin_grants SET issuer=?").run(signingIssuer);
    assert.equal((await f.read()).status, 403);
  } finally {
    f.cleanup();
  }
});

test("validly signed but locally unbound actor issuer is denied", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.read(
          token({ actor: { issuer: "https://other-id.invalid", subject } }),
        )
      ).status,
      403,
    );
  } finally {
    f.cleanup();
  }
});


test("unchanged old records and an empty pipeline are fresh observations with stable provenance", async () => {
  const f = await fixture();
  try {
    for (const table of ["requests", "meetings", "events"])
      f.db.prepare(`UPDATE ${table} SET ${table === "meetings" ? "updated_at" : "created_at"}=?`).run(now.getTime() - 86_400_000);
    const first=await (await f.read()).json();
    assert.equal(first.observedAt,now.toISOString());
    assert.equal(first.sourceRevision,(await (await f.read()).json()).sourceRevision);
    for (const table of ["requests","meetings","notifications","events"]) f.db.exec(`DELETE FROM ${table}`);
    const emptyResponse=await f.read(),empty=await emptyResponse.json();
    assert.equal(emptyResponse.status,200);assert.equal(empty.state,"connected");assert.equal(empty.observedAt,now.toISOString());
    assert.ok(empty.sourceRevision);assert.ok(empty.metrics.filter((m: {id:string})=>!m.id.startsWith("directory_")).every((m: {value:number})=>m.value===0));
  } finally { f.cleanup(); }
});
