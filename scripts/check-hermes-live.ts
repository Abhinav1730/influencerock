import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { hermesResearch } from "../lib/server/pipeline";
const started = Date.now();
const draft = await hermesResearch({
  topic: "India UPI digital payments architecture",
  objective:
    "Discuss UPI architecture and interoperability at a high level, using current official NPCI sources.",
  delegate: {
    name: "Abhinav Saxena",
    expertise: "Technology",
    country: "India",
    bio: "Influence Rock AI representative for a synthetic verification request.",
  },
});
assert.equal(draft.mode, "hermes");
console.log("Research diagnostic", JSON.stringify(draft.evidence));
assert(
  draft.sources.length > 0,
  "Live Hermes research must produce independently observed web sources",
);
assert(draft.insights.length > 0);
await writeFile(
  "review/backend-verification/hermes-live.json",
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      syntheticInput: true,
      draft,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      verified: true,
      elapsedMs: Date.now() - started,
      sourceCount: draft.sources.length,
      insightCount: draft.insights.length,
      sources: draft.sources,
    },
    null,
    2,
  ),
);
