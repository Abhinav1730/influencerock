import { handleAdminRead } from "@/lib/server/admin-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;
  return handleAdminRead(request, resource);
}
