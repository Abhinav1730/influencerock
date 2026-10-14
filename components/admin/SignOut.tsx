"use client";
import { useState } from "react";
import styles from "./admin.module.css";
export function SignOut() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className={styles.signOut}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const response = await fetch("/api/admin/logout", {
              method: "POST",
            });
            if (!response.ok) throw new Error();
            window.location.replace("/login");
          } catch {
            setError("Unable to sign out. Please try again.");
            setPending(false);
          }
        }}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
