import { createHmac, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

export const SESSION_SECONDS = 8 * 60 * 60;
export function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  if (!salt || !/^[a-f0-9]{128}$/.test(hash || "") || password.length > 256) return false;
  return timingSafeEqual(Buffer.from(hash, "hex"), scryptSync(password, salt, 64));
}
export function createSession(secret: string, now = Date.now()) {
  const expiry = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${expiry}.${createHmac("sha256", secret).update(expiry).digest("hex")}`;
}
export function validSession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || secret.length < 32) return false;
  const [expiry, signature, extra] = token.split(".");
  if (extra !== undefined || !/^\d+$/.test(expiry) || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const seconds = Math.floor(now / 1000);
  if (Number(expiry) <= seconds || Number(expiry) > seconds + SESSION_SECONDS) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), createHmac("sha256", secret).update(expiry).digest());
}
