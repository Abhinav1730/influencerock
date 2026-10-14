import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import profiles from "../network-profiles.json";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "review/portrait-samples-2026-10-09");
const model = "bytedance-seed/seedream-5-0-lite";
const budget = 0.75;
const quote = 0.035;
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey)
  throw new Error("OPENROUTER_API_KEY required in process environment");
const previousProjectCharge = 2.94;
if (previousProjectCharge + budget > 5)
  throw new Error("Previous project budget exceeded");
const endpoint = await fetch(
  `https://openrouter.ai/api/v1/images/models/${model}/endpoints`,
).then((r) => r.json());
const provider = endpoint.endpoints?.find(
  (p: { provider_tag: string }) => p.provider_tag === "seed",
);
if (
  !provider?.pricing.some(
    (p: { billable: string; unit: string; cost_usd: number }) =>
      p.billable === "output_image" &&
      p.unit === "image" &&
      p.cost_usd <= quote,
  )
)
  throw new Error("Provider pricing changed");
await fs.mkdir(output, { recursive: true });
type Sample = {
  id: string;
  country: string;
  name: string;
  gender: string;
  image: string;
  seed: number;
  prompt: string;
  state: string;
  costUSD: number;
  traits: Record<string, string>;
  error?: string;
};
const manifestPath = path.join(output, "manifest.json");
const manifest = await fs
  .readFile(manifestPath, "utf8")
  .then(JSON.parse)
  .catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return {
      model,
      budgetUSD: budget,
      previousProjectChargeUSD: previousProjectCharge,
      samples: [],
    };
  });
