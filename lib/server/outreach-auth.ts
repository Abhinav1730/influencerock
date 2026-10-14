import "server-only";
import { cookies } from "next/headers";
import { validSession } from "./outreach-session";
export const OUTREACH_COOKIE = "ir_outreach_session";
export function outreachConfig() {
  const username = process.env.OUTREACH_USERNAME || "";
  const hash = process.env.OUTREACH_PASSWORD_HASH || "";
  const secret = process.env.OUTREACH_SESSION_SECRET || "";
  return { username, hash, secret, ready: !!username && !!hash && secret.length >= 32 };
}
export async function outreachSignedIn() {
  const config = outreachConfig();
  return config.ready && validSession((await cookies()).get(OUTREACH_COOKIE)?.value, config.secret + config.hash);
}
