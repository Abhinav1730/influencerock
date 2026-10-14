import { NextResponse, type NextRequest } from "next/server";
import { adminToken } from "./lib/admin-cookie";
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || request.nextUrl.host;
  const adminHost = process.env.IR_ADMIN_HOST || "admin.influencerock.com";
  const isAdminHost =
    host.split(":")[0].toLowerCase() === adminHost.toLowerCase();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const origin = isAdminHost
    ? `${local ? "http" : "https"}://${host}`
    : `https://${adminHost}`;
  const destination =
    pathname === "/admin/login" ? "/login" : pathname === "/admin" ? "/" : null;
  if (destination) {
    const url = new URL(destination + request.nextUrl.search, origin);
    return NextResponse.redirect(url, {
      status: 308,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  if (
    isAdminHost &&
    ["/", "/proposals", "/meetings", "/emails", "/activity"].includes(
      pathname,
    ) &&
    !adminToken(request.headers)
  )
    return NextResponse.redirect(new URL("/login", origin), {
      headers: { "Cache-Control": "private, no-store" },
    });
  // Cookie presence is only an early redirect. The root dashboard and APIs
  // independently validate the persisted session before reading private data.
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/",
    "/proposals",
    "/meetings",
    "/emails",
    "/activity",
    "/admin/:path*",
  ],
};