const samples: Sample[] = manifest.samples;
const directions = [
  {
    code: "NG",
    gender: "Female",
    context:
      "Nigerian, Black West African heritage, deep brown skin, expressive full lips",
    hair: "natural textured hair in a high puff",
    outfit:
      "cream linen jacket over a forest-green blouse, small gold earrings",
    setting: "bright contemporary office with indoor plants",
    pose: "relaxed shoulders, three-quarter angle, warm open smile",
  },
  {
    code: "KE",
    gender: "Male",
    context: "Kenyan, Black East African heritage, rich brown skin",
    hair: "closely shaved head and a short neatly shaped beard",
    outfit: "burgundy knit polo under an unstructured charcoal blazer",
    setting: "shaded outdoor terrace in Nairobi with blurred greenery",
    pose: "looking slightly off-camera, broad joyful smile with teeth",
  },
  {
    code: "ZA",
    gender: "Female",
    context: "South African with mixed ancestry, warm medium-brown skin",
    hair: "short salt-and-pepper natural curls",
    outfit:
      "muted plum blouse with a tailored dark jacket, bold eyeglass frames",
    setting: "warm wood-lined meeting room",
    pose: "straight-on composed thoughtful expression",
  },
  {
    code: "IN",
    gender: "Male",
    context: "Indian, South Asian heritage, medium brown skin",
    hair: "wavy medium-length black hair, light stubble",
    outfit: "light-blue open-collar shirt and taupe blazer",
    setting: "modern workspace near a window overlooking an Indian city",
    pose: "casually leaning on a table, gentle asymmetric smile",
  },
  {
    code: "JP",
    gender: "Female",
    context: "Japanese, East Asian heritage, fair warm skin",
    hair: "straight chin-length black bob with a fringe",
    outfit: "minimalist slate-gray blazer over a soft blue top",
    setting: "bright minimalist office with a pale wooden screen",
    pose: "three-quarter profile turned toward the camera, confident quiet smile",
  },
  {
    code: "BR",
    gender: "Male",
    context:
      "Brazilian with mixed Afro-Brazilian and European ancestry, warm olive-brown skin",
    hair: "dark tight curls, neatly trimmed moustache",
    outfit: "navy open-collar shirt, tan linen jacket",
    setting: "sunlit balcony with blurred Sao Paulo buildings",
    pose: "slight head tilt, animated friendly expression",
  },
  {
    code: "DE",
    gender: "Female",
    context: "German with European ancestry, pale skin with natural freckles",
    hair: "loose shoulder-length auburn hair",
    outfit: "dark-green jacket over a cream knit top",
    setting:
      "soft overcast daylight beside a stone-walled university courtyard",
    pose: "eyes toward camera, candid restrained smile",
  },
  {
    code: "AE",
    gender: "Male",
    context: "Emirati, Arab heritage, warm olive skin",
    hair: "short dark hair with gray temples and a neatly trimmed beard",
    outfit: "dark tailored business suit with a white open-collar shirt",
    setting: "contemporary Dubai office with a softly blurred skyline",
    pose: "seated at a slight angle, calm serious expression",
  },
  {
    code: "ID",
    gender: "Female",
    context: "Indonesian, Southeast Asian heritage, golden-brown skin",
    hair: "neatly pinned shoulder-length dark hair",
    outfit: "soft terracotta blazer with an ivory blouse",
    setting: "airy lobby with a patterned wood feature wall",
    pose: "relaxed three-quarter angle, wide natural smile",
  },
  {
    code: "WS",
    gender: "Male",
    context:
      "Samoan, Polynesian heritage, deep warm brown skin and broad build",
    hair: "long dark hair tied back, clean-shaven",
    outfit: "textured navy blazer over a pale blue shirt",
    setting: "shaded Pacific coastal veranda with blurred tropical vegetation",
    pose: "upright relaxed posture, reassuring half-smile",
  },
];
// Randomize facial structure independently of country styling and preserve the
// selected traits/seed. Shuffle without replacement avoids the same face template.
const shapes = [
  "long narrow face with a prominent chin",
  "broad round face and soft jaw",
  "angular diamond-shaped face with high cheekbones",
  "square jaw and wide forehead",
  "oval face with a narrow chin",
  "heart-shaped face with a rounded jaw",
  "oblong face with a strong nose bridge",
  "wide face with rounded cheeks",
  "slender face with a softly asymmetric jaw",
  "rectangular face with a broad chin",
];
for (let i = shapes.length - 1; i > 0; i--) {
  const j = crypto.randomInt(i + 1);
  [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
}
const ages = [31, 45, 59, 38, 49, 35, 42, 56, 33, 51];
for (let i = 0; i < directions.length; i++) {
  const d = directions[i];
  const id = `sample-${String(i + 1).padStart(2, "0")}-${d.code.toLowerCase()}`;
  if (samples.some((s) => s.id === id)) continue; // never silently regenerate an ambiguous paid request
  if (samples.reduce((sum, s) => sum + s.costUSD, 0) + quote > budget)
    throw new Error("Sample budget cap reached");
  const p = profiles.find(
    (p) => p.countryCode === d.code && p.gender === d.gender,
  )!;
  const face = shapes.find(
    (shape) => !samples.some((s) => s.traits.face === shape),
  )!;
  const traits = {
    age: String(ages[i]),
    face,
    hair: d.hair,
    outfit: d.outfit,
    setting: d.setting,
    pose: d.pose,
  };
  const prompt = `Editorial environmental photograph of one fictional ${ages[i]}-year-old ${d.gender.toLowerCase()} international-relations professional. ${d.context}. Individual facial anatomy: ${face}, naturally asymmetric features and individual eye spacing, realistic skin texture, natural age marks. Hair: ${d.hair}. Clothing: ${d.outfit}. Location: ${d.setting}. Pose and expression: ${d.pose}. Chest-up vertical portrait, entire head visible with some headroom, believable candid professional photograph. Natural location-specific light, realistic skin colors, subtle depth of field. The person is the clear focus; no other people. Preserve individuality rather than a generic beauty-model face or standardized corporate studio headshot. No identical gray studio background, matching uniforms, beauty smoothing, text, logos, flags, watermark, collage, or celebrity likeness.`;
  const sample: Sample = {
    id,
    country: p.country,
    name: p.name,
    gender: d.gender,
    image: `${id}.webp`,
    seed: crypto.randomInt(2147483647),
    prompt,
    state: "requested",
    costUSD: quote,
    traits,
  };
  samples.push(sample);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  try {
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        resolution: "2K",
        aspect_ratio: "3:4",
        seed: sample.seed,
        n: 1,
        provider: { only: ["seed"], allow_fallbacks: false },
      }),
      signal: AbortSignal.timeout(180000),
    });
    const result = await response.json();
    if (!response.ok) {
      sample.costUSD = 0;
      sample.state = "failed";
      throw new Error(
        `HTTP ${response.status}: ${String(result.error?.message || "Generation failed").slice(0, 120)}`,
      );
    }
    if (!result.data?.[0]?.b64_json) throw new Error("Missing generated image");
    sample.costUSD = result.usage?.cost ?? quote;
    await sharp(Buffer.from(result.data[0].b64_json, "base64"))
      .resize(768, 1024, { fit: "cover" })
      .webp({ quality: 90 })
      .toFile(path.join(output, sample.image));
    sample.state = "complete";
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`${i + 1}/10 ${sample.country} $${sample.costUSD}`);
  } catch (e) {
    sample.error = e instanceof Error ? e.message : "Generation failed";
    if (sample.state === "requested") sample.state = "uncertain";
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    throw new Error(sample.error);
  }
}
manifest.totalChargeUSD = samples.reduce((sum, s) => sum + s.costUSD, 0);
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `Samples complete. Charge $${manifest.totalChargeUSD.toFixed(2)}; cumulative project image charge $${(previousProjectCharge + manifest.totalChargeUSD).toFixed(2)}`,
);
