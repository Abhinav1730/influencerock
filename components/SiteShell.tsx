"use client";
import { usePathname } from "next/navigation";
export function SiteShell({
  children,
  portal,
  header,
  footer,
}: {
  children: React.ReactNode;
  portal: boolean;
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const login = usePathname() === "/login" || portal;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {login ? null : header}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      {login ? null : footer}
    </>
  );
}
