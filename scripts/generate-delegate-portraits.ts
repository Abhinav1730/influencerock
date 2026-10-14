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
const secondBatch = process.env.IR_PORTRAIT_BATCH === "2";
const previousCharge = secondBatch ? 6.79 : 3.29;
const totalCap = secondBatch ? 10.3 : 7;
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
function shuffle<T>(values: T[]) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
if (!jobs.length) {
  const candidates = profiles.filter(
    (p) =>
      p.seniority === "Country Network" &&
      p.portraitSource !== "openrouter-individual-country-portrait",
  );
  const buckets = new Map<string, typeof candidates>();
  for (const p of shuffle(candidates)) {
    const c = countries.find((c) => c.code === p.countryCode)!;
    const group = portraitGroup(c);
    const bucket = group + ":" + p.gender;
    buckets.set(bucket, [...(buckets.get(bucket) || []), p]);
  }
  const selected: typeof candidates = [];
  while (selected.length < 100) {
    let progressed = false;
    for (const bucket of buckets.values()) {
      const p = bucket.shift();
      if (p) {
        selected.push(p);
        progressed = true;
      }
      if (selected.length === 100) break;
    }
    if (!progressed) throw new Error("Insufficient candidate profiles");
  }
  const faces = [
    "round face with full cheeks and a soft jaw",
    "long slim face with an angular chin",
    "wide square jaw and broad forehead",
    "heart-shaped face with a small rounded chin",
    "diamond-shaped face and high cheekbones",
    "oval face with a strong rounded nose",
    "broad oblong face with a prominent chin",
    "soft rectangular face and a distinctive nose bridge",
    "narrow face with naturally asymmetric cheekbones",
    "full face and a slightly crooked smile",
  ];
  const environments = [
    "bright contemporary office with leafy indoor plants",
    "shaded outdoor terrace with softly blurred trees",
    "warm wood-lined meeting room",
    "sunlit urban balcony with a blurred city background",
    "modern university courtyard under soft overcast daylight",
    "airy lobby with textured stone and natural wood",
    "quiet office library with soft warm lighting",
    "window-side workspace overlooking a modern city",
    "garden walkway outside a professional campus",
    "simple pale-blue photographic backdrop with warm side lighting",
    "professional coworking lounge with muted teal furnishings",
    "sunlit conference room with soft cream walls",
  ];
  const expressions = [
    "warm open smile showing teeth",
    "calm thoughtful expression with relaxed lips",
    "gentle asymmetric half-smile",
    "confident relaxed smile",
    "engaged friendly expression, eyes slightly off camera",
  ];
  const poses = [
    "three-quarter angle turned toward camera",
    "relaxed upright front-facing posture",
    "seated slightly sideways with relaxed shoulders",
    "casually leaning on the edge of a desk",
    "shoulders at a slight angle, head turned toward camera",
  ];
  const colors = [
    "forest-green",
    "taupe",
    "navy",
    "soft terracotta",
    "charcoal",
    "light-gray",
    "muted plum",
    "sand-colored",
    "slate-blue",
    "burgundy",
  ];
  const maleHair = [
    "short naturally textured hair",
    "wavy medium-length hair",
    "closely shaved head",
    "salt-and-pepper curls",
    "neatly styled hair with a receding hairline",
    "longer hair tied back",
    "short hair with gray temples",
  ];
  const femaleHair = [
    "short natural curls",
    "shoulder-length waves",
    "chin-length bob",
    "neatly pinned-up hair",
    "natural textured hair in a high puff",
    "long loosely tied-back hair",
    "silver-streaked shoulder-length hair",
    "short cropped hairstyle",
  ];
  const maleClothes = [
    "an unstructured COLOR blazer and a light-blue open-collar shirt",
    "a charcoal blazer over a COLOR knit polo",
    "a tailored COLOR business suit and a white shirt without a tie",
    "a COLOR linen jacket and an ivory shirt",
    "a dark jacket over a COLOR fine-knit sweater",
  ];
  const femaleClothes = [
    "a COLOR linen jacket over an ivory blouse",
    "a dark blazer and a COLOR silk blouse",
    "a COLOR tailored jacket over a cream knit top",
    "a minimalist COLOR blazer with a pale-blue top",
    "a COLOR professional blouse with a charcoal jacket",
  ];
  const pick = <T>(items: T[]) => items[crypto.randomInt(items.length)];
  jobs = selected.map((p, i) => {
    const c = countries.find((c) => c.code === p.countryCode)!;
    const group = portraitGroup(c);
    const age = 29 + crypto.randomInt(34);
    const face = faces[i % faces.length];
    const hair = pick(p.gender === "Male" ? maleHair : femaleHair);
    const clothes = pick(
      p.gender === "Male" ? maleClothes : femaleClothes,
    ).replace("COLOR", pick(colors));
    const setting =
      environments[(i + Math.floor(i / 12)) % environments.length];
    const expression = pick(expressions);
    const pose = pick(poses);
    const glasses =
      i % 5 === 0 ? "Thin distinctive professional eyeglasses." : "No glasses.";
    const facialHair =
      p.gender === "Male"
        ? pick([
            "Clean-shaven.",
            "Short neatly trimmed beard.",
            "Subtle natural stubble.",
            "Neatly groomed moustache.",
          ])
        : "";
    const traits = {
      age: String(age),
      face,
      hair,
      clothes,
      setting,
      expression,
      pose,
      glasses,
      facialHair,
    };
    const context = portraitGroups[group].context;
    const african = ["west-africa", "east-africa", "southern-africa"].includes(
      group,
    )
      ? "Black African heritage with naturally varied rich brown skin tones and natural African-textured hair."
      : "Natural features and varied skin tones appropriate to this country and regional background.";
    const prompt = `Editorial environmental photograph of one explicitly fictional ${age}-year-old ${p.gender.toLowerCase()} international-relations professional from ${p.country}, with ${context} background. ${african} Individual facial anatomy: ${face}, unique eye spacing, natural asymmetry, realistic skin texture and age marks. Hair: ${hair}. ${facialHair} ${glasses} Clothing: ${clothes}. Setting: ${setting}, appropriate to a contemporary professional environment in ${p.country}. Pose: ${pose}. Expression: ${expression}. Chest-up vertical composition, complete head visible with comfortable headroom. Natural location-specific light, authentic skin colors, subtle depth of field. The person is the clear focus. Preserve distinct individuality rather than a generic beauty-model face or standardized studio template. One original imagined individual only, no other people, celebrity likeness, lettering, logos, flags, watermark, collage, beauty smoothing, matching uniform or gray studio backdrop.`;
    return {
      profileId: p.id,
      countryCode: p.countryCode!,
      country: p.country,
      name: p.name,
      gender: p.gender,
      group,
      prompt,
      seed: crypto.randomInt(2147483647),
      image: `/assets/portraits/individual/${p.id.toLowerCase()}.webp`,
      traits,
      state: "planned",
      costUSD: 0,
      attempts: 0,
    };
  });
  await fs.writeFile(ledgerPath, JSON.stringify(jobs, null, 2));
}
if (jobs.length !== 100) throw new Error("Expected exactly 100 portrait jobs");
const charged = () => jobs.reduce((sum, j) => sum + j.costUSD, 0);
let writes = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(jobs, null, 2);
  writes = writes.then(async () => {
    await fs.writeFile(ledgerPath + ".tmp", snapshot);
    await fs.rename(ledgerPath + ".tmp", ledgerPath);
  });
  return writes;
}
let stopped = jobs.some(
  (j) => j.state === "requested" || j.state === "uncertain",
);
if (stopped)
  throw new Error("Uncertain paid attempt requires review before resuming");
async function generate(job: Job) {
  if (stopped || job.state === "complete") return;
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
      signal: AbortSignal.timeout(180000),
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
      `${jobs.filter((j) => j.state === "complete").length}/100 ${job.profileId} ${job.country} batch=$${charged().toFixed(3)}`,
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
    secondBatch
      ? "original-assets/delegate-portrait-manifest-2.json"
      : "original-assets/delegate-portrait-manifest.json",
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
  `Finished ${jobs.filter((j) => j.state === "complete").length}/100. Accounted cumulative charge $${(previousCharge + charged()).toFixed(2)}`,
);
