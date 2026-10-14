export interface PressContact {
  id: string;
  outlet: string;
  name: string;
  beat: string;
  segment: string;
  region: string;
  contactType: string;
  contact: string;
  sourceUrl: string;
  sourceChecked: string;
}
export interface PressFilters {
  q?: string;
  segment?: string;
  region?: string;
  method?: string;
}
const countryNames: Record<string, string> = {
  AE: "United Arab Emirates",
  AT: "Austria",
  AU: "Australia",
  BE: "Belgium",
  CA: "Canada",
  CH: "Switzerland",
  CN: "China",
  DE: "Germany",
  ES: "Spain",
  FR: "France",
  GB: "United Kingdom",
  HK: "Hong Kong",
  HU: "Hungary",
  IN: "India",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  NG: "Nigeria",
  NL: "Netherlands",
  NO: "Norway",
  NZ: "New Zealand",
  QA: "Qatar",
  SA: "Saudi Arabia",
  SE: "Sweden",
  SG: "Singapore",
  SI: "Slovenia",
  TW: "Taiwan",
  US: "United States",
  ZA: "South Africa",
};
export function regionLabel(region: string): string {
  return region
    .split("/")
    .map((part) => countryNames[part] || part)
    .join(" / ");
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function contactHref(contact: string): string | null {
  if (/^[^\s@<>:]+@[^\s@<>:]+\.[^\s@<>:]+$/.test(contact))
    return `mailto:${contact}`;
  try {
    const url = new URL(contact);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export const contactMethod = (p: PressContact) =>
  contactHref(p.contact)?.startsWith("mailto:")
    ? "email"
    : contactHref(p.contact)
      ? "web"
      : "other";
export function searchContacts(
  contacts: PressContact[],
  filters: PressFilters,
): PressContact[] {
  const terms = normalize((filters.q || "").trim())
    .split(/\s+/)
    .filter(Boolean);
  return contacts.filter(
    (p) =>
      (!filters.segment || p.segment === filters.segment) &&
      (!filters.region || p.region === filters.region) &&
      (!filters.method || contactMethod(p) === filters.method) &&
      terms.every((term) =>
        normalize(
          [
            p.outlet,
            p.name,
            p.beat,
            p.segment,
            p.region,
            regionLabel(p.region),
            p.contact,
          ].join(" "),
        ).includes(term),
      ),
  );
}
export const segmentLabels: Record<string, string> = {
  "ai-tech": "AI & technology",
  "biotech-trade": "Biotech & trade",
  "science-health": "Science & health",
  creators: "Creators",
  europe: "Europe",
  "apac-mea": "Asia-Pacific, Middle East & Africa",
  "wires-broadcast": "Wires & broadcast",
};
