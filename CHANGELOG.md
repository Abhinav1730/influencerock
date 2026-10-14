# Changelog

## 2026-10-14 — deployed v2 source and delegated admin publication

- Publish the actual deployed website, 519-profile directory/assets, proposal pipeline, SmartMeet bridge, email workers and private admin workspace, replacing the incomplete homepage prototype baseline.
- Include delegated aggregate overview, seven section tabs, stable row IDs and bounded details with independent overview/records/details grants, audit/revocation checks and private-field redaction.
- Include 40 connector tests and configuration/handoff documentation without production data or credentials.
- Retain five required portrait JSON manifests; exclude press contacts, source image stash and screenshots.
- Skip the obsolete review-sample manifest when current portrait batches exist, allowing published roster regeneration without runtime changes.
- Ignore private databases, credential files and local build/verification artifacts.
- Load private outreach contacts from an optional external server file instead of a bundled import; retain the existing deployment path by default, bound/validate the JSON and show unavailable when absent. Three synthetic loader tests verify this publication prerequisite.
