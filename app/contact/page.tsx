import { ProfileCard } from "@/components/ProfileCard";
import { profiles } from "@/lib/profiles";
import { ContactForm } from "@/components/ContactForm";
export const metadata = { title: "Begin the Conversation" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = profiles.find((p) => p.id === params.profile);
  const expertise =
    typeof params.expertise === "string" ? params.expertise : "";
  return (
    <>
      <section className={"contact-page container"}>
        <div className={"contact-intro"}>
          <div className={"eyebrow"}>
            <span></span>
            {"BEGIN THE CONVERSATION"}
          </div>
          <h1>
            {"Your objective."}
            <br />
            <em>{"Our network."}</em>
          </h1>
          <p className={"lead"}>
            {
              "The first step is understanding what you are trying to accomplish."
            }
          </p>
          <p>
            {
              "Share a confidential overview of your objective, the relevant jurisdictions and your timeframe. New mandates are considered selectively following an internal review."
            }
          </p>
          <div className={"contact-standards"}>
            <div>
              <svg
                width={"22"}
                height={"22"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <rect
                  x={"5"}
                  y={"10"}
                  width={"14"}
                  height={"11"}
                  rx={"2"}
                ></rect>
                <path d={"M8 10V7a4 4 0 0 1 8 0v3"}></path>
              </svg>
              <span>{"Discretion from the first conversation"}</span>
            </div>
            <div>
              <svg
                width={"22"}
                height={"22"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <circle cx={"12"} cy={"12"} r={"9"}></circle>
                <ellipse cx={"12"} cy={"12"} rx={"4"} ry={"9"}></ellipse>
                <path d={"M3 12h18M5 6h14M5 18h14"}></path>
              </svg>
              <span>{"Global reach. Senior-level attention."}</span>
            </div>
          </div>
          <div className={"contact-threshold"}>
            <span>{"SELECTED MANDATES ONLY"}</span>
            <strong>{"CHF 1 million+"}</strong>
            <p>{"Minimum mandate generally considered."}</p>
          </div>
        </div>
        <ContactForm profile={profile} expertise={expertise} />
      </section>
    </>
  );
}
