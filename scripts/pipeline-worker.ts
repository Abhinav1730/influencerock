import { PipelineStore } from "../lib/server/pipeline-store";
import { prepareOne, sendOne } from "../lib/server/pipeline";

const mode = process.argv[2];
if (!["prepare", "send"].includes(mode)) throw new Error("Use prepare or send");
const store = new PipelineStore();
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
try {
  if (mode === "send") {
    let count = 0;
    while (!stopping && count < 500 && (await sendOne(store))) {
      count++;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    store.health("sender", { processed: count });
    console.log(`Hourly sender processed ${count} messages.`);
  } else {
    while (!stopping) {
      store.health(`preparation-${process.env.IR_WORKER_ID || "1"}`, {
        running: true,
      });
      if (!(await prepareOne(store)))
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
} finally {
  store.close();
}
