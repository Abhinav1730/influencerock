"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import {
  profiles,
  browseProfiles,
  regions,
  filterProfiles,
  countryNodes,
  networkStats,
  shuffleProfiles,
} from "@/lib/profiles";
import type { DirectoryFilters, ProfileTab } from "@/lib/types";
import { ProfileCard } from "./ProfileCard";
import { Icon } from "./Icon";
const keys = [
  "country",
  "region",
  "expertise",
  "seniority",
  "industry",
] as const;
const tabs: [[ProfileTab, string], ...Array<[ProfileTab, string]>] = [
  ["all", "All profiles"],
  ["leadership", "Global leadership"],
  ["regional", "Regional management"],
  ["network", "Country network"],
];
const options = Object.fromEntries(
  keys.map((k) => [k, [...new Set(profiles.map((p) => p[k]))].sort()]),
) as Record<(typeof keys)[number], string[]>;
const allLabels = {
  country: "countries",
  region: "regions",
  expertise: "expertise",
  seniority: "levels",
  industry: "industries",
};
export function RegionLink({
  region,
  children,
  className,
}: {
  region: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("ir-region", { detail: region }));
        document
          .querySelector(".directory")
          ?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      {children}
    </button>
  );
}
export function NetworkDirectory() {
  const [filters, setFilters] = useState<DirectoryFilters>({ tab: "all" });
  const [page, setPage] = useState(1);
  const [announcement, setAnnouncement] = useState("");
  const [displaySeed, setDisplaySeed] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const matched = useMemo(
    () =>
      filterProfiles(
        filters.country || filters.q?.trim() ? profiles : browseProfiles,
        filters,
      ),
    [filters],
  );
  const displayed = useMemo(
    () => (displaySeed ? shuffleProfiles(matched, displaySeed) : matched),
    [matched, displaySeed],
  );
  const pages = Math.max(1, Math.ceil(matched.length / 32));
  const activePage = Math.min(page, pages);
  const start = (activePage - 1) * 32;
  const update = (patch: DirectoryFilters) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const reset = () => {
    setFilters({ tab: "all" });
    setPage(1);
    setAnnouncement("");
  };
  useEffect(() => {
    setDisplaySeed(crypto.getRandomValues(new Uint32Array(1))[0] || 1);
    const region = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (regions.some((r) => r.name === value)) {
        setFilters({ tab: "all", region: value });
        setPage(1);
      }
    };
    const keyboard = (event: globalThis.KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement)?.tagName,
        )
      ) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("ir-region", region);
    document.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("ir-region", region);
      document.removeEventListener("keydown", keyboard);
    };
  }, []);
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    update({ tab: tabs[next][0] });
    tabRefs.current[next]?.focus();
  };
  return (
    <section className="container directory section">
      <div className="directory-top">
        <div>
          <h2>Explore the network</h2>
          <p>
            {networkStats.delegates} country profiles ·{" "}
            {networkStats.management} leadership and regional management
            profiles
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            setDisplaySeed(crypto.getRandomValues(new Uint32Array(1))[0] || 1);
            setPage(1);
            setAnnouncement("Profile order shuffled.");
          }}
        >
          Shuffle profiles
        </button>
      </div>
      <details className="country-browser">
        <summary>Browse {networkStats.countries} countries</summary>
        <div className="country-node-grid">
          {countryNodes.map((node) => (
            <button
              key={node.code}
              type="button"
              className="country-node"
              aria-label={`View ${node.country}: ${node.profiles.length} delegates`}
              aria-pressed={filters.country === node.country}
              onClick={() => {
                setFilters({ tab: "network", country: node.country });
                setPage(1);
              }}
            >
              <span className="country-node-title">
                {node.country}
                <small>{node.profiles.length}</small>
              </span>
              <span className="country-node-portraits">
                {node.profiles.map((p) => (
                  <img
                    key={p.id}
                    src={p.image}
                    alt=""
                    loading="lazy"
                    width={36}
                    height={44}
                  />
                ))}
              </span>
            </button>
          ))}
        </div>
      </details>
      <form
        className="directory-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setAnnouncement(matched.length + " profiles match your search.");
        }}
      >
        <Icon name="search" size={24} />
        <input
          ref={input}
          type="search"
          id="network-search"
          placeholder="Search by name, country, city, expertise or sector…"
          aria-label="Search the Influence Rock network"
          value={filters.q ?? ""}
          onChange={(e) => update({ q: e.target.value })}
        />
        <button
          type="submit"
          className="button primary directory-search-button"
        >
          Search
        </button>
      </form>
      <span className="sr-only" role="status">
        {announcement}
      </span>
      <div className="filter-row">
        {keys.map((k) => (
          <label key={k}>
            <span>{k[0].toUpperCase() + k.slice(1)}</span>
            <select
              value={filters[k] ?? ""}
              onChange={(e) => update({ [k]: e.target.value })}
            >
              <option value="">All {allLabels[k]}</option>
              {options[k].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button aria-label="Reset directory filters" onClick={reset}>
          Reset
        </button>
      </div>
      <div className="directory-tabs" role="tablist" aria-label="Profile group">
        {tabs.map(([key, title], i) => (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            id={"tab-" + key}
            aria-controls="profile-results"
            tabIndex={filters.tab === key ? 0 : -1}
            aria-selected={filters.tab === key}
            onClick={() => update({ tab: key })}
            onKeyDown={(e) => moveTab(e, i)}
          >
            {title}
          </button>
        ))}
        <span id="result-count" aria-live="polite">
          {matched.length} {matched.length === 1 ? "profile" : "profiles"}
        </span>
      </div>
      <div
        className="profile-grid"
        id="profile-results"
        role="tabpanel"
        aria-labelledby={"tab-" + filters.tab}
      >
        {matched.length ? (
          displayed
            .slice(start, start + 32)
            .map((p) => <ProfileCard key={p.id} profile={p} />)
        ) : (
          <div className="empty-state">
            <Icon name="search" size={35} />
            <h3>No profiles match your search.</h3>
            <p>
              {filters.tab === "leadership" || filters.tab === "regional"
                ? "The selected management group has no profiles matching these filters. Country representatives are listed in the Country network tab."
                : "Try a different name, country or area of expertise."}
            </p>
            {filters.country ? (
              <button
                className="button primary"
                onClick={() => {
                  setFilters({ tab: "network", country: filters.country });
                  setPage(1);
                }}
              >
                View {filters.country} country profiles
              </button>
            ) : null}
            <button className="button secondary" onClick={reset}>
              Clear filters
            </button>
          </div>
        )}
      </div>
      {matched.length ? (
        <nav className="directory-pagination" aria-label="Directory pages">
          <p>
            Showing {start + 1}–{Math.min(start + 32, matched.length)} of{" "}
            {matched.length}
          </p>
          <div>
            <button
              className="button secondary"
              disabled={activePage === 1}
              aria-label="Previous directory page"
              onClick={() => setPage(activePage - 1)}
            >
              Previous
            </button>
            <span>
              Page {activePage} of {pages}
            </span>
            <button
              className="button secondary"
              disabled={activePage === pages}
              aria-label="Next directory page"
              onClick={() => setPage(activePage + 1)}
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
