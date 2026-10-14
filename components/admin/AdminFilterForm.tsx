"use client";

import { useState, type ReactNode } from "react";
import styles from "./admin.module.css";

export function AdminFilterForm({
  action,
  children,
}: {
  action: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className={styles.filters}
      method="get"
      action={action}
      aria-busy={pending}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement)
          event.currentTarget.requestSubmit();
      }}
      onSubmit={() => setPending(true)}
    >
      {children}
      <span className={styles.filterFeedback} role="status">
        {pending
          ? "Applying filters…"
          : "Status and order apply automatically. Press Enter or Filter to search."}
      </span>
    </form>
  );
}
