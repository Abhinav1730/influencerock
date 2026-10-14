import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  profiles,
  countryProfiles as allCountryProfiles,
  countryNodes,
  regions,
  filterProfiles,
  shuffleProfiles,
  networkStats,
  browseProfiles,
} from "../lib/profiles";
import countries from "./data/countries.json";
import allocation from "./data/country-allocation.json";
import portraitLibrary from "./data/portrait-library.json";
import { portraitGroup } from "./data/portrait-groups";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedProfiles = profiles.filter(
  (p) => p.representation === "digital",
);
const countryProfiles = allCountryProfiles.filter(
  (p) => p.representation === "digital",
);
assert.equal(countryProfiles.length, 505);
assert.equal(generatedProfiles.length, 519);
assert.equal(allCountryProfiles.length, 505);
assert.equal(profiles.length, 519);
assert.equal(browseProfiles.length, 519);
assert.equal(countryNodes.length, 195);
assert.equal(new Set(profiles.map((p) => p.id)).size, 519);
assert.equal(new Set(profiles.map((p) => p.name)).size, 519);
assert.equal(new Set(countryProfiles.map((p) => p.continent)).size, 6);
assert.equal(regions.length, 6);
assert.deepEqual(networkStats, {
  countries: 195,
  delegates: 505,
  management: 14,
});
assert.equal(countryProfiles.filter((p) => p.gender === "Male").length, 253);
assert.equal(countryProfiles.filter((p) => p.gender === "Female").length, 252);
for (const tier of [
  { count: 4, countries: 42 },
  { count: 3, countries: 80 },
  { count: 2, countries: 24 },
  { count: 1, countries: 49 },
])
  assert.equal(
    allocation.countries.filter((c) => c.delegates === tier.count).length,
    tier.countries,
  );
for (const c of allocation.countries) {
  const group = countryProfiles.filter((p) => p.countryCode === c.code);
  assert.equal(group.length, c.delegates, c.code);
  assert.equal(
    new Set(group.map((p) => p.image)).size,
    c.delegates,
    "Distinct portraits within " + c.code,
  );
  if (c.delegates >= 2)
    assert.equal(
      new Set(group.map((p) => p.gender)).size,
      2,
      "Gender balance " + c.code,
    );
  if (c.delegates === 4)
    assert.equal(group.filter((p) => p.gender === "Male").length, 2, c.code);
  for (const p of group)
    assert(
      p.firstName &&
        p.lastName &&
        p.city &&
        p.bio &&
        p.expertise &&
        p.languages.length,
      c.code,
    );
}
for (const [code, count] of [
  ["US", 4],
  ["JP", 3],
  ["SG", 4],
  ["CH", 4],
  ["VA", 1],
] as const)
  assert.equal(
    countryProfiles.filter((p) => p.countryCode === code).length,
    count,
  );
assert.equal(filterProfiles(profiles, { q: "Etienne" })[0].id, "03");
assert.equal(filterProfiles(profiles, { tab: "leadership" }).length, 8);
assert.equal(filterProfiles(profiles, { tab: "regional" }).length, 6);
assert.equal(filterProfiles(profiles, { tab: "network" }).length, 505);
assert.equal(
  filterProfiles(profiles, { country: "India", tab: "network" }).length,
  4,
);
assert.equal(filterProfiles(profiles, { q: "no-such-person-ever" }).length, 0);
assert.equal(
  filterProfiles(profiles, { q: "Joao", country: "Portugal", tab: "network" })
    .length,
  1,
);
const shuffled = shuffleProfiles(countryProfiles, 127);
assert.deepEqual(shuffled, shuffleProfiles(countryProfiles, 127));
assert.notDeepEqual(
  shuffled.map((p) => p.id),
  countryProfiles.map((p) => p.id),
);
assert.deepEqual(
  [...shuffled.map((p) => p.id)].sort(),
  [...countryProfiles.map((p) => p.id)].sort(),
);
for (const p of shuffled)
  assert.strictEqual(
    p,
    countryProfiles.find((original) => original.id === p.id),
  );
