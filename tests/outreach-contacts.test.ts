import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readPressContacts } from "../lib/server/outreach-contacts";

test("missing private contact file reports unavailable rather than an empty directory", async () => {
  assert.equal(await readPressContacts("/nonexistent-ir-private-contacts.json"), null);
});

test("configured private contact fixture retains only the directory fields", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ir-contacts-"));
  try {
    const file = path.join(directory, "contacts.json");
    const contact = {
      id: "sample-1", outlet: "Example newsroom", name: "Sample contact",
      beat: "Science", segment: "science-health", region: "GB",
      contactType: "email", contact: "sample@example.com",
      sourceUrl: "https://example.com/newsroom", sourceChecked: "2026-10-14",
    };
    await writeFile(file, JSON.stringify({ contacts: [{ ...contact, privateNote: "withheld" }] }));
    assert.deepEqual(await readPressContacts(file), [contact]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("malformed or oversized private contact files fail closed", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ir-contacts-"));
  try {
    const file = path.join(directory, "contacts.json");
    for (const content of ["{", '{"contacts":[{"id":"incomplete"}]}', '{"contacts":{}}', " ".repeat(2 * 1024 * 1024 + 1)]) {
      await writeFile(file, content);
      assert.equal(await readPressContacts(file), null);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
