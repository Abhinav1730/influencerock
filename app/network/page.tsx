import Link from "next/link";
import { NetworkDirectory, RegionLink } from "@/components/NetworkDirectory";
import { profiles, networkStats } from "@/lib/profiles";
export const metadata = { title: "Global Network" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const proposalId =
    typeof params.smartmeetProposal === "string" &&
    /^sm_[a-f0-9-]{36}$/.test(params.smartmeetProposal)
      ? params.smartmeetProposal
      : "";
  const delegate = profiles.find((profile) => profile.id === params.delegate);
  const meetingUrl =
    process.env.SMARTMEET_URL && proposalId
      ? `${process.env.SMARTMEET_URL.replace(/\/$/, "")}/meeting/${proposalId}`
      : "";
  return (
    <>
      {proposalId && <section className="proposal-receipt container" role="status">
        <div className="proposal-receipt-icon" aria-hidden="true">✓</div>
        <div><div className="eyebrow">YOUR NEXT CONVERSATION</div><h2>Booking details received{delegate ? ` with ${delegate.name}’s AI representative` : ''}.</h2>
          <p>Open SmartMeet for your confirmed time and current booking status. Your AI representative prepares a response for the next hourly email delivery. Human delegate attendance is not required.</p></div>
        {meetingUrl && <Link className="button primary" href={meetingUrl}>View your meeting ↗</Link>}
      </section>}
      <section className={"network-hero"}>
        <div className={"container"}>
          <div className={"network-hero-title"}>
            <div className={"eyebrow"}>
              <span></span>
              {"THE GLOBAL NETWORK"}
            </div>
            <h1>
              {"One world."}
              <br />
              <em>{"Connected."}</em>
            </h1>
            <p>
              {"Local understanding. International perspective."}
              <br />
              {"Find the expertise behind your next move."}
            </p>
          </div>
          <div className={"network-summary"}>
            <div>
              <strong>{"195"}</strong>
              <p>{"Countries"}</p>
            </div>
            <div>
              <strong>{profiles.length}</strong>
              <p>{"Network profiles"}</p>
            </div>
            <div>
              <strong>{"6"}</strong>
              <p>{"Continents"}</p>
            </div>
          </div>
        </div>
      </section>
      <NetworkDirectory />
      <section className={"section regions-section"}>
        <div className={"container"}>
          <div className={"section-heading"}>
            <div>
              <div className={"eyebrow"}>
                <span></span>
                {"REGIONAL LEADERSHIP"}
              </div>
              <h2>
                {"One global standard."}
                <br />
                <em>{"Local expertise."}</em>
              </h2>
            </div>
            <p>
              {"Every country has its own architecture of influence."}
              <br />
              {"Our regional structure reflects that reality."}
            </p>
          </div>
          <div className={"regions-grid"}>
            <RegionLink className={"region-card"} region={"Americas"}>
              <h3>{"Americas"}</h3>
              <p>
                {
                  "Government Affairs · Corporate Relations · Finance · Industry · Strategic Intelligence"
                }
              </p>
              <div>{"Washington · Mexico City · São Paulo"}</div>
              <span className={"text-link"}>{"Explore this region"}</span>
            </RegionLink>
            <RegionLink className={"region-card"} region={"Europe"}>
              <h3>{"Europe"}</h3>
              <p>
                {
                  "Government Relations · EU Affairs · Financial Institutions · Corporate Strategy · International Affairs"
                }
              </p>
              <div>{"London · Paris · Brussels · Stockholm"}</div>
              <span className={"text-link"}>{"Explore this region"}</span>
            </RegionLink>
            <RegionLink className={"region-card"} region={"Middle East"}>
              <h3>{"Middle East"}</h3>
              <p>
                {
                  "Government Affairs · Sovereign Relations · Investment · Infrastructure · Strategic Partnerships"
                }
              </p>
              <div>{"Dubai · Amman"}</div>
              <span className={"text-link"}>{"Explore this region"}</span>
            </RegionLink>
            <RegionLink className={"region-card"} region={"Africa"}>
              <h3>{"Africa"}</h3>
              <p>
                {
                  "Government Relations · Natural Resources · Infrastructure · Investment · Market Entry"
                }
              </p>
              <div>{"Lagos · Johannesburg"}</div>
              <span className={"text-link"}>{"Explore this region"}</span>
            </RegionLink>
            <RegionLink className={"region-card"} region={"Asia-Pacific"}>
              <h3>{"Asia-Pacific"}</h3>
              <p>
                {
                  "Government Affairs · Technology · Manufacturing · Finance · International Business"
                }
              </p>
              <div>{"Singapore · New Delhi · Tokyo"}</div>
              <span className={"text-link"}>{"Explore this region"}</span>
            </RegionLink>
            <RegionLink
              className={"region-card"}
              region={"Central Asia & Eurasia"}
            >
              <h3>{"Central Asia & Eurasia"}</h3>
              <p>
                {
                  "Government Relations · Energy · Infrastructure · Investment · Strategic Affairs"
                }
              </p>
              <div>{"Almaty · Tashkent"}</div>
              <span className={"text-link"}>{"Explore this region"}</span>
            </RegionLink>
          </div>
        </div>
      </section>
      <section className={"conversation"}>
        <div className={"container conversation-inner"}>
          <div>
            <div className={"eyebrow"}>
              <span></span>
              {"YOUR OBJECTIVE. OUR NETWORK."}
            </div>
            <h2>
              {"Some conversations"}
              <br />
              {"change "}
              <em>{"everything."}</em>
            </h2>
          </div>
          <div>
            <p>
              {"Tell us what you are trying to accomplish."}
              <br />
              {"We will determine whether we are the right strategic partner."}
            </p>
            <Link href={"/contact"} className={"button light"}>
              {"Request a confidential consultation"}
            </Link>
            <span className={"cta-note"}>
              {"Selected mandates only. Generally CHF 1 million+."}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
