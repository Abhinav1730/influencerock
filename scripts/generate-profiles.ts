import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
import countries from "./data/countries.json";
import leadership from "./data/leadership.json";
import portraitLibrary from "./data/portrait-library.json";
import { portraitGroup } from "./data/portrait-groups";
import { delegateSlots } from "./data/delegate-allocation";
const specializations = [
  "Government Affairs",
  "Strategic Access",
  "Market Entry",
  "International Relations",
  "Strategic Intelligence",
  "Corporate Relations",
  "Corporate Strategy",
];
const industries = [
  "Public Policy",
  "Investment",
  "Infrastructure",
  "Technology",
  "Energy",
  "Finance",
  "Manufacturing",
  "Natural Resources",
  "International Affairs",
];
// Existing synthetic portrait library. Images are deliberately tracked separately
// from identities so individual portraits can be replaced without renaming people.
const southAsia = new Set(["AF", "BD", "IN", "LK", "MV", "NP", "PK"]);
const northAfrica = new Set(["DZ", "EG", "LY", "MA", "TN"]);
function portraitPool(country: (typeof countries)[number], gender: string) {
  const male = gender === "Male";
  const generated = portraitLibrary.portraits
    .filter(
      (p) =>
        p.group === portraitGroup(country) && p.gender === gender.toLowerCase(),
    )
    .map((p) => p.image);
  if (generated.length >= 2) return generated;
  if (country.region === "Africa")
    return northAfrica.has(country.code)
      ? male
        ? ["12", "05"]
        : ["06", "14"]
      : male
        ? ["africa-male-1", "africa-male-2"]
        : ["02", "13"];
  if (country.region === "Middle East")
    return male ? ["12", "05"] : ["06", "14"];
  if (country.region === "Central Asia & Eurasia")
    return male ? ["16", "03"] : ["14", "08"];
  if (southAsia.has(country.code))
    return male
      ? ["07", "south-asia-male-2"]
      : ["south-asia-female-1", "south-asia-female-2"];
  if (country.region === "Asia-Pacific" && country.continent === "Asia")
    return male ? ["15", "east-asia-male-2"] : ["04", "east-asia-female-2"];
  if (country.region === "Americas" && country.continent === "South America")
    return male ? ["05", "03"] : ["10", "11"];
  return male ? ["01", "03", "09"] : ["08", "11", "10"];
}
const countryProfiles = countries.flatMap((c, i) =>
  Array.from({ length: 4 }, (_, j) => {
    const gender = j < 2 ? "Male" : "Female";
    const firstName = j < 2 ? c.men[j] : c.women[j - 2];
    const lastName = c.surnames[j];
    const expertise = specializations[(i * 3 + j) % specializations.length];
    const industry = industries[(i + j * 2) % industries.length];
    const portraits = portraitPool(c, gender);
    const id = c.code + "-" + (j + 1);
    const intros = [
      "Focuses on",
      "Develops a perspective on",
      "Supports the assessment of",
      "Maps",
    ];
    const areas: Record<string, string> = {
      "Government Affairs":
        "policy developments, public institutions and stakeholder engagement",
      "Strategic Access":
        "institutional ecosystems and relevant pathways for strategic introductions",
      "Market Entry":
        "local commercial ecosystems, prospective partnerships and market-entry preparation",
      "International Relations":
        "cross-border relationships, institutional priorities and international partnerships",
      "Strategic Intelligence":
        "political and economic developments, stakeholder mapping and strategic context",
      "Corporate Relations":
        "business relationships, sector stakeholders and corporate engagement priorities",
      "Corporate Strategy":
        "commercial objectives, institutional context and cross-border opportunities",
    };
    return {
      id,
      name: firstName + " " + lastName,
      firstName,
      lastName,
      gender,
      country: c.name,
      countryCode: c.code,
      city: c.city,
      region: c.region,
      continent: c.continent,
      title:
        (j % 2 === 0 ? "Country Lobbyist" : "Country Connector") +
        " — " +
        expertise,
      expertise,
      industry,
      seniority: "Country Network",
      languages: c.languages.slice(0, 3),
      bio:
        intros[j] +
        " " +
        areas[expertise] +
        " in " +
        c.name +
        ". The profile’s sector focus is " +
        industry.toLowerCase() +
        ", with a regional perspective across " +
        c.region +
        ".",
      image: portraits[0].startsWith("/")
        ? portraits[
            (countries
              .slice(0, i)
              .filter((other) => portraitGroup(other) === portraitGroup(c))
              .length *
              2 +
              (j % 2)) %
              portraits.length
          ]
        : "/assets/portraits/" +
          portraits[(i + j) % portraits.length] +
          ".webp",
      representation: "digital",
      portraitSource: portraits[0].startsWith("/")
        ? "openrouter-regional-library"
        : "shared-synthetic-library",
    };
  }),
);
const management = leadership.profiles.map((p) => {
  const { sample: _sample, ...rest } = p;
  const parts = p.name.split(" ");
  return {
    ...rest,
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)!,
    representation: "digital",
    portraitSource: "shared-synthetic-library",
  };
});
const usedNames = new Set(management.map((p) => p.name));
for (const p of countryProfiles) {
  const country = countries.find((c) => c.code === p.countryCode)!;
  if (usedNames.has(p.name)) {
    const alternatives = country.surnames.map((last) => [
      last,
      p.firstName + " " + last,
    ]);
    const selected = alternatives.find(([, name]) => !usedNames.has(name));
    if (!selected) throw new Error("No unique local name for " + p.id);
    [p.lastName, p.name] = selected;
  }
  usedNames.add(p.name);
}
const slots = delegateSlots();
const delegates = countryProfiles.filter((p) =>
  slots.get(p.countryCode)?.includes(Number(p.id.split("-").at(-1)) - 1),
);
const secondManifest = await fs
  .readFile(
    path.join(root, "original-assets/delegate-portrait-manifest-2.json"),
    "utf8",
  )
  .then(JSON.parse)
  .catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return { portraits: [] };
  });
