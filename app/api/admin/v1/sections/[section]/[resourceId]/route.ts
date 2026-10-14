import { handleAdminRead } from "@/lib/server/admin-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ section: string; resourceId: string }> },
) {
  const { section, resourceId } = await context.params;
  return handleAdminRead(request, `sections/${section}/${resourceId}`);
}
