"use client";
import { useState, type FormEvent } from "react";
import styles from "./login.module.css";
export function LoginForm() {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to sign in. Please try again.");
        setPending(false);
        return;
      }
      window.location.replace("/");
    } catch {
      setError("Unable to connect. Please try again.");
      setPending(false);
    }
  }
  return (
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <label htmlFor="email">Email address</label>
      <input
        id="email"
        type="email"
        name="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Enter your email address"
        required
        maxLength={254}
        disabled={pending}
        aria-describedby={error ? "login-error" : undefined}
      />
      <label htmlFor="password">Password</label>
      <div className={styles.password}>
        <input
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          maxLength={256}
          disabled={pending}
          aria-describedby={error ? "login-error" : undefined}
        />
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={pending}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.5" />
            {visible ? <path d="m3 3 18 18" /> : null}
          </svg>
        </button>
      </div>
      <div className={styles.feedback} aria-live="polite">
        {error ? (
          <p id="login-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button className={styles.submit} type="submit" disabled={pending}>
        <span>{pending ? "Signing in…" : "Sign in to workspace"}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      </button>
      <p className={styles.sessionNote}>
        Your session stays active for 12 hours.
      </p>
    </form>
  );
}
