import { adminSessionAuthorized } from "@/lib/server/admin-auth";
import { readAdmin } from "@/lib/server/admin";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (!adminSessionAuthorized(request.headers))
    return Response.json(
      { error: "Authentication required" },
      { status: 401, headers },
    );
  const params = new URL(request.url).searchParams;
  return Response.json(
    readAdmin({
      q: params.get("q") || "",
      status: params.get("status") || "",
      page: params.get("page") || "",
      id: params.get("id") || "",
    }),
    { headers },
  );
}
