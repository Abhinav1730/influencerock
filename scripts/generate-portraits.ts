import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { portraitGroups } from "./data/portrait-groups";

// Credentials come only from the invoking process. Originals and the resumable
// billing ledger stay outside Git. No request or response containing keys is logged.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workInput = process.env.IR_PORTRAIT_WORK_DIR;
if (!workInput || !path.isAbsolute(workInput))
  throw new Error("Set absolute IR_PORTRAIT_WORK_DIR outside the repository");
const work: string = workInput;
if (work === root || work.startsWith(root + path.sep))
  throw new Error("Private work directory must stay outside the repository");
if (!process.env.OPENROUTER_API_KEY)
  throw new Error("OPENROUTER_API_KEY is required");
const model = "black-forest-labs/flux.2-klein-4b";
const limit = 5;
const reservation = 0.02; // conservative allowance for one explicitly sized image
const pilot = process.argv.includes("--pilot");
const repairAfrica = process.argv.includes("--repair-africa");
await fs.mkdir(work, { recursive: true });
const destination = path.join(root, "public/assets/portraits/openrouter");
await fs.mkdir(destination, { recursive: true });
type Entry = {
  id: string;
  group: string;
  gender: string;
  prompt: string;
  seed: number;
  state: string;
  reserved: number;
  cost?: number;
  image?: string;
  width?: number;
  height?: number;
  error?: string;
};
const ledgerPath = path.join(work, "ledger.json");
const loaded = await fs
  .readFile(ledgerPath, "utf8")
  .then(JSON.parse)
  .catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return [];
  });
const entries: Entry[] = Array.isArray(loaded) ? loaded : loaded.entries;
const endpoint = await fetch(
  `https://openrouter.ai/api/v1/images/models/${model}/endpoints`,
).then((r) => r.json());
const prices = endpoint.endpoints?.find(
  (e: { provider_tag: string }) => e.provider_tag === "black-forest-labs",
)?.pricing;
if (
  !prices ||
  prices.some(
    (p: { cost_usd: number; unit: string }) =>
      p.cost_usd > 0.014 || p.unit !== "megapixel",
  )
)
  throw new Error("Provider price changed; refusing generation");
await fs.writeFile(
  path.join(work, "pricing.json"),
  JSON.stringify(endpoint, null, 2),
);
const charge = () =>
  entries.reduce((sum, e) => sum + (e.cost ?? e.reserved), 0);
let writes = Promise.resolve();
const persist = () => {
  const snapshot = JSON.stringify(
    { model, budgetUSD: limit, entries },
    null,
    2,
  );
  writes = writes.then(async () => {
    await fs.writeFile(ledgerPath + ".tmp", snapshot);
    await fs.rename(ledgerPath + ".tmp", ledgerPath);
  });
  return writes;
};
// Accept the versioned ledger shape; retain compatibility with the initial array.
// The normalized array is loaded above before any reservations are made.
const jobs: Omit<Entry, "state" | "reserved">[] = [];
const faces = [
  "oval face, close-cropped hair",
  "broad face, natural wavy hair",
  "angular face, swept-back hair",
  "rounded face, short textured hair",
  "long face, neatly styled hair",
  "square jaw, salt-and-pepper hair",
  "high cheekbones, dark curly hair",
  "soft jawline, silver-streaked hair",
];
let seed = 910100;
// Interleave pools so the pilot covers all twelve groups and both genders.
for (let variation = 0; variation < (pilot ? 1 : 8); variation++)
  for (const [group, info] of Object.entries(portraitGroups))
    for (const gender of ["male", "female"]) {
      const id = `${group}-${gender}-${variation + 1}`;
      const age = 34 + ((variation * 7 + seed) % 25);
      const appearance =
        gender === "female"
          ? faces[variation]
              .replace("short textured hair", "shoulder-length textured hair")
              .replace("close-cropped hair", "neatly styled short hair")
              .replace(
                "salt-and-pepper hair",
                "shoulder-length salt-and-pepper hair",
              )
          : faces[variation];
      const context =
        group === "americas"
          ? [
              "Latin American",
              "Afro-Caribbean",
              "Mexican with Indigenous ancestry",
              "Brazilian with mixed ancestry",
              "Argentine with European ancestry",
              "Andean Latin American",
              "African-American",
              "North American with European ancestry",
            ][variation]
          : group === "oceania"
            ? [
                "Pacific Islander",
                "Polynesian Samoan",
                "Melanesian Papua New Guinean",
                "Indigenous Fijian",
                "Australian with European ancestry",
                "New Zealander with Maori ancestry",
                "Australian with mixed ancestry",
                "Polynesian Tongan",
              ][variation]
            : info.context;
      const prompt = `Premium editorial corporate studio photograph of exactly one fictional ${gender} international relations professional, aged ${age}, with ${context} background. ${["west-africa", "east-africa", "southern-africa"].includes(group) ? "Black African heritage, rich deep-brown skin, naturally tightly coiled African-textured hair, varied individual Black African facial features." : ""} ${appearance}. ${gender === "female" ? "Distinct individual hairstyle, tailored navy or charcoal blazer over an ivory blouse" : "Tailored charcoal or navy business suit, white shirt and understated tie"}. ${variation % 3 === 1 ? "Thin professional eyeglasses." : "No glasses."} Natural skin texture and realistic age lines, individual facial proportions, calm approachable expression, direct eye contact. Eye-level 85mm portrait, chest-up, complete head with comfortable headroom, shoulders visible, centered vertical composition. Soft flattering window-style lighting, muted warm-gray studio backdrop, consistent professional photographic quality, natural colors. One person only. No lettering, logos, flags, watermarks, props or collage. Original imagined individual, no celebrity likeness.`;
      const jobSeed = seed++;
      if (
        repairAfrica &&
        !(
          /^(west|east|southern)-africa-/.test(id) &&
          [1, 2, 4].includes(variation)
        )
      )
        continue;
      if (repairAfrica) {
        const previous = entries.find(
          (e) => e.id === id && e.state === "complete",
        );
        if (previous && !previous.prompt.includes("Black African heritage"))
          previous.state = "superseded";
      }
      jobs.push({ id, group, gender, prompt, seed: jobSeed });
    }
