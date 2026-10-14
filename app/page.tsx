import { headers } from "next/headers";
import { isAdminHost } from "@/lib/server/admin-host";
import AdminDashboard from "@/components/admin/AdminDashboard";
import PublicHome from "@/components/PublicHome";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return isAdminHost(await headers())
    ? { title: "Dashboard", robots: { index: false, follow: false } }
    : { title: "Influence. Access. Intelligence." };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (isAdminHost(await headers()))
    return <AdminDashboard searchParams={searchParams} />;
  return <PublicHome />;
}
