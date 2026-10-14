import { OutreachDirectory } from "@/components/OutreachDirectory";
import { redirect } from "next/navigation";
import { outreachSignedIn } from "@/lib/server/outreach-auth";
import { readPressContacts } from "@/lib/server/outreach-contacts";

export const metadata = {
  title: "Press & Outreach",
  robots: { index: false, follow: false },
  description:
    "Explore published press, newsroom and journalist contacts by outlet, region and beat.",
};
export default async function Page() {
  if (!(await outreachSignedIn())) redirect("/outreach/login");
  const contacts = await readPressContacts();
  if (!contacts) return (
    <section className="container network-hero">
      <h1>Press &amp; Outreach</h1>
      <p>The outreach directory is currently unavailable. Please try again later.</p>
    </section>
  );
  const data = { contacts };
  return (
    <>

      <section className="network-hero">
        <div className="container">
          <div className="network-hero-title">
            <div className="eyebrow">
              <span />
              PRESS & OUTREACH
            </div>
            <h1>
              The right story.
              <br />
              <em>The right people.</em>
            </h1>
            <p>
              Explore journalists, newsrooms and media outlets.
              <br />
              Find a published contact for your next conversation.
            </p>
          </div>
          <div className="network-summary">
            <div>
              <strong>{data.contacts.length}</strong>
              <p>Contact listings</p>
            </div>
            <div>
              <strong>
                {new Set(data.contacts.map((p) => p.outlet)).size}
              </strong>
              <p>Media outlets</p>
            </div>
            <div>
              <strong>
                {new Set(data.contacts.map((p) => p.segment)).size}
              </strong>
              <p>Segments</p>
            </div>
          </div>
        </div>
      </section>
      <OutreachDirectory contacts={data.contacts} />
    </>
  );
}
