import { headers } from "next/headers";
import { isAdminHost } from "@/lib/server/admin-host";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PolicyProvider } from "@/components/Policies";
import { outreachSignedIn } from "@/lib/server/outreach-auth";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Influence Rock", template: "%s — Influence Rock" },
  description:
    "International Relations & Strategic Access. Global perspective, local intelligence and purposeful connections.",
  icons: { icon: "/assets/favicon.svg" },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PolicyProvider>
          <SiteShell
            portal={isAdminHost(await headers())}
            header={<Header outreachAuthenticated={await outreachSignedIn()} />}
            footer={<Footer />}
          >
            {children}
          </SiteShell>
        </PolicyProvider>
      </body>
    </html>
  );
}