const thirdManifest = await fs
  .readFile(
    path.join(root, "original-assets/delegate-portrait-manifest-3.json"),
    "utf8",
  )
  .then(JSON.parse)
  .catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return { portraits: [] };
  });
const fourthManifest = await fs
  .readFile(
    path.join(root, "original-assets/delegate-portrait-manifest-4.json"),
    "utf8",
  )
  .then(JSON.parse)
  .catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return { portraits: [] };
  });
// Historical review samples are superseded by the committed portrait batches.
// A current checkout does not need the private historical review directory.
const sampleManifest = secondManifest.portraits.length
  ? { samples: [] }
  : JSON.parse(
      await fs.readFile(
        path.join(root, "review/portrait-samples-2026-10-09/manifest.json"),
        "utf8",
      ),
    );
for (const sample of sampleManifest.samples) {
  if (secondManifest.portraits.length) continue;
  const person = delegates.find(
    (p) =>
      p.name === sample.name &&
      p.country === sample.country &&
      p.gender === sample.gender,
  );
  if (!person || sample.state !== "complete") continue;
  const filename = sample.id + ".webp";
  await fs.mkdir(path.join(root, "public/assets/portraits/individual"), {
    recursive: true,
  });
  await fs.copyFile(
    path.join(root, "review/portrait-samples-2026-10-09", filename),
    path.join(root, "public/assets/portraits/individual", filename),
  );
  person.image = "/assets/portraits/individual/" + filename;
  person.portraitSource = "openrouter-individual-country-portrait";
}
const individualManifest = await fs
  .readFile(
    path.join(root, "original-assets/delegate-portrait-manifest.json"),
    "utf8",
  )
  .then(JSON.parse)
  .catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return { portraits: [] };
  });
const fifthManifest = JSON.parse(await fs.readFile(path.join(root, "original-assets/delegate-portrait-manifest-5.json"), "utf8"));
// Later country refreshes replace earlier portrait ownership by profile ID.
const refreshedPortraits = [...new Map([
  ...individualManifest.portraits,
  ...secondManifest.portraits,
  ...thirdManifest.portraits,
  ...fourthManifest.portraits,
  ...fifthManifest.portraits,
].map((portrait) => [portrait.profileId, portrait] as const)).values()];
const profiles = [...management, ...delegates];
for (const portrait of refreshedPortraits) {
  const person = profiles.find((p) => p.id === portrait.profileId);
  if (
    !person ||
    person.country !== portrait.country ||
    countries.find((c) => c.name === person.country)?.code !==
      portrait.countryCode ||
    person.gender !== portrait.gender
  )
    throw new Error("Portrait identity mismatch: " + portrait.profileId);
  person.image = portrait.image;
  person.portraitSource = "openrouter-individual-country-portrait";
}
if (secondManifest.portraits.length) {
  const owned = new Set(refreshedPortraits.map((p) => p.profileId));
  const uses = new Map<string, number>();
  const countryImages = new Map<string, Set<string>>();
  for (const p of profiles.filter((p) => owned.has(p.id))) {
    uses.set(p.image, (uses.get(p.image) ?? 0) + 1);
    const images = countryImages.get(p.country) ?? new Set<string>();
    images.add(p.image);
    countryImages.set(p.country, images);
  }
  for (const p of profiles) {
    if (owned.has(p.id)) continue;
    const country = countries.find((c) => c.name === p.country)!;
    if (!country) throw new Error("Unknown portrait country: " + p.country);
    const group = portraitGroup(country);
    const used = countryImages.get(p.country) ?? new Set<string>();
    const candidates = refreshedPortraits.filter(
      (a) => a.group === group && a.gender === p.gender && !used.has(a.image),
    );
    candidates.sort(
      (a, b) =>
        (uses.get(a.image) ?? 0) - (uses.get(b.image) ?? 0) ||
        a.profileId.localeCompare(b.profileId),
    );
    if (!candidates.length)
      throw new Error("No distinct refreshed portrait for " + p.id);
    p.image = candidates[0].image;
    p.portraitSource = "openrouter-refreshed-regional-portrait";
    used.add(p.image);
    countryImages.set(p.country, used);
    uses.set(p.image, (uses.get(p.image) ?? 0) + 1);
  }
}
if (
  fourthManifest.portraits.length &&
  new Set(profiles.map((p) => p.image)).size !== profiles.length
)
  throw new Error("Every profile must have its own portrait");
await fs.writeFile(
  path.join(root, "network-profiles.json"),
  JSON.stringify(profiles, null, 2) + "\n",
);
const fields = [
  "id",
  "firstName",
  "lastName",
  "name",
  "gender",
  "country",
  "countryCode",
  "city",
  "region",
  "continent",
  "title",
  "expertise",
  "industry",
  "seniority",
  "languages",
  "image",
  "representation",
  "portraitSource",
];
const csv = [
  fields,
  ...profiles.map((p) =>
    fields.map((f) =>
      Array.isArray((p as Record<string, unknown>)[f])
        ? ((p as Record<string, unknown>)[f] as string[]).join(" | ")
        : (p as Record<string, unknown>)[f] || "",
    ),
  ),
]
  .map((r) =>
    r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
  )
  .join("\r\n");
await fs.writeFile(path.join(root, "network-profiles.csv"), "\uFEFF" + csv);
console.log(
  `${delegates.length} delegates across ${countries.length} countries; ${management.length} management profiles retained.`,
);
