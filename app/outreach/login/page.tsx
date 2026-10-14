import { redirect } from "next/navigation";
import { outreachSignedIn } from "@/lib/server/outreach-auth";
import { signIn } from "../actions";
export const metadata = { title: "Outreach sign in", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await outreachSignedIn()) redirect("/outreach");
  const { error } = await searchParams;
  const message = error === "limited" ? "Too many attempts. Try again in 15 minutes." : error === "unavailable" ? "Sign-in is temporarily unavailable." : error ? "Incorrect username or password." : "";
  return <section className="section container" style={{ maxWidth: 560, minHeight: "65vh" }}>
    <div className="eyebrow">PRESS & OUTREACH</div>
    <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", margin: "24px 0" }}>Sign in</h1>
    <p style={{ marginBottom: 32 }}>Access the private press contact directory.</p>
    <form action={signIn} style={{ display: "grid", gap: 20 }}>
      <label>Username<input name="username" autoComplete="username" required maxLength={128} style={{ display: "block", width: "100%", padding: 14, marginTop: 8 }} /></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={256} style={{ display: "block", width: "100%", padding: 14, marginTop: 8 }} /></label>
      {message && <p role="alert">{message}</p>}
      <button className="button primary" type="submit">Sign in</button>
    </form>
  </section>;
}
