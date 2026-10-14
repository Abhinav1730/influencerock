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
  const directory = mkdtempSync(
    path.join("/mnt/super-admin-build", "ir-sections-test-"),
  );
  const db = new DatabaseSync(path.join(directory, "pipeline.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE requests(id TEXT PRIMARY KEY, source_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL, payload TEXT NOT NULL, meeting_id TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE meetings(id TEXT PRIMARY KEY,snapshot TEXT NOT NULL,updated_at INTEGER NOT NULL);
    CREATE TABLE notifications(id TEXT PRIMARY KEY,request_id TEXT,kind TEXT,status TEXT,due_at INTEGER);
    CREATE TABLE events(id INTEGER PRIMARY KEY,request_id TEXT,notification_id TEXT,kind TEXT NOT NULL,details TEXT NOT NULL,created_at INTEGER NOT NULL);`);
  module.initializeAdminConnection(db);
  const grant = db.prepare(
    "INSERT INTO admin_grants(issuer,subject,capability,grant_version) VALUES(?,?,?,1)",
  );
  grant.run(issuer, subject, "overview:read");
  grant.run(issuer, subject, "records:read");
  const request = db.prepare("INSERT INTO requests VALUES(?,?,?,?,?,?)");
  for (let i = 0; i < 57; i++)
    request.run(
      `private-request-${i}`,
      `private-key-${i}`,
      "private-hash",
      JSON.stringify({
        name: "Private Name",
        email: "secret@example.com",
        organization: i === 0 ? "Needle Ventures" : "Example Organization",
        jurisdictions: "Europe",
        expertise: "Infrastructure",
        timeframe: "This quarter",
        profileId: "africa-dz-alg-01",
        objective: "private objective",
      }),
      i === 0 ? "private-room-id" : null,
      now.getTime() - i - 1000,
    );
  db.prepare("INSERT INTO meetings VALUES(?,?,?)").run(
    "private-room-id",
    JSON.stringify({
      delegateId: "africa-dz-alg-01",
      organizerName: "Private Name",
      organizerEmail: "secret@example.com",
      title: "private meeting title",
      agenda: "private objective",
      startsAt: "2026-10-14T12:00:00Z",
      endsAt: "2026-10-14T12:30:00Z",
      timezone: "UTC",
      bookingStatus: "confirmed",
      sessionStatus: "scheduled",
      resultStatus: "pending",
      meetingUrl: "https://private.invalid/join/token",
      conversationToken: "private-token",
    }),
    now.getTime() - 500,
  );
  db.prepare("INSERT INTO events VALUES(?,?,?,?,?,?)").run(
    1,
    "private-request-0",
    null,
    "request_created",
    JSON.stringify({ email: "secret@example.com", credential: "secret-key" }),
    now.getTime() - 100,
  );
  db.prepare("INSERT INTO notifications VALUES(?,?,?,?,?)").run(
    "private-notification",
    "private-request-0",
    "meeting_summary",
    "delivered",
    now.getTime() - 200,
  );
  db.prepare("INSERT INTO events VALUES(?,?,?,?,?,?)").run(
    2,
    "private-request-0",
    "private-notification",
    "email_delivered",
    JSON.stringify({ transcript: "private transcript", error: "secret-key" }),
    now.getTime() - 50,
  );
  const env = { ADMIN_DELEGATION_KEYS: envKeys, IR_DATA_DIR: directory };
  const read = (
    section = "opportunities",
    query = "",
    signed = token({ capability: "records:read" }),
  ) =>
    module.handleAdminRead(
      new Request(
        `https://admin.influencerock.com/api/admin/v1/sections/${section}${query}`,
        { headers: { authorization: `Bearer ${signed}` } },
      ),
      `sections/${section}`,
      env,
      now,
    );
  return {
    db,
    read,
    env,
    detail(
      section: string,
      id: string,
      signed = token({ capability: "details:read" }),
    ) {
      return module.handleAdminRead(
        new Request(
          `https://admin.influencerock.com/api/admin/v1/sections/${section}/${id}`,
          { headers: { authorization: `Bearer ${signed}` } },
        ),
        `sections/${section}/${id}`,
        env,
        now,
      );
    },
    cleanup() {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("sections require their own signed capability and independent local grant", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.read()).status, 200);
    assert.equal((await f.read("opportunities", "", token())).status, 401);
    f.db.exec("DELETE FROM admin_grants WHERE capability='records:read'");
    assert.equal((await f.read()).status, 403);
  } finally {
    f.cleanup();
  }
});
test("real request rows are capped, ordered, paginated, literal-searchable, and safely projected", async () => {
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
        "state",
        "sourceRevision",
        "observedAt",
        "fetchedAt",
        "metrics",
        "capabilities",
        "section",
        "title",
        "description",
        "columns",
        "rows",
        "rowIds",
        "page",
        "pageSize",
        "total",
        "notice",
      ].sort(),
    );
    assert.equal(body.schemaVersion, 1);
    assert.equal(body.product, "ir");
    assert.equal(body.state, "connected");
    assert.deepEqual(body.capabilities, ["records:read"]);
    assert.equal(body.section, "opportunities");
    assert.equal(body.page, 1);
    assert.equal(body.pageSize, 50);
    assert.equal(body.total, 57);
    assert.equal(body.rows.length, 50);
    assert.equal(body.rows[0].organization, "Needle Ventures");
    assert.match(body.rows[0].reference, /^[a-f0-9]{16}$/);
    assert.equal(
      body.metrics.find((m: { id: string }) => m.id === "requests").value,
      57,
    );
    const next = await (await f.read("opportunities", "?page=2")).json();
    assert.equal(next.rows.length, 7);
    assert.equal(next.total, 57);
    assert.ok(
      !next.rows.some(
        (r: { reference: string }) => r.reference === body.rows[0].reference,
      ),
    );
    const search = await (await f.read("opportunities", "?q=needle")).json();
    assert.equal(search.total, 1);
    assert.equal(search.rows[0].organization, "Needle Ventures");
    for (const q of ["%' OR 1=1 --", "%", "_"]) {
      const literal = await (
        await f.read("opportunities", `?q=${encodeURIComponent(q)}`)
      ).json();
      assert.equal(literal.total, 0);
    }
    const serialized = JSON.stringify(body);
    for (const secret of [
      "secret@example.com",
      "private-",
      "private objective",
      "Private Name",
      "secret-key",
      "join/token",
    ])
      assert.ok(!serialized.includes(secret), secret);
    assert.equal((await f.read("opportunities", "?page=20000")).status, 200);
  } finally {
    f.cleanup();
  }
});
test("directory, organization, introduction and activity tabs use authoritative safe source fields", async () => {
  const f = await fixture();
  try {
    const organizations = await (await f.read("organizations")).json();
    assert.equal(organizations.total, 2);
    assert.match(organizations.description, /request/i);
    assert.equal(
      organizations.rows.find(
        (r: { organization: string }) =>
          r.organization === "Example Organization",
      ).requests,
      56,
    );
    const delegates = await (await f.read("delegates")).json();
    assert.ok(delegates.total > 0);
    assert.equal(delegates.rows.length, 50);
    assert.ok(delegates.rows[0].name);
    const intro = await (await f.read("introductions")).json();
    assert.equal(intro.total, 1);
    assert.equal(intro.rows[0].bookingStatus, "confirmed");
    assert.equal(intro.rows[0].startsAt, "2026-10-14T12:00:00Z");
    const activity = await (await f.read("activity")).json();
    assert.equal(activity.total, 2);
    assert.equal(activity.rows[0].kind, "email_delivered");
    for (const body of [organizations, delegates, intro, activity]) {
      assert.match(body.sourceRevision, /^sha256:[a-f0-9]{64}$/);
      assert.equal(body.observedAt, now.toISOString());
      for (const row of body.rows)
        for (const value of Object.values(row))
          assert.ok(
            value === null ||
              typeof value === "number" ||
              (typeof value === "string" && value.length <= 300),
          );
      const serialized = JSON.stringify(body);
      for (const secret of [
        "secret@example.com",
        "private-",
        "private objective",
        "Private Name",
        "secret-key",
        "join/token",
      ])
        assert.ok(!serialized.includes(secret), secret);
    }
  } finally {
    f.cleanup();
  }
});
test("unsupported stored business records show unknown totals without invented rows", async () => {
  const f = await fixture();
  try {
    for (const section of ["funding", "contracts"]) {
      const response = await f.read(section);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.total, null);
      assert.deepEqual(body.rows, []);
      assert.match(body.notice, /does not currently store/i);
    }
  } finally {
    f.cleanup();
  }
});
test("unknown sections and unsafe pagination/search are rejected", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.read("senders")).status, 404);
    for (const query of [
      "?page=0",
      "?page=-1",
      "?page=1.1",
      "?page=20001",
      "?page=NaN",
      "?page=1&page=2",
      "?q=" + "x".repeat(121),
      "?q=a&q=b",
    ])
      assert.equal((await f.read("opportunities", query)).status, 400, query);
  } finally {
    f.cleanup();
  }
});
test("record grants expire, revoke, and are rechecked after audit", async () => {
  const f = await fixture();
  try {
    f.db
      .prepare(
        "UPDATE admin_grants SET expires_at=? WHERE capability='records:read'",
      )
      .run(now.getTime());
    assert.equal((await f.read()).status, 403);
    f.db.exec(
      "UPDATE admin_grants SET expires_at=NULL,revoked_at=1 WHERE capability='records:read'",
    );
    assert.equal((await f.read()).status, 403);
    f.db.exec(
      "UPDATE admin_grants SET revoked_at=NULL; CREATE TRIGGER revoke_records AFTER INSERT ON admin_read_audit WHEN new.capability='records:read' BEGIN UPDATE admin_grants SET revoked_at=1 WHERE capability='records:read'; END;",
    );
    assert.equal((await f.read()).status, 403);
    const audit = f.db.prepare("SELECT * FROM admin_read_audit").get()!;
    assert.equal(audit.outcome, "denied");
    assert.equal(audit.resource, "opportunities");
    assert.equal(audit.capability, "records:read");
  } finally {
    f.cleanup();
  }
});
test("audit schema migration preserves historical rows, indexes and triggers", async () => {
  const f = await fixture();
  try {
    f.db
      .exec(`DROP TABLE admin_read_audit; CREATE TABLE admin_read_audit(id INTEGER PRIMARY KEY,actor_hash TEXT NOT NULL,capability TEXT NOT NULL,resource TEXT NOT NULL CHECK(resource IN ('overview','capabilities')),outcome TEXT NOT NULL CHECK(outcome IN ('allowed','denied')),source_revision TEXT,created_at INTEGER NOT NULL);
 INSERT INTO admin_read_audit VALUES(42,'hash','overview:read','overview','allowed','old-revision',1);
 CREATE INDEX historical_audit_time ON admin_read_audit(created_at);
 CREATE TRIGGER historical_audit_trigger AFTER INSERT ON admin_read_audit WHEN new.id<0 BEGIN SELECT 1; END;`);
    assert.equal((await f.read()).status, 200);
    assert.equal(
      f.db
        .prepare("SELECT source_revision FROM admin_read_audit WHERE id=42")
        .get()!.source_revision,
      "old-revision",
    );
    assert.equal(
      f.db
        .prepare(
          "SELECT count(*) n FROM sqlite_master WHERE name IN ('historical_audit_time','historical_audit_trigger')",
        )
        .get()!.n,
      2,
    );
  } finally {
    f.cleanup();
  }
});
test("revision captures displayed source mutations and string projections are bounded", async () => {
  const f = await fixture();
  try {
    const before = await (await f.read()).json();
    f.db
      .prepare(
        "UPDATE requests SET payload=json_set(payload,'$.organization',?) WHERE id='private-request-0'",
      )
      .run("X".repeat(600));
    const after = await (await f.read()).json();
    assert.notEqual(before.sourceRevision, after.sourceRevision);
    assert.equal(after.rows[0].organization.length, 300);
    f.db.exec("UPDATE events SET kind='meeting_updated'");
    const activity = await (await f.read("activity")).json();
    assert.equal(activity.rows[0].kind, "meeting_updated");
  } finally {
    f.cleanup();
  }
});

