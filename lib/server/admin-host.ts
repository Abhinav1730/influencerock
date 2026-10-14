import "server-only";
export function isAdminHost(headers: Headers): boolean {
  return (
    headers.get("host")?.split(":")[0].toLowerCase() ===
    (process.env.IR_ADMIN_HOST || "admin.influencerock.com").toLowerCase()
  );
}
