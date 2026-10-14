# Delegated read-only admin connection

Influence Rock exposes `GET /api/admin/v1/overview` and `GET /api/admin/v1/capabilities` on its existing Next.js server. These server-to-server routes use their own bearer authorization, independent of browser admin cookies and login. Existing proxy matching does not intercept either path. Section records are available through `GET /api/admin/v1/sections/<section>` with the separate capability described below. Other resources return 404; mutations have no handler.

Set `ADMIN_DELEGATION_KEYS` to a JSON object mapping exact issuer URLs to Ed25519 SPKI public PEM keys (one to eight issuers). Set `ADMIN_DELEGATION_AUDIENCE=ir-admin` (the default). `IR_DATA_DIR` must remain the same persistent directory used by the running pipeline; the connector opens its existing `pipeline.sqlite`, without creating an empty pipeline or assigning senders. Never put signing private keys in Influence Rock or expose this configuration through `NEXT_PUBLIC_*`.

The compact JWT must have `alg=EdDSA`, `typ=admin-delegation+jwt`, a valid pinned signature, exact trusted `iss`, nonempty `sub` of at most 255 characters, expected `aud`, `product=ir`, `capability=overview:read`, a positive integer `grantVersion`, and `actor={issuer:<OIDC issuer URL>,subject:sub}`. Required integer `iat` and `exp` allow at most 90 seconds lifetime and age, with no clock tolerance and no future issue time. Expired tokens and future `nbf` are rejected. Header-directed key lookup and unsupported critical headers are never used.

## Independent local authorization

The source-owned `initializeAdminConnection(db)` migration creates only these admin tables in the pipeline database. Existing overview audits are retained while the resource CHECK is expanded transactionally; indexes and triggers are preserved:

```sql
CREATE TABLE IF NOT EXISTS admin_grants (
  issuer TEXT NOT NULL, subject TEXT NOT NULL, capability TEXT NOT NULL,
  grant_version INTEGER NOT NULL CHECK(grant_version > 0),
  revoked_at INTEGER, expires_at INTEGER,
  PRIMARY KEY(issuer,subject,capability)
);
CREATE TABLE IF NOT EXISTS admin_read_audit (
  id INTEGER PRIMARY KEY, actor_hash TEXT NOT NULL,
  capability TEXT NOT NULL,
  resource TEXT NOT NULL CHECK(resource IN ('overview','capabilities','opportunities','organizations','delegates','introductions','contracts','funding','activity')),
  outcome TEXT NOT NULL CHECK(outcome IN ('allowed','denied')),
  source_revision TEXT, created_at INTEGER NOT NULL
);
```

No operator is automatically granted access. A deployment operator must initialize the schema and explicitly insert a binding, with the exact OIDC actor issuer, subject, and capability asserted by the master portal. The signing JWT issuer is distinct: `https://super-admin.universa.science`; the OIDC actor issuer is `https://super-admin.universa.science/identity`. For the approved master identity, run this against the existing pipeline database after migration:

```sql
INSERT INTO admin_grants(issuer,subject,capability,grant_version)
VALUES('https://super-admin.universa.science/identity','universa-super-admin','overview:read',1);
```

`expires_at` and `revoked_at` use Unix milliseconds; NULL means no local expiry or no revocation, respectively. Revoke the binding with:

```sql
UPDATE admin_grants
SET revoked_at=CAST(unixepoch('subsec')*1000 AS INTEGER)
WHERE issuer='https://super-admin.universa.science/identity'
  AND subject='universa-super-admin' AND capability='overview:read';
```

The JWT `grantVersion` must be positive and belongs to the portal authorization state; it is independent of this source-local `grant_version` metadata. Source-local revocation and expiry remain authoritative. Both resources check the persisted binding before reading and again outside the aggregate snapshot immediately before returning, including local expiry and delegated token expiry. Audits store a SHA-256 identity tuple fingerprint, capability, resource, time, outcome, and aggregate revision; they contain no token or raw customer/meeting/email records. Failed signature checks and initially unbound requests do not create audit records. A request revoked after aggregation is audited as denied.

## Responses and provenance

The overview exactly follows the strict shared `AdminOverview` response fields: `schemaVersion:1`, `product:'ir'`, `sourceRevision`, `observedAt`, `fetchedAt`, `state:'connected'`, `metrics`, and `capabilities:['overview:read']`. No record IDs, email addresses, meeting links, agendas, messages, conversations, or credentials are returned. Capabilities responds with exactly `{schemaVersion:1,product:'ir',capabilities:['overview:read']}` and requires the same binding.

Metrics use real pipeline aggregate SQL and the deployed directory source:

