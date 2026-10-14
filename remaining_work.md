# Remaining work

- Update legacy pipeline regression fixtures to use a current delegate. `scripts/check-pipeline.ts` and related older scripts still select `test-abhinav-saxena`, absent from the deployed public roster. This pre-existing mismatch is outside this publication; do not restore a public test identity merely to satisfy fixtures.
- Contracts and funding have no authoritative source tables; their sections explicitly report unavailable data. Real source ownership/data is needed before displaying records.
- Meeting transcripts/conversation summaries are not stored here. Details show actual pipeline activity and explain this limit.
- Production delegation keys, independent local grants, browser/outreach credentials, worker configuration and persistent data remain operator-owned outside Git. Source publication does not provision them.
- Verify live provider/worker and browser flows separately using guarded operational scripts. Source-only tests/build do not send mail or activate deployment.
- Provision private outreach contacts through `IR_PRESS_CONTACTS_FILE` (or retain the existing deployment-local path). The data is intentionally excluded from the published source.
