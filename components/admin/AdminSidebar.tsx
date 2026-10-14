"use client";
import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import { adminViews, type AdminView } from "@/lib/admin-views";
import { AdminIcon } from "./AdminIcon";
import { SignOut } from "./SignOut";
import styles from "./admin.module.css";
function NavContent({ label, count }: { label: string; count?: number }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span aria-busy={pending}>{label}</span>
      <small
        aria-hidden="true"
        className={
          pending || count !== undefined ? undefined : styles.emptyBadge
        }
      >
        {pending ? <span className={styles.navSpinner} /> : count}
      </small>
    </>
  );
}
export function AdminSidebar({
  view,
  counts,
}: {
  view: AdminView;
  counts: Partial<Record<AdminView, number>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link
          href="/"
          prefetch={true}
          className={styles.brand}
          onClick={() => setOpen(false)}
        >
          <span className={styles.monogram}>IR</span>
          <span>
            INFLUENCE ROCK<small>ADMIN WORKSPACE</small>
          </span>
        </Link>
        <button
          className={styles.menuButton}
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="admin-navigation"
          onClick={() => setOpen(!open)}
        >
          <AdminIcon name={open ? "close" : "menu"} />
        </button>
      </div>
      <nav
        id="admin-navigation"
        aria-label="Admin navigation"
        className={`${styles.navigation} ${open ? styles.navigationOpen : ""}`}
      >
        <span className={styles.navLabel}>WORKSPACE</span>
        {(
          Object.entries(adminViews) as [
            AdminView,
            (typeof adminViews)[AdminView],
          ][]
        ).map(([key, item]) => (
          <Link
            key={key}
            href={item.href}
            prefetch={true}
            className={view === key ? styles.navActive : styles.navItem}
            aria-current={view === key ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <AdminIcon name={key} />
            <NavContent label={item.label} count={counts[key]} />
          </Link>
        ))}
        <div className={styles.sidebarNote}>
          <span className={styles.noteDot} />
          <span>
            Automatic workflows<small>Visibility across your platform</small>
          </span>
        </div>
        <div className={styles.account}>
          <span className={styles.avatar}>A</span>
          <span>
            Administrator<small>Private workspace</small>
          </span>
        </div>
        <SignOut />
      </nav>
    </aside>
  );
}