test("stable opaque row IDs align with pagination and search without exposing hidden row fields", async () => {
  const f = await fixture();
  try {
    for (const section of [
      "opportunities",
      "organizations",
      "delegates",
      "introductions",
      "activity",
      "contracts",
      "funding",
    ]) {
      const body = await (await f.read(section)).json();
      assert.equal(body.rowIds.length, body.rows.length);
      for (const id of body.rowIds) assert.match(id, /^[A-Za-z0-9_-]{1,128}$/);
    }
    const first = await (await f.read()).json();
    const search = await (await f.read("opportunities", "?q=needle")).json();
    assert.equal(search.rowIds[0], first.rowIds[0]);
    const secondPage = await (await f.read("opportunities", "?page=2")).json();
    assert.ok(
      !secondPage.rowIds.some((id: string) => first.rowIds.includes(id)),
    );
  } finally {
    f.cleanup();
  }
});
test("details require a distinct signed capability and live independent local grant", async () => {
  const f = await fixture();
  try {
    const rows = await (await f.read("introductions")).json();
    const id = rows.rowIds?.[0] || "missing-feature";
    assert.equal(
      (
        await f.detail(
          "introductions",
          id,
          token({ capability: "records:read" }),
        )
      ).status,
      401,
    );
    assert.equal((await f.detail("introductions", id)).status, 403);
    f.db
      .prepare("INSERT INTO admin_grants VALUES(?,?,?,1,NULL,NULL)")
      .run(issuer, subject, "details:read");
    assert.equal((await f.detail("introductions", id)).status, 200);
    assert.equal(
      (
        await f.detail(
          "introductions",
          id,
          token({ capability: "details:read", product: "ui" }),
        )
      ).status,
      401,
    );
    f.db
      .prepare(
        "UPDATE admin_grants SET expires_at=? WHERE capability='details:read'",
      )
      .run(now.getTime());
    assert.equal((await f.detail("introductions", id)).status, 403);
    f.db.exec(
      "UPDATE admin_grants SET expires_at=NULL; CREATE TRIGGER revoke_details AFTER INSERT ON admin_read_audit WHEN new.capability='details:read' BEGIN UPDATE admin_grants SET revoked_at=1 WHERE capability='details:read'; END;",
    );
    assert.equal((await f.detail("introductions", id)).status, 403);
    assert.equal(
      f.db
        .prepare(
          "SELECT outcome FROM admin_read_audit WHERE capability='details:read' ORDER BY id DESC LIMIT 1",
        )
        .get()!.outcome,
      "denied",
    );
  } finally {
    f.cleanup();
  }
});
test("every source section resolves enriched scoped details and actual meeting events without private pipeline content", async () => {
  const f = await fixture();
  try {
    f.db
      .prepare("INSERT INTO admin_grants VALUES(?,?,?,1,NULL,NULL)")
      .run(issuer, subject, "details:read");
    for (const section of [
      "opportunities",
      "organizations",
      "delegates",
      "introductions",
      "activity",
    ]) {
      const list = await (
        await f.read(section, section === "opportunities" ? "?q=needle" : "")
      ).json();
      const id = list.rowIds?.[0] || "missing-feature";
      const response = await f.detail(section, id);
      assert.equal(response.status, 200, section);
      const body = await response.json();
      assert.deepEqual(
        Object.keys(body).sort(),
        [
          "schemaVersion",
          "product",
          "section",
          "resourceId",
          "state",
          "sourceRevision",
          "observedAt",
          "fetchedAt",
          "capabilities",
          "title",
          "groups",
          "timeline",
          "related",
          "notice",
        ].sort(),
      );
      assert.equal(body.resourceId, id);
      assert.deepEqual(body.capabilities, ["details:read"]);
      assert.equal(body.state, "connected");
      assert.ok(body.groups.length > 0);
      assert.match(body.sourceRevision, /^sha256:[a-f0-9]{64}$/);
      assert.match(response.headers.get("cache-control")!, /no-store/);
      const text = JSON.stringify(body);
      for (const secret of [
        "secret@example.com",
        "private-request",
        "private-room-id",
        "private-token",
        "join/token",
        "secret-key",
        "private transcript",
        "Private Name",
      ])
        assert.ok(!text.includes(secret), `${section}: ${secret}`);
      if (section === "introductions") {
        assert.ok(
          body.timeline.some(
            (entry: { title: string }) => entry.title === "Email delivered",
          ),
        );
        assert.ok(text.includes("delivered"));
        assert.match(body.notice, /not stored|does not store/i);
        assert.ok(
          body.related.some(
            (entry: { section: string }) => entry.section === "opportunities",
          ),
        );
      }
      if (section === "opportunities" || section === "activity")
        assert.ok(
          body.groups.some(
            (g: { fields: { label: string; value: unknown }[] }) =>
              g.fields.some(
                (field) =>
                  field.label === "Booking status" &&
                  field.value === "confirmed",
              ),
          ),
        );
      if (section === "activity") {
        assert.equal(body.timeline[0].title, "Email delivered");
        assert.match(body.timeline[0].description, /current status: delivered/);
        assert.ok(
          body.groups.some(
            (g: { fields: { label: string; value: unknown }[] }) =>
              g.fields.some(
                (field) =>
                  field.label === "Event kind" &&
                  field.value === "email_delivered",
              ),
          ),
        );
      }
      if (section === "delegates")
        assert.ok(
          body.groups.some((g: { fields: { label: string }[] }) =>
            g.fields.some((field) => field.label === "Biography"),
          ),
        );
      assert.equal((await f.detail(section, "does-not-exist")).status, 404);
      const wrongSection =
        section === "introductions" ? "opportunities" : "introductions";
      assert.equal((await f.detail(wrongSection, id)).status, 404);
    }
    assert.equal((await f.detail("introductions", "bad.id")).status, 404);
    assert.equal((await f.detail("senders", "missing")).status, 404);
  } finally {
    f.cleanup();
  }
});