- `requests` counts all requests; `proposals` counts requests with no meeting ID.
- `meetings` counts meeting snapshots; `meetings_upcoming` counts future starts with pending/confirmed booking status; `meetings_confirmed` counts confirmed bookings; `meetings_active` and `meetings_ended` count their persisted session statuses.
- `emails` counts notifications; `emails_queued` counts pending/preparing/ready/sending; `emails_delivered` counts delivered; `emails_attention` counts failed/bounced/complained/uncertain. Sent is distinct from delivered.
- `events` counts pipeline events; `directory_profiles` and `directory_countries` count the deployed directory.

`observedAt` and `fetchedAt` are this request's observation time, including when sources are empty. `sourceRevision` is `sha256:` followed by a hash of the aggregate metrics, last source mutation timestamp, and deployed directory fingerprint. It identifies the aggregate source state, not a Git revision or a record-level checksum. Notification changes are reflected through their counts; normal worker transitions also append timestamped pipeline events.

Reads use a SQLite read transaction and return a fixed number of aggregate rows. Each table is checked with a bounded 100,001-row preflight; sources exceeding 100,000 rows per table fail closed with 503 rather than silently return partial totals. Lock waits are capped at one second. Missing database, malformed source JSON/timestamps, failed audit writes, or invalid key configuration return a generic 503. Invalid delegation returns 401, missing/revoked/expired binding returns 403. All JSON responses are private/no-store and vary on Authorization. Operational audit retention remains deployment policy; existing pipeline retention is unchanged.

Verify without a production database or credentials:

```sh
node --conditions=react-server --import tsx --test tests/*.test.ts
npm run typecheck
```

The tests use isolated temporary SQLite databases, actual Ed25519 signatures, private record fixtures, and a SQLite trigger to exercise revocation after aggregation. No new runtime dependency is needed.

`observedAt` records the current aggregate query time, including for an empty pipeline. `sourceRevision` hashes the metrics, last source mutation and directory revision; it stays stable when unchanged data is freshly observed.


## Read-only section records

`GET /api/admin/v1/sections/<section>?page=1&q=search` accepts only `opportunities`, `organizations`, `delegates`, `introductions`, `contracts`, `funding`, and `activity`. Requests require a pinned Ed25519 delegation with `capability=records:read` and an independent source-local `records:read` grant. An `overview:read` token or grant cannot authorize this endpoint. The overview and capabilities response contracts remain unchanged.

The deployment operator explicitly provisions the separate binding:

```sql
INSERT INTO admin_grants(issuer,subject,capability,grant_version)
VALUES('https://super-admin.universa.science/identity','universa-super-admin','records:read',1);
```

The positive page number defaults to 1 and is capped at 20,000. Each page contains at most 50 rows. Search is at most 120 characters; duplicate `page` or `q` parameters and invalid page values return 400. Parameterized literal substring search never treats SQL, `%`, or `_` as syntax. Search only uses the same safe fields available in the tab. Returned scalar strings are at most 300 characters.

Each response contains exactly the overview envelope (`schemaVersion`, `product`, `state`, `sourceRevision`, `observedAt`, `fetchedAt`, `metrics`, `capabilities`) plus `section`, `title`, `description`, `columns`, `rows`, `page`, `pageSize`, `total`, and `notice`. Section capabilities are exactly `['records:read']`; `pageSize` is 50. The section revision hashes the source overview revision, section, matched count, and displayed safe rows. Source counts and last mutations, directory changes, and changes to the displayed projection therefore contribute to provenance.

- Opportunities project real consultation requests into organization, expertise, jurisdictions, timeframe, linkage status, and creation time. Names, email addresses, objectives, source keys, and private raw identifiers are excluded.
- Organizations group the organization names actually supplied on requests, with request counts and last request timestamps. The description explicitly identifies this source; it is not an organization verification registry.
- Delegates expose public directory name, role, representation, location, expertise, industry, and network role.
- Introductions project actual meeting booking/session/result statuses, schedule, timezone, and update timestamp. Meeting titles, agendas, organizer details, conversation tokens, meeting links, and raw room identifiers are excluded. Request and meeting references are one-way truncated SHA-256 fingerprints and cannot be used as the original access identifiers.
- Activity exposes only event kind and recorded timestamp. Event details and related private identifiers are excluded.
- Contracts and funding return `rows:[]`, `total:null`, and an explicit notice that the source does not currently store authoritative records. They do not claim a zero total or invent business records.

The same before/after grant, token-expiry, and source-local revocation checks apply. Successful reads audit the exact section and `records:read` capability; late revocation changes that audit to denied. Pipeline business records are never written by these handlers. Admin schema migration and audit records are the only writes.
