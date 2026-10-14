import Link from "next/link";
import { ProfileCard } from "@/components/ProfileCard";
import { profiles } from "@/lib/profiles";
export default function Page() {
  return (
    <>
      <section className={"hero"}>
        <div className={"hero-photo"}></div>
        <div className={"hero-shade"}></div>
        <div className={"container hero-content"}>
          <h1>
            {"Influence."}
            <br />
            {"Access."}
            <br />
            <em>{"Intelligence."}</em>
          </h1>
          <div className={"hero-bottom"}>
            <div>
              <p>
                {"The network behind"}
                <br />
                {"consequential decisions."}
              </p>
              <div className={"hero-buttons"}>
                <Link href={"/contact"} className={"button primary"}>
                  {"Request a confidential consultation"}
                </Link>
                <Link href={"/network"} className={"button ghost"}>
                  {"Explore our global network"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className={"stats container"}>
        <div>
          <strong>
            {"195"}
            <span></span>
          </strong>
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
      <section className={"section container connection"} id={"connection"}>
        <div>
          <div className={"eyebrow"}>
            <span></span>
            {"THE POWER OF CONNECTION"}
          </div>
          <h2>
            {"We understand"}
            <br />
            {"how the world"}
            <br />
            <em>{"connects."}</em>
          </h2>
        </div>
        <div className={"connection-copy"}>
          <p className={"lead"}>
            {
              "The world’s most consequential decisions are rarely made in isolation."
            }
          </p>
          <p>
            {
              "They are shaped by relationships between governments, institutions, corporations, investors and individuals with the ability to influence outcomes."
            }
          </p>
          <p>
            {
              "Influence Rock operates at that intersection. We combine global perspective, local intelligence and strategic relationships to help clients navigate environments where access, timing, knowledge and trust matter."
            }
          </p>
        </div>
      </section>
      <section className={"section expertise-preview"}>
        <div className={"container"}>
          <div className={"section-heading"}>
            <div>
              <div className={"eyebrow"}>
                <span></span>
                {"WHAT WE DO"}
              </div>
              <h2>
                {"The right access."}
                <br />
                {"The "}
                <em>{"right intelligence."}</em>
              </h2>
            </div>
            <div>
              <p>
                {"Six connected capabilities."}
                <br />
                {"One clear strategic objective."}
              </p>
              <Link href={"/expertise"} className={"text-link"}>
                {"Discover our expertise"}
              </Link>
            </div>
          </div>
          <div className={"service-grid"}>
            <Link href={"/expertise#service-0"} className={"service-card"}>
              <span className={"service-top"}>
                <svg
                  width={"26"}
                  height={"26"}
                  viewBox={"0 0 24 24"}
                  fill={"none"}
                  stroke={"currentColor"}
                  strokeWidth={"1.4"}
                  strokeLinecap={"round"}
                  strokeLinejoin={"round"}
                  aria-hidden={"true"}
                >
                  <circle cx={"12"} cy={"5"} r={"2"}></circle>
                  <circle cx={"5"} cy={"18"} r={"2"}></circle>
                  <circle cx={"19"} cy={"18"} r={"2"}></circle>
                  <path d={"m11 7-5 9m7-9 5 9M7 18h10"}></path>
                </svg>
              </span>
              <h3>{"Strategic Access"}</h3>
              <p>
                {
                  "Identify the people and institutions that matter. Create considered pathways for meaningful engagement."
                }
              </p>
              <span className={"text-link"}>{"Explore capability"}</span>
            </Link>
            <Link href={"/expertise#service-1"} className={"service-card"}>
              <span className={"service-top"}>
                <svg
                  width={"26"}
                  height={"26"}
                  viewBox={"0 0 24 24"}
                  fill={"none"}
                  stroke={"currentColor"}
                  strokeWidth={"1.4"}
                  strokeLinecap={"round"}
                  strokeLinejoin={"round"}
                  aria-hidden={"true"}
                >
                  <path
                    d={"M4 21h16M6 21V7l6-4 6 4v14M9 9h6M9 13h6M9 17h6"}
                  ></path>
                </svg>
              </span>
              <h3>{"Government & Public Affairs"}</h3>
              <p>
                {
                  "Navigate political environments, policy and regulation with transparent, carefully managed strategies."
                }
              </p>
              <span className={"text-link"}>{"Explore capability"}</span>
            </Link>
            <Link href={"/expertise#service-2"} className={"service-card"}>
              <span className={"service-top"}>
                <svg
                  width={"26"}
                  height={"26"}
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
              </span>
              <h3>{"Global Market Entry"}</h3>
              <p>
                {
                  "Enter unfamiliar markets with a clearer understanding of local institutions, partners and networks."
                }
              </p>
              <span className={"text-link"}>{"Explore capability"}</span>
            </Link>
            <Link href={"/expertise#service-3"} className={"service-card"}>
              <span className={"service-top"}>
                <svg
                  width={"26"}
                  height={"26"}
                  viewBox={"0 0 24 24"}
                  fill={"none"}
                  stroke={"currentColor"}
                  strokeWidth={"1.4"}
                  strokeLinecap={"round"}
                  strokeLinejoin={"round"}
                  aria-hidden={"true"}
                >
                  <circle cx={"12"} cy={"12"} r={"9"}></circle>
                  <path d={"m16 8-3 5-5 3 3-5z"}></path>
                </svg>
              </span>
              <h3>{"Strategic Introductions"}</h3>
              <p>
                {
                  "Connect with senior figures across government, business, finance and industry, with purpose."
                }
              </p>
              <span className={"text-link"}>{"Explore capability"}</span>
            </Link>
            <Link href={"/expertise#service-4"} className={"service-card"}>
              <span className={"service-top"}>
                <svg
                  width={"26"}
                  height={"26"}
                  viewBox={"0 0 24 24"}
                  fill={"none"}
                  stroke={"currentColor"}
                  strokeWidth={"1.4"}
                  strokeLinecap={"round"}
                  strokeLinejoin={"round"}
                  aria-hidden={"true"}
                >
                  <path
                    d={"m12 3 10 5-10 5L2 8zm-9 10 9 5 9-5M3 18l9 5 9-5"}
                  ></path>
                </svg>
              </span>
              <h3>{"Political & Institutional Intelligence"}</h3>
              <p>
                {
                  "Turn political, regulatory and institutional developments into a clear strategic perspective."
                }
              </p>
              <span className={"text-link"}>{"Explore capability"}</span>
            </Link>
            <Link href={"/expertise#service-5"} className={"service-card"}>
              <span className={"service-top"}>
                <svg
                  width={"26"}
                  height={"26"}
                  viewBox={"0 0 24 24"}
                  fill={"none"}
                  stroke={"currentColor"}
                  strokeWidth={"1.4"}
                  strokeLinecap={"round"}
                  strokeLinejoin={"round"}
                  aria-hidden={"true"}
                >
                  <path d={"m12 3 8 3v6c0 4-5 8-8 9-3-1-8-5-8-9V6z"}></path>
                  <path d={"m8 12 3 3 5-6"}></path>
                </svg>
              </span>
              <h3>{"Sensitive Situations"}</h3>
              <p>
                {
                  "Discreet strategic support for complex situations involving multiple stakeholders and jurisdictions."
                }
              </p>
              <span className={"text-link"}>{"Explore capability"}</span>
            </Link>
          </div>
        </div>
      </section>
      <section className={"global-section"}>
        <div className={"container global-inner"}>
          <div>
            <div className={"eyebrow"}>
              <span></span>
              {"ONE GLOBAL NETWORK"}
            </div>
            <h2>
              {"The world is complex."}
              <br />
              {"Your network"}
              <br />
              <em>{"should be connected."}</em>
            </h2>
            <p>
              {
                "From established financial centers to emerging markets, political capitals to commercial hubs. Global objectives require global relationships."
              }
            </p>
            <Link href={"/network"} className={"button light-outline"}>
              {"Meet the network"}
            </Link>
          </div>
          <div className={"network-globe"} aria-hidden={"true"}>
            <svg viewBox={"0 0 600 600"} fill={"none"}>
              <defs>
                <radialGradient id={"glow"}>
                  <stop stopColor={"#e8b9c1"} stopOpacity={".1"}></stop>
                  <stop
                    offset={"1"}
                    stopColor={"#9e112e"}
                    stopOpacity={"0"}
                  ></stop>
                </radialGradient>
              </defs>
              <circle
                cx={"300"}
                cy={"300"}
                r={"295"}
                fill={"url(#glow)"}
              ></circle>
              <g stroke={"#a36570"} strokeWidth={".7"}>
                <circle cx={"300"} cy={"300"} r={"236"}></circle>
                <ellipse cx={"300"} cy={"300"} rx={"177"} ry={"236"}></ellipse>
                <ellipse cx={"300"} cy={"300"} rx={"88"} ry={"236"}></ellipse>
                <ellipse cx={"300"} cy={"300"} rx={"236"} ry={"177"}></ellipse>
                <ellipse cx={"300"} cy={"300"} rx={"236"} ry={"88"}></ellipse>
                <path d={"M64 300h472M300 64v472"}></path>
              </g>
              <g fill={"#e2afb9"}>
                <circle cx={"132"} cy={"170"} r={"4"}></circle>
                <circle cx={"187"} cy={"394"} r={"4"}></circle>
                <circle cx={"298"} cy={"170"} r={"5"}></circle>
                <circle cx={"356"} cy={"244"} r={"4"}></circle>
                <circle cx={"425"} cy={"191"} r={"5"}></circle>
                <circle cx={"440"} cy={"373"} r={"4"}></circle>
                <circle cx={"296"} cy={"363"} r={"4"}></circle>
              </g>
              <g stroke={"#c1929c"} strokeWidth={".8"} opacity={".6"}>
                <path
                  d={
                    "M132 170Q270 60 425 191M187 394Q237 240 298 170M298 170Q452 238 440 373M356 244Q327 300 296 363M132 170Q226 168 356 244"
                  }
                ></path>
              </g>
            </svg>
            <span className={"globe-label g1"}>{"AMERICAS"}</span>
            <span className={"globe-label g2"}>{"EUROPE"}</span>
            <span className={"globe-label g3"}>{"ASIA-PACIFIC"}</span>
            <span className={"globe-label g4"}>{"AFRICA"}</span>
          </div>
        </div>
      </section>
      <section className={"section container people-preview"}>
        <div className={"section-heading"}>
          <div>
            <div className={"eyebrow"}>
              <span></span>
              {"THE PEOPLE BEHIND THE NETWORK"}
            </div>
            <h2>
              {"Global perspective."}
              <br />
              <em>{"Personal connections."}</em>
            </h2>
          </div>
          <div>
            <p>
              {"Strategists. Advisors. Connectors."}
              <br />
              {"One network mobilized around your mission."}
            </p>
            <Link href={"/network"} className={"text-link"}>
              {"Explore our people"}
            </Link>
          </div>
        </div>
        <div className={"profile-grid"}>
          <ProfileCard
            profile={profiles.find((p) => p.id === "01")!}
            compact={true}
          />
          <ProfileCard
            profile={profiles.find((p) => p.id === "02")!}
            compact={true}
          />
          <ProfileCard
            profile={profiles.find((p) => p.id === "06")!}
            compact={true}
          />
          <ProfileCard
            profile={profiles.find((p) => p.id === "07")!}
            compact={true}
          />
        </div>
      </section>
      <section className={"mandate-section"}>
        <div className={"container mandate-inner"}>
          <div>
            <div className={"eyebrow"}>
              <span></span>
              {"A FIRM FOR THE FEW"}
            </div>
            <h2>
              {"Exceptional objectives."}
              <br />
              <em>{"Selected mandates."}</em>
            </h2>
            <p>
              {
                "We deliberately limit the number of mandates we accept. Every engagement is reviewed for strategic relevance, complexity and our ability to create meaningful value."
              }
            </p>
            <Link href={"/approach"} className={"text-link"}>
              {"Understand our approach"}
            </Link>
          </div>
          <div className={"mandate-number"}>
            <span>{"MANDATES GENERALLY BEGIN AT"}</span>
            <strong>
              <small>{"CHF"}</small>
              {" 1M"}
              <span>{"+"}</span>
            </strong>
            <p>
              {"The threshold is only the beginning."}
              <br />
              {"The right fit matters more."}
            </p>
          </div>
        </div>
      </section>
      <section className={"section container method-preview"}>
        <div className={"section-heading"}>
          <div>
            <div className={"eyebrow"}>
              <span></span>
              {"THE INFLUENCE ROCK METHOD"}
            </div>
            <h2>
              {"Understanding"}
              <br />
              {"before "}
              <em>{"action."}</em>
            </h2>
          </div>
          <Link href={"/approach"} className={"text-link"}>
            {"Our five-step method"}
          </Link>
        </div>
        <div className={"method-rail"}>
          <div>
            <span>{"01"}</span>
            <h3>{"Understand"}</h3>
            <p>{"We begin with the objective."}</p>
          </div>
          <div>
            <span>{"02"}</span>
            <h3>{"Map"}</h3>
            <p>{"We map the relevant ecosystem."}</p>
          </div>
          <div>
            <span>{"03"}</span>
            <h3>{"Strategize"}</h3>
            <p>{"We determine which relationships matter."}</p>
          </div>
          <div>
            <span>{"04"}</span>
            <h3>{"Connect"}</h3>
            <p>{"We activate the relevant network."}</p>
          </div>
          <div>
            <span>{"05"}</span>
            <h3>{"Navigate"}</h3>
            <p>{"We continue to monitor the environment."}</p>
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
