import AdminDashboard from "@/components/admin/AdminDashboard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Proposals",
  robots: { index: false, follow: false },
};
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminDashboard view="proposals" searchParams={searchParams} />;
}
