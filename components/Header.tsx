"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";
import outreachNav from "./outreach-nav.module.css";
import { signOut } from "@/app/outreach/actions";
const links = [
  ["/", "The Firm"],
  ["/expertise", "Our Expertise"],
  ["/network", "Global Network"],
  ["/outreach", "Outreach"],
  ["/approach", "Our Approach"],
];
export function Header({ outreachAuthenticated = false }: { outreachAuthenticated?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header id="header" className={path === "/" ? "on-dark" : ""}>
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            IR
            <span />
          </span>
          <span className="brand-name">
            INFLUENCE ROCK<span>INTERNATIONAL RELATIONS</span>
          </span>
        </Link>
        <nav className={`desktop-nav ${outreachNav.navigation}`} aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {outreachAuthenticated && path === "/outreach" ? (
            <form action={signOut}>
              <button className="button nav-button" type="submit">Sign out</button>
            </form>
          ) : (
            <Link className="button nav-button" href="/contact">
              Begin a Conversation
            </Link>
          )}
          <button
            className={`menu-button ${outreachNav.menu}`}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {[...links, ["/contact", "Begin a Conversation"]].map(
          ([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ),
        )}
        {outreachAuthenticated && path === "/outreach" && (
          <form action={signOut}>
            <button className="button" type="submit">Sign out</button>
          </form>
        )}
      </nav>
    </header>
  );
}
