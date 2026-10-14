import "server-only";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ADMIN_SESSION_SECONDS, adminToken } from "../admin-cookie";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const passwordVerifier = () => process.env.IR_ADMIN_PASSWORD_SCRYPT || "";
const validVerifier = (value: string) =>
  /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(value);
const credentialDigest = () =>
  validVerifier(passwordVerifier()) ? hash(passwordVerifier()) : "";

// A separate private database keeps authentication independent of queue activity.
function withStore<T>(work: (db: DatabaseSync) => T): T {
  const directory = process.env.IR_DATA_DIR || path.join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, "admin-auth.sqlite");
  const db = new DatabaseSync(filename);
  try {
    chmodSync(filename, 0o600);
    db.exec(`PRAGMA busy_timeout=5000;
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, credential_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS login_limits (
        bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL
      );`);
    return work(db);
  } finally {
    db.close();
  }
}

export function validAdminCredentials(
  email: string,
  password: string,
): boolean {
  const verifier = passwordVerifier();
  if (!validVerifier(verifier)) return false;
  const [salt, expected] = verifier.split(":");
  return timingSafeEqual(
    scryptSync(
      `${email.trim().toLowerCase()}:${password}`,
      Buffer.from(salt, "hex"),
      64,
    ),
    Buffer.from(expected, "hex"),
  );
}

export function adminSessionAuthorized(headers: Headers): boolean {
  const token = adminToken(headers);
  if (!token || !/^[a-f0-9]{64}$/.test(credentialDigest())) return false;
  return withStore((db) =>
    Boolean(
      db
        .prepare(
          "SELECT 1 FROM sessions WHERE token_hash=? AND credential_hash=? AND expires_at>?",
        )
        .get(hash(token), credentialDigest(), Date.now()),
    ),
  );
}

export function createAdminSession(headers: Headers): string {
  return withStore((db) => {
    const now = Date.now();
    db.prepare(
      "DELETE FROM sessions WHERE expires_at<=? OR credential_hash<>?",
    ).run(now, credentialDigest());
    const previous = adminToken(headers);
    if (previous)
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(previous));
    const token = randomBytes(32).toString("base64url");
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
      hash(token),
      credentialDigest(),
      now + ADMIN_SESSION_SECONDS * 1000,
    );
    return token;
  });
}

export function revokeAdminSession(headers: Headers): void {
  const token = adminToken(headers);
  if (token)
    withStore((db) => {
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(token));
    });
}

// Persisted, atomic counters cannot be bypassed by parallel requests or restarts.
export function allowAdminLogin(headers: Headers): boolean {
  const ip = headers.get("x-real-ip") || "local"; // Nginx overwrites X-Real-IP.
  return withStore((db) => {
    const now = Date.now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM login_limits WHERE expires_at<=?").run(now);
      const attempts = db
        .prepare(
          `INSERT INTO login_limits VALUES (?, 1, ?)
        ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1
        RETURNING attempts`,
        )
        .get(hash(ip), now + 10 * 60 * 1000)!;
      db.exec("COMMIT");
      return Number(attempts.attempts) <= 10;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}

export function sameAdminOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const expected = `${local ? "http" : "https"}://${host}`;
  return request.headers.get("origin") === expected;
}
