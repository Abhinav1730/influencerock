"use client";

import { useState } from "react";
import { ArrowRight, List, X } from "@phosphor-icons/react";

const links = [
  { label: "What we do", href: "#capabilities" },
  { label: "Where we work", href: "#network" },
  { label: "Our method", href: "#method" },
  { label: "About", href: "#responsibility" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="wordmark" href="#top" aria-label="Influence Rock, back to top">
          INFLUENCE ROCK
        </a>
        <nav className={`header-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a className="mobile-consultation" href="#consultation" onClick={() => setMenuOpen(false)}>
            Confidential consultation <ArrowRight size={17} weight="light" />
          </a>
        </nav>
        <a className="header-cta" href="#consultation">
          Confidential consultation <ArrowRight size={17} weight="light" />
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </div>
    </header>
  );
}