test("meeting detail revisions capture real context and notification mutations and redact sensitive context", async () => {
  const f = await fixture();
  try {
    f.db
      .prepare("INSERT INTO admin_grants VALUES(?,?,?,1,NULL,NULL)")
      .run(issuer, subject, "details:read");
    const list = await (await f.read("introductions")).json();
    const before = await (
      await f.detail("introductions", list.rowIds[0])
    ).json();
    f.db
      .prepare("UPDATE meetings SET snapshot=json_set(snapshot,'$.agenda',?)")
      .run(
        "Agenda: discuss infrastructure. Contact secret@example.com https://private.invalid/join/token credential=secret-key",
      );
    const after = await (
      await f.detail("introductions", list.rowIds[0])
    ).json();
    assert.notEqual(before.sourceRevision, after.sourceRevision);
    assert.ok(JSON.stringify(after).includes("discuss infrastructure"));
    for (const secret of ["secret@example.com", "join/token", "secret-key"])
      assert.ok(!JSON.stringify(after).includes(secret));
    f.db.exec("UPDATE notifications SET status='bounced'");
    const bounced = await (
      await f.detail("introductions", list.rowIds[0])
    ).json();
    assert.notEqual(after.sourceRevision, bounced.sourceRevision);
    assert.ok(
      bounced.timeline.some((entry: { description: string }) =>
        entry.description.includes("bounced"),
      ),
    );
    f.db.exec("UPDATE meetings SET snapshot=json_set(snapshot,'$.agenda','')");
    const direct = await import("../lib/server/admin-connection");
    const request = new Request(
      `https://admin.influencerock.com/api/admin/v1/sections/introductions/${list.rowIds[0]}`,
      {
        headers: {
          authorization: `Bearer ${token({ capability: "details:read" })}`,
        },
      },
    );
    const a = await (
      await direct.handleAdminRead(
        request,
        `sections/introductions/${list.rowIds[0]}`,
        f.env,
        now,
      )
    ).json();
    const b = await (
      await direct.handleAdminRead(
        request,
        `sections/introductions/${list.rowIds[0]}`,
        f.env,
        new Date(now.getTime() + 1000),
      )
    ).json();
    assert.equal(
      a.sourceRevision,
      b.sourceRevision,
      "fetch timestamps do not change the source revision",
    );
  } finally {
    f.cleanup();
  }
});

