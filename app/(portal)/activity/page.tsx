import AdminDashboard from "@/components/admin/AdminDashboard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminDashboard view="activity" searchParams={searchParams} />;
}