let stopped = false;
async function runJob(job: (typeof jobs)[number]) {
  if (
    stopped ||
    entries.some((e) => e.id === job.id && e.state !== "superseded")
  )
    return; // ambiguous attempts are not blindly retried
  if (charge() + reservation > limit) {
    console.log("Budget cap reached; stopped safely");
    stopped = true;
    return;
  }
  const entry: Entry = { ...job, state: "requested", reserved: reservation };
  entries.push(entry);
  await persist();
  try {
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: job.prompt,
        size: "768x1024",
        output_format: "jpeg",
        n: 1,
        seed: job.seed,
        provider: { only: ["black-forest-labs"], allow_fallbacks: false },
      }),
      signal: AbortSignal.timeout(180000),
    });
    const result = await response.json();
    if (!response.ok) {
      entry.state = "failed";
      entry.cost = 0;
      throw new Error(
        `HTTP ${response.status}: ${String(result.error?.message || "Generation failed").slice(0, 160)}`,
      );
    }
    if (!result.data?.[0]?.b64_json) throw new Error("Missing image output");
    entry.cost =
      typeof result.usage?.cost === "number" ? result.usage.cost : reservation;
    const bytes = Buffer.from(result.data[0].b64_json, "base64");
    const metadata = await sharp(bytes).metadata();
    entry.width = metadata.width;
    entry.height = metadata.height;
    if ((metadata.width ?? 0) * (metadata.height ?? 0) > 1100000)
      throw new Error("Unexpected dimensions; stop to review billing");
    await fs.writeFile(path.join(work, `${job.id}.jpg`), bytes);
    await sharp(bytes)
      .resize(600, 800, { fit: "cover" })
      .webp({ quality: 84 })
      .toFile(path.join(destination, `${job.id}.webp`));
    entry.image = `/assets/portraits/openrouter/${job.id}.webp`;
    entry.state = "complete";
    await persist();
    console.log(
      `${entries.filter((e) => e.state === "complete").length}/${jobs.length} ${job.id} cost=$${charge().toFixed(4)}`,
    );
  } catch (e) {
    entry.error = e instanceof Error ? e.message : "Generation failed";
    if (entry.state === "requested") entry.state = "uncertain";
    await persist();
    console.log(`STOP ${job.id}: ${entry.error}`);
    process.exitCode = 1;
    stopped = true;
  }
}
let cursor = 0;
await Promise.all(
  Array.from({ length: pilot ? 1 : 6 }, async () => {
    while (!stopped && cursor < jobs.length) {
      const job = jobs[cursor++];
      await runJob(job);
    }
  }),
);
await fs.writeFile(
  path.join(root, "scripts/data/portrait-library.json"),
  JSON.stringify(
    {
      model,
      generatedAt: new Date().toISOString(),
      budgetUSD: limit,
      accountedCostUSD: charge(),
      portraits: entries
        .filter((e) => e.state === "complete")
        .map(
          ({
            id,
            group,
            gender,
            image,
            prompt,
            seed,
            cost,
            width,
            height,
          }) => ({
            id,
            group,
            gender,
            image,
            prompt,
            seed,
            cost,
            width,
            height,
          }),
        ),
    },
    null,
    2,
  ) + "\n",
);
