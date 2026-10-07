"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, CaretDown, MagnifyingGlass, X } from "@phosphor-icons/react";
import { networkEntries } from "@/lib/content";

type FilterName = "region" | "country" | "expertise" | "industry" | "objective";
type Filters = Record<FilterName, string>;

const initialFilters: Filters = {
  region: "",
  country: "",
  expertise: "",
  industry: "",
  objective: "",
};

const filterLabels: { name: FilterName; label: string; defaultLabel: string }[] = [
  { name: "region", label: "Region", defaultLabel: "All regions" },
  { name: "country", label: "Country", defaultLabel: "All countries" },
  { name: "expertise", label: "Expertise", defaultLabel: "All expertise areas" },
  { name: "industry", label: "Industry", defaultLabel: "All industries" },
  { name: "objective", label: "Objective", defaultLabel: "All objectives" },
];

const paths = [
  "M 125 240 C 290 40, 490 35, 565 175",
  "M 125 240 C 340 95, 630 150, 835 260",
  "M 310 365 C 395 230, 470 140, 565 175",
  "M 565 175 C 665 130, 765 170, 835 260",
  "M 310 365 C 505 275, 690 335, 835 260",
];

const nodes = [
  { x: 125, y: 240, label: "AMERICAS", tx: 56, ty: 211 },
  { x: 310, y: 365, label: "LATIN AMERICA", tx: 225, ty: 399 },
  { x: 565, y: 175, label: "EUROPE", tx: 535, ty: 138 },
  { x: 670, y: 230, label: "MIDDLE EAST", tx: 688, ty: 220 },
  { x: 835, y: 260, label: "ASIA-PACIFIC", tx: 836, ty: 237 },
];

function NetworkLines() {
  return (
    <svg className="network-lines" viewBox="0 0 1000 500" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {paths.map((path, index) => (
        <g key={path}>
          <path className="network-path" d={path} style={{ animationDelay: `${index * -3.1}s` }} />
          <circle className="network-traveler" r="4" style={{ animationDelay: `${index * -2.4}s` }}>
            <animateMotion dur={`${10 + index * 2}s`} repeatCount="indefinite" path={path} />
          </circle>
        </g>
      ))}
      {nodes.map((node) => (
        <g key={node.label}>
          <circle className="network-node-halo" cx={node.x} cy={node.y} r="11" />
          <circle className="network-node" cx={node.x} cy={node.y} r="5" />
          <text className="network-label" x={node.tx} y={node.ty}>{node.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function NetworkHero() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [showResults, setShowResults] = useState(false);

  const countries = useMemo(() => {
    const entries = filters.region
      ? networkEntries.filter((entry) => entry.region === filters.region)
      : networkEntries;
    return [...new Set(entries.map((entry) => entry.country))].sort();
  }, [filters.region]);

  const options = useMemo<Record<FilterName, string[]>>(() => ({
    region: [...new Set(networkEntries.map((entry) => entry.region))],
    country: countries,
    expertise: [...new Set(networkEntries.map((entry) => entry.expertise))],
    industry: [...new Set(networkEntries.map((entry) => entry.industry))],
    objective: [...new Set(networkEntries.map((entry) => entry.objective))],
  }), [countries]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return networkEntries.filter((entry) => {
      const matchesFilters = filterLabels.every(({ name }) => !filters[name] || entry[name] === filters[name]);
      const matchesQuery = !normalizedQuery || Object.values(entry).some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      return matchesFilters && matchesQuery;
    });
  }, [query, filters]);

  function updateFilter(name: FilterName, value: string) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "region" ? { country: "" } : {}),
    }));
    setShowResults(true);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowResults(true);
  }

  function clearSearch() {
    setQuery("");
    setFilters(initialFilters);
    setShowResults(false);
  }

  return (
    <section className="network-hero" id="top" aria-labelledby="hero-title">
      <div className="hero-photo" aria-hidden="true">
        <Image src="/images/hero-rio.png" alt="" fill priority sizes="100vw" className="hero-photo-image" />
      </div>
      <div className="hero-fade" aria-hidden="true" />
      <div className="hero-map" aria-hidden="true">
        <Image src="/images/world-map.png" alt="" fill priority sizes="65vw" className="hero-map-image" />
      </div>
      <NetworkLines />
      <div className="container hero-main">
        <div className="hero-copy">
          <p className="eyebrow">The global network</p>
          <h1 id="hero-title">Local knowledge.<br />Worldwide perspective.</h1>
          <p className="hero-description">
            A global strategic network combining local intelligence with the relationships and perspective to help you navigate complexity.
          </p>
          <div className="hero-stats" aria-label="Our reach">
            <div><strong>195</strong><span>countries</span></div>
            <div><strong>800+</strong><span>professionals</span></div>
            <div><strong>Local</strong><span>understanding.<br />Global impact.</span></div>
          </div>
        </div>
        <div className="hero-side-note" aria-hidden="true">
          <em>People.<br />Places.<br />Progress.</em>
          <span />
          <small>A more stable,<br />prosperous world.</small>
        </div>
      </div>
      <div className="container hero-search-wrap" id="network">
        <form className="network-search glass-panel" onSubmit={submitSearch} role="search" aria-label="Explore regional expertise">
          <div className="search-primary">
            <div className="search-input-wrap">
              <MagnifyingGlass size={22} weight="light" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by country, region, expertise or sector"
                aria-label="Search by country, region, expertise or sector"
              />
            </div>
            <button className="button button-primary search-button" type="submit">
              Search <ArrowRight size={18} weight="light" />
            </button>
          </div>
          <div className="search-filters">
            {filterLabels.map(({ name, label, defaultLabel }) => (
              <label key={name} className="filter-field">
                <span>{label}</span>
                <span className="select-wrap">
                  <select value={filters[name]} onChange={(event) => updateFilter(name, event.target.value)}>
                    <option value="">{defaultLabel}</option>
                    {options[name].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <CaretDown size={14} aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
          {showResults && (
            <div className="search-results" aria-live="polite">
              <div className="search-results-head">
                <p><strong>{results.length}</strong> {results.length === 1 ? "relevant area" : "relevant areas"}</p>
                <button type="button" onClick={clearSearch} aria-label="Clear search and filters"><X size={17} /> Clear</button>
              </div>
              {results.length ? (
                <div className="search-results-list">
                  {results.slice(0, 4).map((entry) => (
                    <a href="#consultation" key={`${entry.country}-${entry.expertise}`}>
                      <span className="result-kicker">{entry.region} · {entry.country}</span>
                      <strong>{entry.expertise}</strong>
                      <span>{entry.detail}</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : <p className="no-results">No matching area in this preview. Try a broader search or clear the filters.</p>}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
