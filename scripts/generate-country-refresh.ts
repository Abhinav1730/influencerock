import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import profiles from "../network-profiles.json";
import countries from "./data/countries.json";
import { portraitGroup, portraitGroups } from "./data/portrait-groups";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workInput = process.env.IR_PORTRAIT_WORK_DIR;
if (
  !workInput ||
  !path.isAbsolute(workInput) ||
  workInput.startsWith(root + path.sep)
)
  throw new Error("Set private IR_PORTRAIT_WORK_DIR outside the repository");
const work: string = workInput;
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error("OPENROUTER_API_KEY required");
const model = "bytedance-seed/seedream-5-0-lite";
const jobCount = 8;
const previousCharge = 21.315;
const totalCap = 22.315;
const quote = 0.035;
const endpoint = await fetch(
  `https://openrouter.ai/api/v1/images/models/${model}/endpoints`,
).then((r) => r.json());
if (
  !endpoint.endpoints
    ?.find((p: { provider_tag: string }) => p.provider_tag === "seed")
    ?.pricing.some(
      (p: { billable: string; unit: string; cost_usd: number }) =>
        p.billable === "output_image" &&
        p.unit === "image" &&
        p.cost_usd <= quote,
    )
)
  throw new Error("Provider price changed");
await fs.mkdir(work, { recursive: true });
await fs.mkdir(path.join(root, "public/assets/portraits/individual"), {
  recursive: true,
});
await fs.writeFile(
  path.join(work, "pricing.json"),
  JSON.stringify(endpoint, null, 2),
);
type Job = {
  profileId: string;
  countryCode: string;
  country: string;
  name: string;
  gender: string;
  group: string;
  prompt: string;
  seed: number;
  image: string;
  traits: Record<string, string>;
  state: string;
  costUSD: number;
  uncertainChargeUSD?: number;
  attempts: number;
  error?: string;
};
const ledgerPath = path.join(work, "ledger.json");
let jobs: Job[] = await fs
  .readFile(ledgerPath, "utf8")
  .then(JSON.parse)
  .catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return [];
  });
if (jobs.length !== jobCount) throw new Error("Unexpected portrait job count");
const charged = () =>
  jobs.reduce((sum, j) => sum + j.costUSD + (j.uncertainChargeUSD ?? 0), 0);
let writes = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(jobs, null, 2);
  writes = writes.then(async () => {
    await fs.writeFile(ledgerPath + ".tmp", snapshot);
    await fs.rename(ledgerPath + ".tmp", ledgerPath);
  });
  return writes;
}
const pendingOnly = process.env.IR_PORTRAIT_ONLY_PLANNED === "1";
let stopped = jobs.some(
  (j) => j.state === "requested" || (j.state === "uncertain" && !pendingOnly),
);
if (stopped)
  throw new Error("Uncertain paid attempt requires review before resuming");
async function generate(job: Job) {
  if (
    stopped ||
    job.state === "complete" ||
    (pendingOnly && job.state === "uncertain")
  )
    return;
  if (previousCharge + charged() + quote > totalCap) {
    stopped = true;
    throw new Error(`$${totalCap} cumulative cap reached`);
  }
  job.state = "requested";
  job.costUSD = quote;
  job.attempts++;
  await persist();
  try {
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: job.prompt,
        resolution: "2K",
        aspect_ratio: "3:4",
        seed: job.seed,
        n: 1,
        provider: { only: ["seed"], allow_fallbacks: false },
      }),
      signal: AbortSignal.timeout(600000),
    });
    const result = await response.json();
    if (!response.ok) {
      job.costUSD = 0;
      job.state = "failed";
      await persist();
      if ([429, 502, 503].includes(response.status) && job.attempts < 3) {
        await new Promise((r) => setTimeout(r, 10000 * job.attempts));
        await generate(job);
        return;
      }
      throw new Error(
        `HTTP ${response.status}: ${String(result.error?.message || "Generation failed").slice(0, 120)}`,
      );
    }
    if (!result.data?.[0]?.b64_json) throw new Error("Missing image output");
    job.costUSD =
      typeof result.usage?.cost === "number" ? result.usage.cost : quote;
    await sharp(Buffer.from(result.data[0].b64_json, "base64"))
      .resize(768, 1024, { fit: "cover" })
      .webp({ quality: 87 })
      .toFile(path.join(root, "public", job.image));
    job.state = "complete";
    await persist();
    console.log(
      `${jobs.filter((j) => j.state === "complete").length}/${jobCount} ${job.profileId} ${job.country} batch=$${charged().toFixed(3)}`,
    );
  } catch (e) {
    job.error = e instanceof Error ? e.message : "Generation failed";
    if (job.state === "requested") job.state = "uncertain";
    stopped = true;
    await persist();
    console.log(`STOP ${job.profileId}: ${job.error}`);
    process.exitCode = 1;
  }
}
let cursor = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (!stopped && cursor < jobs.length) await generate(jobs[cursor++]);
  }),
);
await fs.writeFile(
  path.join(
    root,
    "original-assets/delegate-portrait-manifest-5.json",
  ),
  JSON.stringify(
    {
      model,
      previousProjectChargeUSD: previousCharge,
      totalCapUSD: totalCap,
      batchChargeUSD: charged(),
      portraits: jobs
        .filter((j) => j.state === "complete")
        .map(({ state, attempts, error, ...j }) => j),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Finished ${jobs.filter((j) => j.state === "complete").length}/${jobCount}. Accounted cumulative charge $${(previousCharge + charged()).toFixed(2)}`,
);
