# Influence Rock admin handoff

Baseline: the complete v2 application deployed in `super-admin-details-readable-20261013`, including directory, proposal intake, SmartMeet bridge, durable email workers and private browser administration. The earlier repository homepage prototype lacked these required source dependencies.

## Delegated access

Configure `ADMIN_DELEGATION_KEYS` with exact issuer URLs and Ed25519 public SPKI PEM keys, and `ADMIN_DELEGATION_AUDIENCE=ir-admin`. Signing private keys remain exclusively with the master portal. Use the existing persistent `IR_DATA_DIR`; the connector must not create an empty replacement pipeline.

Initialize the admin schema with `initializeAdminConnection(db)`, then explicitly provision separate source-local grants for `overview:read`, `records:read` and `details:read`. No grant is automatic, and browser cookies cannot authorize delegated routes. See `docs/admin-connection.md` for SQL and token requirements. Expiry and revocation are checked before and after reads. Admin schema/audits are the connector's only writes.

## Read surfaces

| Surface | Capability | Source projection |
| --- | --- | --- |
| Overview/capabilities | `overview:read` | Aggregate pipeline/directory counts and provenance |
| Opportunities | `records:read` / `details:read` | Consultation metadata, public delegate and linked schedule/status |
| Organizations | `records:read` / `details:read` | Organization names supplied on requests and associated activity |
| Delegates | `records:read` / `details:read` | Public directory profile, linked counts and actual activity |
| Introductions | `records:read` / `details:read` | Meeting schedule/status, redacted title/agenda and pipeline history |
| Activity | `records:read` / `details:read` | Recorded event kind/time and allowlisted notification context |
| Contracts/funding | `records:read` | Authoritative source unavailable; empty rows, null total |

List rows have stable section-scoped hashed IDs for detail lookup. Search/pagination preserve IDs. Details use bounded groups/fields/history/related records and private/no-store responses. Meeting email addresses, HTTP links and recognizable credentials are redacted; organizer identity, request objectives, raw payloads, email bodies/drafts, access URLs and transcripts are excluded. A pipeline timeline is not a conversation summary. Human-readable event titles show recorded facts without inventing historical notification states.

## Authentication and publication boundary

The browser dashboard uses `IR_ADMIN_PASSWORD_SCRYPT` and revocable hashed session tokens; outreach uses its independent environment configuration. Neither contains a hardcoded production password. Never copy credential files, databases, mail records, private generation ledgers or signing keys into Git.

Run clean `npm ci`, `npm run typecheck`, `npm run check`, `node --conditions=react-server --import tsx --test tests/*.test.ts` and `npm run build`. The 40 connector tests cover signature/claims, independent grants, expiry/revocation, audits, redaction, revisions and actual SQLite event joins.

Assets include deployed public portraits and five JSON manifests required by roster validation/regeneration. Source PNG archives, press contacts and screenshots are excluded. `remaining_work.md` records the legacy pipeline fixture limitation. Source publication does not provision production grants or activate a release.

## Private outreach data

The outreach route reads contacts on the server after authentication from `IR_PRESS_CONTACTS_FILE`, defaulting to the existing deployment path `original-assets/press-contacts.json`. The file is ignored and excluded from this publication; operators should use an external private path. Missing, malformed or oversized files show an unavailable state without presenting fabricated zero counts. The loader accepts at most 2 MiB, 5,000 contacts and 2,000 characters per directory field, and returns only the existing ten contact fields. Existing deployments retaining the same data file preserve their authenticated directory contents. Three synthetic fixture tests cover the loader alongside the 40 connector tests.
