import data from "../network-profiles.json";
import leadership from "../scripts/data/leadership.json";
import type { Profile, DirectoryFilters } from "./types";


export const profiles: Profile[] = data;
export const regions = leadership.regions;
export const countryProfiles = profiles.filter(
  (p) => p.seniority === "Country Network",
);
export const countryNodes = [...new Set(countryProfiles.map((p) => p.country))]
  .sort()
  .map((country) => {
    const delegates = countryProfiles.filter((p) => p.country === country);
    return { country, code: delegates[0].countryCode!, profiles: delegates };
  });
export const networkStats = {
  countries: countryNodes.length,
  delegates: countryProfiles.length,
  management: profiles.length - countryProfiles.length,
};

// All visible profiles now use the refreshed portrait pool.
export const browseProfiles = profiles;

export function shuffleProfiles(roster: Profile[], seed: number) {
  const shuffled = [...roster];
  let state = seed >>> 0;
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((state / 4294967296) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function filterProfiles(
  roster: Profile[],
  filters: DirectoryFilters = {},
) {
  return roster.filter((p) => {
    const group =
      filters.tab === "leadership"
        ? "Global Leadership"
        : filters.tab === "regional"
          ? "Regional Leadership"
          : filters.tab === "network"
            ? "Country Network"
            : "";
    if (group && p.seniority !== group) return false;
    for (const key of [
      "country",
      "region",
      "expertise",
      "seniority",
      "industry",
    ] as const)
      if (filters[key] && p[key] !== filters[key]) return false;
    return (
      !filters.q ||
      normalize(
        [
          p.name,
          p.country,
          p.city,
          p.region,
          p.title,
          p.expertise,
          p.industry,
          ...p.languages,
        ].join(" "),
      ).includes(normalize(filters.q))
    );
  });
}
