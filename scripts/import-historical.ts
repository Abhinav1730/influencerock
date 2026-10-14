import fs from "node:fs/promises";
import path from "node:path";
import { PipelineStore } from "../lib/server/pipeline-store";
import { validateConsultation } from "../lib/server/consultations";
const store = new PipelineStore();
try {
  let source = "";
  try {
    source = await fs.readFile(
      path.join(process.env.IR_DATA_DIR || "data", "consultations.jsonl"),
      "utf8",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let count = 0;
  for (const line of source.split("\n").filter(Boolean)) {
    const record = JSON.parse(line);
    const createdAt = Date.parse(record.createdAt);
    if (createdAt < Date.now() - 90 * 86400_000) continue;
    store.importHistorical(validateConsultation(record), record.id, createdAt);
    count++;
  }
  console.log(
    `Imported ${count} historical enquiries for visibility. No outgoing notifications created.`,
  );
} finally {
  store.close();
}
