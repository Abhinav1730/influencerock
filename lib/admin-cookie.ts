export const ADMIN_COOKIE = "__Host-ir_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

export function adminToken(headers: Headers): string | null {
  const value = (headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
