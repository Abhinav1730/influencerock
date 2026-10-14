import fs from "node:fs/promises";
import { PipelineStore } from "../lib/server/pipeline-store";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(
  process.env.IR_DATA_DIR || path.join(root, "data"),
  "consultations.jsonl",
);
const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
let source;
try {
  source = await fs.readFile(file, "utf8");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") source = "";
  else throw error;
}
const lines = source.split("\n").filter(Boolean);
const retained = lines.filter((line) => {
  const record = JSON.parse(line),
    timestamp = Date.parse(record.createdAt);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid enquiry timestamp");
  return timestamp >= cutoff;
});
if (retained.length !== lines.length) {
  const temp = file + ".retention";
  await fs.writeFile(temp, retained.length ? retained.join("\n") + "\n" : "", {
    mode: 0o600,
  });
  if ((await fs.readFile(file, "utf8")) !== source) {
    await fs.unlink(temp);
    throw new Error("Enquiries changed during retention; retry next run");
  }
  await fs.rename(temp, file);
}
console.log(
  `Retention: removed ${lines.length - retained.length} expired enquiries.`,
);

const store = new PipelineStore();
try {
  console.log(
    `Pipeline retention: removed ${store.prune(cutoff)} expired requests.`,
  );
  store.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
} finally {
  store.close();
}
