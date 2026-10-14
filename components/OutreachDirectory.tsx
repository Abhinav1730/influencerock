"use client";
import { useMemo, useRef, useState } from "react";
import {
  contactHref,
  contactMethod,
  regionLabel,
  searchContacts,
  segmentLabels,
  type PressContact,
  type PressFilters,
} from "@/lib/outreach";
import styles from "./outreach.module.css";
const PAGE_SIZE = 24;
export function OutreachDirectory({ contacts }: { contacts: PressContact[] }) {
  const [filters, setFilters] = useState<PressFilters>({});
  const [page, setPage] = useState(1);
  const results = useMemo(
    () => searchContacts(contacts, filters),
    [contacts, filters],
  );
  const regions = useMemo(
    () => [...new Set(contacts.map((p) => p.region))].sort(),
    [contacts],
  );
  const segments = useMemo(
    () => [...new Set(contacts.map((p) => p.segment))].sort(),
    [contacts],
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const update = (patch: PressFilters) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const reset = () => {
    setFilters({});
    setPage(1);
  };
  const turnPage = (next: number) => {
    setPage(next);
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  return (
    <section
      className={`container ${styles.directory}`}
      aria-labelledby="outreach-heading"
    >
      <div className={styles.intro}>
        <div>
          <h2 id="outreach-heading" tabIndex={-1} ref={heading}>
            Explore press contacts
          </h2>
          <p>Search by journalist, outlet, beat or contact details.</p>
        </div>
        <a href="#contact-results" className={styles.jump}>
          Browse the directory ↓
        </a>
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          heading.current?.focus({ preventScroll: true });
        }}
      >
        <div className={styles.search}>
          <label className={styles.srOnly} htmlFor="press-search">
            Search press contacts
          </label>
          <span aria-hidden="true">⌕</span>
          <input
            id="press-search"
            type="search"
            value={filters.q || ""}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search names, outlets, regions or beats…"
          />
          <button type="submit">Search</button>
        </div>
        <div className={styles.filters}>
          <label>
            Segment
            <select
              aria-label="Segment"
              value={filters.segment || ""}
              onChange={(e) => update({ segment: e.target.value })}
            >
              <option value="">All segments</option>
              {segments.map((s) => (
                <option key={s} value={s}>
                  {segmentLabels[s] || s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Region
            <select
              aria-label="Region"
              value={filters.region || ""}
              onChange={(e) => update({ region: e.target.value })}
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {regionLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contact method
            <select
              aria-label="Contact method"
              value={filters.method || ""}
              onChange={(e) => update({ method: e.target.value })}
            >
              <option value="">All methods</option>
              <option value="email">Email</option>
              <option value="web">Website / form</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button type="button" onClick={reset} className={styles.reset}>
            Clear filters
          </button>
        </div>
      </form>
      <div className={styles.resultsBar}>
        <p role="status" aria-live="polite">
          {results.length} {results.length === 1 ? "contact" : "contacts"}
          {results.length !== contacts.length ? ` of ${contacts.length}` : ""}
        </p>
        <span>
          Published contact details · Check each source before reaching out
        </span>
      </div>
      <div id="contact-results" className={styles.grid}>
        {results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => {
          const href = contactHref(p.contact);
          const source = contactHref(p.sourceUrl);
          const email = contactMethod(p) === "email";
          return (
            <article key={p.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.badge}>
                  {segmentLabels[p.segment] || p.segment}
                </span>
                <span className={styles.region}>{regionLabel(p.region)}</span>
              </div>
              <h3>{p.outlet}</h3>
              <div className={styles.person}>
                {p.name || "Newsroom / editorial desk"}
              </div>
              <p className={styles.beat}>{p.beat || "General enquiries"}</p>
              <div className={styles.contact}>
                <span>
                  {email
                    ? "Email"
                    : p.contactType.replaceAll("_", " ") || "Contact"}
                </span>
                {href ? (
                  <a
                    href={href}
                    target={email ? undefined : "_blank"}
                    rel={email ? undefined : "noopener noreferrer"}
                  >
                    {email ? p.contact : "Open contact page ↗"}
                  </a>
                ) : (
                  <p>{p.contact}</p>
                )}
              </div>
              <div className={styles.source}>
                {source?.startsWith("http") && (
                  <a href={source} target="_blank" rel="noopener noreferrer">
                    View source ↗
                  </a>
                )}
                <span>
                  {p.sourceChecked ? `Source checked ${p.sourceChecked}` : ""}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {!results.length && (
        <div className={styles.empty}>
          <h3>No contacts match your search.</h3>
          <p>Try another outlet, name or region.</p>
          <button type="button" className="button primary" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
      {pages > 1 && (
        <nav className={styles.pagination} aria-label="Contact directory pages">
          <button onClick={() => turnPage(page - 1)} disabled={page === 1}>
            ← Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button onClick={() => turnPage(page + 1)} disabled={page === pages}>
            Next →
          </button>
        </nav>
      )}
    </section>
  );
}