const abhinav = filterProfiles(profiles, {
  q: "Abhinav Saxena",
  country: "India",
  region: "Asia-Pacific",
  tab: "network",
});
assert.equal(abhinav.length, 0);
for (const p of profiles) {
  assert.equal(p.representation, "digital");
  assert(!("email" in p));
  assert(regions.some((r) => r.name === p.region));
  await fs.access(path.join(root, "public", p.image));
}
assert.equal(portraitLibrary.portraits.length, 192);
const manifest = JSON.parse(
  await fs.readFile(
    path.join(root, "original-assets/delegate-portrait-manifest.json"),
    "utf8",
  ),
) as {
  previousProjectChargeUSD: number;
  batchChargeUSD: number;
  totalCapUSD: number;
  portraits: Array<{
    profileId: string;
    countryCode: string;
    country: string;
    gender: string;
    image: string;
    costUSD: number;
  }>;
};
assert.equal(manifest.portraits.length, 100);
assert.equal(new Set(manifest.portraits.map((p) => p.profileId)).size, 100);
assert.equal(new Set(manifest.portraits.map((p) => p.image)).size, 100);
assert(manifest.previousProjectChargeUSD + manifest.batchChargeUSD <= 7);
const fifth = JSON.parse(await fs.readFile(path.join(root, "original-assets/delegate-portrait-manifest-5.json"), "utf8")) as typeof manifest & { portraits: Array<(typeof manifest.portraits)[number] & { group: string }> };
assert.equal(fifth.portraits.length, 8);
assert(fifth.batchChargeUSD <= 1);
assert(fifth.previousProjectChargeUSD + fifth.batchChargeUSD <= fifth.totalCapUSD);
const replacements = new Map(fifth.portraits.map((p) => [p.profileId, p]));
const individualHashes = new Set<string>();
for (const historical of manifest.portraits) {
  const asset = replacements.get(historical.profileId) ?? historical;
  const p = countryProfiles.find((p) => p.id === asset.profileId)!;
  assert(p, "Delegate exists: " + asset.profileId);
  assert.equal(p.countryCode, asset.countryCode);
  assert.equal(p.country, asset.country);
  assert.equal(p.gender, asset.gender);
  assert.equal(p.image, asset.image);
  individualHashes.add(
    createHash("sha256")
      .update(await fs.readFile(path.join(root, "public", asset.image)))
      .digest("hex"),
  );
}
assert.equal(individualHashes.size, 100);
const second = JSON.parse(
  await fs.readFile(
    path.join(root, "original-assets/delegate-portrait-manifest-2.json"),
    "utf8",
  ),
) as typeof manifest & {
  portraits: Array<(typeof manifest.portraits)[number] & { group: string }>;
};
assert.equal(second.portraits.length, 100);
assert(second.previousProjectChargeUSD + second.batchChargeUSD <= 10.3);
const third = JSON.parse(
  await fs.readFile(
    path.join(root, "original-assets/delegate-portrait-manifest-3.json"),
    "utf8",
  ),
) as typeof second;
assert.equal(third.portraits.length, 200);
assert(third.previousProjectChargeUSD + third.batchChargeUSD <= 20);
const fourth = JSON.parse(
  await fs.readFile(
    path.join(root, "original-assets/delegate-portrait-manifest-4.json"),
    "utf8",
  ),
) as typeof second;
assert.equal(fourth.portraits.length, 114);
assert(fourth.previousProjectChargeUSD + fourth.batchChargeUSD <= 21.32);
assert.equal(new Set(generatedProfiles.map((p) => p.image)).size, 519);
assert.equal(new Set(profiles.map((p) => p.image)).size, 519);
const refreshed = [...new Map([
  ...manifest.portraits,
  ...second.portraits,
  ...third.portraits,
  ...fourth.portraits,
  ...fifth.portraits,
].map((p) => [p.profileId, p] as const)).values()] as Array<(typeof second.portraits)[number]>;
assert.equal(new Set(refreshed.map((p) => p.profileId)).size, 519);
assert.equal(new Set(refreshed.map((p) => p.image)).size, 519);
individualHashes.clear();
for (const asset of refreshed) {
  const owner = profiles.find((p) => p.id === asset.profileId)!;
  assert.equal(owner.country, asset.country);
  assert.equal(owner.gender, asset.gender);
  assert.equal(owner.image, asset.image);
  individualHashes.add(
    createHash("sha256")
      .update(await fs.readFile(path.join(root, "public", asset.image)))
      .digest("hex"),
  );
}
assert.equal(individualHashes.size, 519);
for (const profile of generatedProfiles) {
  const asset = refreshed.find((p) => p.image === profile.image);
  const country = countries.find((c) => c.name === profile.country)!;
  assert.ok(asset, "Only refreshed portraits: " + profile.id);
  assert.equal(
    asset.profileId,
    profile.id,
    "Exclusive portrait owner: " + profile.id,
  );
  assert.equal(asset.countryCode, country.code);
  assert.equal(
    profile.portraitSource,
    "openrouter-individual-country-portrait",
  );
  assert.equal(asset.gender, profile.gender, "Portrait gender: " + profile.id);
  assert.equal(
    asset.group,
    portraitGroup(country),
    "Portrait region: " + profile.id,
  );
}
const publicPortraits = await fs.readdir(
  path.join(root, "public/assets/portraits"),
  { recursive: true },
);
assert.equal(
  publicPortraits.filter((name) => /\.(webp|png|jpe?g)$/i.test(name)).length,
  519,
);
console.log(
  "Verified 505 generated delegates, no public test profiles, 195 countries, US 4 / Japan 3, 14 management profiles, 519 globally unique refreshed portraits, distinct images within each country, matching regional/gender pools; Singapore and Switzerland four delegates each, refresh batch within $1.",
);
