import { NextResponse } from "next/server";
import { revokeAdminSession, sameAdminOrigin } from "@/lib/server/admin-auth";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!sameAdminOrigin(request))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403, headers },
    );
  revokeAdminSession(request.headers);
  const response = NextResponse.json({ ok: true }, { headers });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
