# Influence Rock

The deployed Influence Rock v2 website, public delegate directory, durable email pipeline, private admin workspace and delegated read-only admin connector. This branch publishes the source deployed as `super-admin-details-readable-20261013`; the previous repository baseline contained an earlier homepage prototype without these pipeline prerequisites.

## Run and verify

Use Node.js 22+ and the committed dependency lock.

```sh
npm ci
npm run typecheck
npm run check
node --conditions=react-server --import tsx --test tests/*.test.ts
npm run build
npm start -- --port 4173
```

`npm run dev` serves development on localhost. Configure integrations from `.env.example` in an untracked environment file. The public pages and build require no production credentials. Keep deployment `IR_DATA_DIR` outside the checkout; private requests, mail, session data and SQLite files must never enter Git or public assets.

## Website and directory

Pages live in `app/`, shared UI in `components/`, and the typed roster in `network-profiles.json`. The current directory has 505 country delegates across 195 countries and 14 management profiles, with 519 distinct public portraits. Singapore and Switzerland each have four delegates. The historical SmartMeet test delegate is absent from the public roster. These are fictional digital representatives, not verified employed personnel.

Directory filters, country browsing, profile details, proposals and SmartMeet scheduling are included. `scripts/data/` contains country/leadership inputs and the country-data license. `npm run profiles:generate` regenerates JSON/CSV from these inputs and five portrait manifests. The obsolete historical review manifest is unnecessary with current portrait batches. `ASSETS.md` records provenance. Published asset data includes only public portraits and required JSON manifests; press contacts, original image archives and review screenshots are excluded.

## Pipeline and browser administration

`POST /api/consultations` atomically stores requests and notifications in private SQLite with client idempotency. Preparation workers research public information; the hourly sender uses persisted delegate identities and provider idempotency. SmartMeet remains authoritative for booking status and sends its separate platform confirmation. Provider acceptance and verified delivery remain separate states. Ambiguous old attempts stop instead of risking duplicate mail. Resend webhook signatures are verified before delivery events are stored.

The private admin host provides Dashboard, Proposals, Meetings, Emails and Activity, with search, filters, pagination and details. Browser login uses the environment-configured salted scrypt verifier, host-only session cookies, persistent rate limits and server-side revocation. Outreach authentication uses its separate environment configuration. There is no hardcoded production password. `deploy/` contains service examples requiring operator configuration and private environment files.

## Delegated administration

`/api/admin/v1/overview`, `/api/admin/v1/capabilities`, section lists and record details use pinned Ed25519 delegation independently of browser sessions. Each read requires its exact product/audience/capability and a separate active source-local grant. `overview:read`, `records:read` and `details:read` do not imply one another. The connector checks expiry/revocation again before returning, records private audits and exposes bounded, explicitly selected fields.

See `ADMIN_HANDOFF.md`, `docs/admin-connection.md` and `docs/admin-record-details.md` for configuration, sections, redaction and limits. Contracts and funding explicitly report unavailable authoritative records. The connector performs no business mutations and excludes private email bodies, access URLs, credentials and transcripts.

## Verification limits and deployment

The 40 connector tests use temporary SQLite, real signatures and synthetic private fixtures. They do not read production data or send mail. `npm run check` verifies the current roster and every portrait. Browser/API operational checks are separate scripts; guarded live checks may create synthetic records and are not part of source-only verification.

Legacy pipeline regression scripts still select retired `test-abhinav-saxena`; `check:pipeline` fails before exercising the queue against the current roster. See `remaining_work.md`. This publication preserves deployed pipeline behavior and does not restore a removed public test identity.

Build a new isolated release before activation, preserve private data/configuration, and restart only dedicated Influence Rock services. Git publication does not activate a deployment, modify a production database or publish the master portal.

## Private outreach data

The outreach route reads contacts on the server after authentication from `IR_PRESS_CONTACTS_FILE`, defaulting to the existing deployment path `original-assets/press-contacts.json`. The file is ignored and excluded from this publication; operators should use an external private path. Missing, malformed or oversized files show an unavailable state without presenting fabricated zero counts. The loader accepts at most 2 MiB, 5,000 contacts and 2,000 characters per directory field, and returns only the existing ten contact fields. Existing deployments retaining the same data file preserve their authenticated directory contents. Three synthetic fixture tests cover the loader alongside the 40 connector tests.
