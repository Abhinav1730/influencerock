import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyResendWebhook(
  raw: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): string {
  const id = headers.get("svix-id") || "";
  const timestamp = headers.get("svix-timestamp") || "";
  const signatures = headers.get("svix-signature") || "";
  if (
    !secret.startsWith("whsec_") ||
    !id ||
    id.length > 200 ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    throw new Error("Invalid webhook signature");
  const key = Buffer.from(secret.slice(6), "base64");
  if (key.length < 16) throw new Error("Invalid webhook configuration");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${raw}`)
    .digest();
  const valid = signatures.split(" ").some((value) => {
    const [version, encoded] = value.split(",");
    if (version !== "v1" || !encoded) return false;
    const supplied = Buffer.from(encoded, "base64");
    return (
      supplied.length === expected.length && timingSafeEqual(expected, supplied)
    );
  });
  if (!valid) throw new Error("Invalid webhook signature");
  return id;
}
