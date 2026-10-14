# Delegated record details

GET `/api/admin/v1/sections/:section/:resourceId` reads one source record. It requires an Ed25519 delegation with exact product `ir`, audience `ir-admin`, capability `details:read`, plus a separate active local `admin_grants` binding. `records:read` does not authorize details. Expiry and local revocation are checked again after the audited read.

Section list envelopes add `rowIds`, aligned exactly with `rows`. IDs are stable 32-character SHA-256 prefixes scoped to their section; source keys, meeting IDs and access URLs are never returned. Search and pagination retain the same record IDs. Contracts and funding have no authoritative source rows and return empty IDs.

The detail envelope contains only schemaVersion, product, section, resourceId, state, sourceRevision, observedAt, fetchedAt, capabilities, title, groups, timeline, related and notice. Missing or mismatched IDs return 404 with a notfound envelope after authorization. Invalid IDs and unknown sections return 404. Responses are private/no-store.

Source detail fields are explicitly selected in fixed SQL and bounded before rendering. Details include:

- Opportunities: consultation metadata, public delegate, linked meeting schedule/status, notification counts and actual events.
- Organizations: source name grouping, request/linked meeting counts, related requests and actual events.
- Delegates: public biography, languages and directory fields, request/meeting counts, related records and actual request/notification events (including requests linked through the delegate’s meeting bookings).
- Introductions: meeting title/agenda, public delegate, schedule and recorded statuses, notification counts, related requests and actual events joined through `requests.meeting_id`.
- Activity: recorded event kind/time, allowlisted notification state, related request and meeting context.

Meeting context redacts email addresses, HTTP links and recognizable credentials. Organizer identity, request objectives, raw event payloads, email messages/drafts, errors, access links, credentials and transcripts are not projected. Meeting conversation summaries/transcripts are not stored in this source; the notice explains that the displayed history is pipeline activity rather than a discussion account. Timeline titles render event kinds as readable phrases (for example, `meeting_updated` becomes “Meeting updated”); raw kinds remain in Activity fields. Event descriptions show only available notification facts and remain empty when no such facts are recorded. Current notification status is labeled as current, not as the historic status at the event time.

Reads retain the existing 100,000-row per-table preflight. Detail output is bounded to 12 groups, 30 fields per group, 6,000 characters per value, 100 timeline events and 50 related records. Fixed projection shapes keep the complete envelope below the portal's 512 KiB limit. Related sets and histories are explicitly labeled when truncated. Source revisions hash the displayed source content without fetch timestamps.

Audit uses the existing section resource names with capability `details:read`. This change does not grant access or mutate meeting, request, notification or event records.

Verification: `node --conditions=react-server --import tsx --test tests/*.test.ts` (40 tests), `npm run typecheck`, and `npm run build`. Tests use real SQLite, including wrong product/capability, independent grants, expiry, audit-trigger revocation, missing/wrong-section IDs, search/page ID alignment, actual meeting event joins, redaction and revision changes.
