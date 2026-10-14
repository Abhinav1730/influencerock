import { isAdminHost } from "@/lib/server/admin-host";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminSessionAuthorized } from "@/lib/server/admin-auth";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};
export default async function LoginPage() {
  const requestHeaders = await headers();
  if (!isAdminHost(requestHeaders))
    redirect(
      `https://${process.env.IR_ADMIN_HOST || "admin.influencerock.com"}/login`,
    );
  if (adminSessionAuthorized(requestHeaders)) redirect("/");
  return (
    <div className={styles.login}>
      <aside
        className={styles.story}
        aria-label="Influence Rock administration"
      >
        <a
          className={styles.brand}
          href="https://influencerock.com"
          aria-label="Influence Rock home"
        >
          <span className={styles.monogram}>
            IR
            <span />
          </span>
          <span>
            INFLUENCE ROCK<small>INTERNATIONAL RELATIONS</small>
          </span>
        </a>
        <div className={styles.editorial}>
          <span className={styles.eyebrow}>THE ADMINISTRATIVE WORKSPACE</span>
          <h2>
            Global connections.
            <br />
            <em>A clearer perspective.</em>
          </h2>
          <p>
            One place to follow the conversations,
            <br className={styles.desktopBreak} /> meetings and ideas moving
            your network forward.
          </p>
        </div>
        <div className={styles.globe} aria-hidden="true">
          <svg viewBox="0 0 640 400" fill="none">
            <defs>
              <radialGradient id="glow">
                <stop stopColor="#e5b6a1" stopOpacity=".12" />
                <stop offset="1" stopColor="#e5b6a1" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="320" cy="202" rx="267" ry="195" fill="url(#glow)" />
            <g stroke="currentColor" strokeWidth=".7">
              <circle cx="320" cy="202" r="177" />
              <ellipse cx="320" cy="202" rx="127" ry="177" />
              <ellipse cx="320" cy="202" rx="56" ry="177" />
              <ellipse cx="320" cy="202" rx="177" ry="64" />
              <ellipse cx="320" cy="202" rx="177" ry="126" />
              <path d="M143 202h354M320 25v354" />
              <ellipse
                cx="320"
                cy="202"
                rx="283"
                ry="78"
                transform="rotate(-25 320 202)"
                strokeDasharray="3 6"
              />
              <path
                d="M210 106Q260 200 423 254M240 293Q400 270 438 102M210 106Q360 35 438 102"
                stroke="#f0c5ac"
                strokeOpacity=".65"
              />
            </g>
            <g fill="#f2cfb5">
              <circle cx="210" cy="106" r="4" />
              <circle cx="423" cy="254" r="4" />
              <circle cx="240" cy="293" r="3" />
              <circle cx="438" cy="102" r="4" />
            </g>
            <g stroke="#f2cfb5" strokeOpacity=".3">
              <circle cx="210" cy="106" r="11" />
              <circle cx="438" cy="102" r="11" />
              <circle cx="423" cy="254" r="11" />
            </g>
          </svg>
          <span className={styles.coordinate}>
            CONNECTED BY PURPOSE. GUIDED BY PERSPECTIVE.
          </span>
        </div>
        <div className={styles.storyFooter}>
          <span>PROPOSALS</span>
          <i />
          <span>MEETINGS</span>
          <i />
          <span>DELEGATE EMAILS</span>
        </div>
      </aside>
      <section className={styles.access} aria-labelledby="login-heading">
        <div className={styles.accessLabel}>
          <span /> ADMIN PORTAL
        </div>
        <div className={styles.formWrap}>
          <div className={styles.lock} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
            </svg>
          </div>
          <span className={styles.formEyebrow}>WELCOME TO INFLUENCE ROCK</span>
          <h1 id="login-heading">Welcome back.</h1>
          <p className={styles.intro}>
            Sign in to your administrative workspace.
          </p>
          <LoginForm />
          <div className={styles.privateNote}>
            <span aria-hidden="true">◇</span> Private access. A broader
            perspective.
          </div>
        </div>
        <footer className={styles.accessFooter}>
          <span>© 2026 Influence Rock</span>
          <span>Authorized personnel only</span>
        </footer>
      </section>
    </div>
  );
}