test("delegate history includes request and notification-only events, retains exact counts, and is bounded", async () => {
  const f = await fixture();
  try {
    f.db
      .prepare("INSERT INTO admin_grants VALUES(?,?,?,1,NULL,NULL)")
      .run(issuer, subject, "details:read");
    f.db.exec(
      "UPDATE requests SET payload=json_set(payload,'$.profileId','01'); UPDATE meetings SET snapshot=json_set(snapshot,'$.delegateId','01'); UPDATE events SET kind='request.saved' WHERE id=1; UPDATE events SET request_id=NULL WHERE id=2;",
    );
    f.db
      .prepare("INSERT INTO requests VALUES(?,?,?,?,?,?)")
      .run(
        "private-meeting-request",
        "private-meeting-key",
        "private-hash",
        JSON.stringify({ delegateId: "01" }),
        "private-room-id",
        now.getTime() - 2000,
      );
    f.db
      .prepare("INSERT INTO events VALUES(?,?,?,?,?,?)")
      .run(
        3,
        "private-meeting-request",
        null,
        "meeting_updated",
        "{}",
        now.getTime() - 25,
      );
    const list = await (
      await f.read("delegates", "?q=Alexander%20Whitmore")
    ).json();
    assert.equal(list.rows.length, 1);
    const response = await f.detail("delegates", list.rowIds[0]);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(
      body.timeline.map((entry: { title: string }) => entry.title),
      ["Meeting updated", "Email delivered", "Request saved"],
    );
    assert.match(body.timeline[1].description, /current status: delivered/);
    assert.equal(body.timeline[0].description, "");
    assert.equal(body.timeline[2].description, "");
    assert.equal(body.timeline[2].at, "2026-10-13T11:59:59.900Z");
    const fields = body.groups.flatMap(
      (group: { fields: { label: string; value: unknown }[] }) => group.fields,
    );
    assert.equal(
      fields.find(
        (field: { label: string }) => field.label === "Consultation requests",
      ).value,
      57,
    );
    assert.equal(
      fields.find(
        (field: { label: string }) => field.label === "Meeting bookings",
      ).value,
      1,
    );
    assert.ok(body.related.length <= 50);
    for (const secret of [
      "secret@example.com",
      "secret-key",
      "private transcript",
      "private-request",
    ])
      assert.ok(!JSON.stringify(body).includes(secret));
    const other = await (await f.read("delegates", "?q=Amara%20Okafor")).json();
    const noHistory = await (
      await f.detail("delegates", other.rowIds[0])
    ).json();
    assert.deepEqual(noHistory.timeline, []);
    const insert = f.db.prepare("INSERT INTO events VALUES(?,?,?,?,?,?)");
    for (let i = 4; i < 108; i++)
      insert.run(
        i,
        "private-request-0",
        null,
        "request.saved",
        "{}",
        now.getTime() - i,
      );
    const bounded = await (await f.detail("delegates", list.rowIds[0])).json();
    assert.equal(bounded.timeline.length, 100);
    assert.ok(bounded.related.length <= 50);
    assert.match(bounded.notice, /latest 100 events/);
  } finally {
    f.cleanup();
  }
});
