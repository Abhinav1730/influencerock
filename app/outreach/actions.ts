"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { OUTREACH_COOKIE, outreachConfig } from "@/lib/server/outreach-auth";
import { createSession, passwordMatches, SESSION_SECONDS } from "@/lib/server/outreach-session";

// Shared by requests in this process; only bounded failed attempts are retained.
const attempts = new Map<string, { count: number; until: number }>();
export async function signIn(form: FormData) {
  const config = outreachConfig();
  if (!config.ready) redirect("/outreach/login?error=unavailable");
  const h = await headers();
  const ip = h.get("x-real-ip") || "unknown";
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const attempt = attempts.get(ip);
  if (attempt && attempt.count >= 5) redirect("/outreach/login?error=limited");
  if (attempts.size >= 10000 && !attempt) redirect("/outreach/login?error=limited");
  const username = String(form.get("username") || "");
  const password = String(form.get("password") || "");
  const matches = passwordMatches(password, config.hash);
  if (username !== config.username || !matches) {
    attempts.set(ip, { count: (attempt?.count || 0) + 1, until: attempt?.until || now + 15 * 60 * 1000 });
    redirect("/outreach/login?error=invalid");
  }
  attempts.delete(ip);
  (await cookies()).set(OUTREACH_COOKIE, createSession(config.secret + config.hash), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/outreach", maxAge: SESSION_SECONDS,
  });
  redirect("/outreach");
}
export async function signOut() {
  (await cookies()).set(OUTREACH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/outreach", maxAge: 0 });
  redirect("/outreach/login");
}
