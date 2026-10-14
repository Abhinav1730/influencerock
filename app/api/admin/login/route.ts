import { NextResponse } from "next/server";
import { readJson } from "@/lib/server/access";
import {
  allowAdminLogin,
  createAdminSession,
  sameAdminOrigin,
  validAdminCredentials,
} from "@/lib/server/admin-auth";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS } from "@/lib/admin-cookie";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
export async function POST(request: Request) {
  if (!sameAdminOrigin(request))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403, headers },
    );
  if (!allowAdminLogin(request.headers))
    return NextResponse.json(
      { error: "Too many attempts. Please try again in 10 minutes." },
      { status: 429, headers: { ...headers, "Retry-After": "600" } },
    );
  let body: unknown;
  try {
    body = await readJson(request, 4096);
  } catch {
    return NextResponse.json(
      { error: "Invalid sign-in request." },
      { status: 400, headers },
    );
  }
  const fields = body as Record<string, unknown> | null;
  if (
    !fields ||
    typeof fields.email !== "string" ||
    typeof fields.password !== "string" ||
    !fields.email.length ||
    fields.email.length > 254 ||
    !fields.password.length ||
    fields.password.length > 256 ||
    !validAdminCredentials(fields.email, fields.password)
  ) {
    return NextResponse.json(
      { error: "The email or password is incorrect." },
      { status: 401, headers },
    );
  }
  const response = NextResponse.json({ ok: true }, { headers });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(request.headers), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}
