import Link from "next/link";
import { ProfileCard } from "@/components/ProfileCard";
import { profiles } from "@/lib/profiles";
export const metadata = { title: "Our Approach" };
export default function Page() {
  return (
    <>
      <section className={"page-hero container"}>
        <div className={"eyebrow"}>
          <span></span>
          {"OUR APPROACH"}
        </div>
        <h1>
          {"One objective."}
          <br />
          <em>{"A world of possibilities."}</em>
        </h1>
        <div className={"page-intro"}>
          <p>
            {"Traditional consultants provide analysis."}
            <br />
            {"We combine intelligence, relationships, access and execution."}
          </p>
          <p>
            {
              "Our clients come to us when conventional advisory services are not enough. Each mandate brings together the relevant political, commercial and diplomatic understanding."
            }
          </p>
        </div>
      </section>
      <section className={"section method-section"}>
        <div className={"container"}>
          <div className={"method-heading"}>
            <div className={"eyebrow"}>
              <span></span>
              {"THE INFLUENCE ROCK METHOD"}
            </div>
            <h2>
              {"Every connection"}
              <br />
              <em>{"is purposeful."}</em>
            </h2>
          </div>
          <div className={"method-steps"}>
            <article>
              <span>{"01"}</span>
              <div>
                <h3>{"Understand"}</h3>
                <p className={"lead"}>{"We begin with the objective."}</p>
                <p>
                  {
                    "What is the client trying to achieve? What stands in the way? Who matters? Which jurisdictions are involved?"
                  }
                </p>
              </div>
            </article>
            <article>
              <span>{"02"}</span>
              <div>
                <h3>{"Map"}</h3>
                <p className={"lead"}>{"We map the relevant ecosystem."}</p>
                <p>
                  {
                    "Institutions. Decision-makers. Commercial stakeholders. Influencers. Potential partners. Potential obstacles."
                  }
                </p>
              </div>
            </article>
            <article>
              <span>{"03"}</span>
              <div>
                <h3>{"Strategize"}</h3>
                <p className={"lead"}>
                  {"We determine which relationships matter."}
                </p>
                <p>
                  {
                    "In what sequence, through which channels and for what strategic purpose."
                  }
                </p>
              </div>
            </article>
            <article>
              <span>{"04"}</span>
              <div>
                <h3>{"Connect"}</h3>
                <p className={"lead"}>{"We activate the relevant network."}</p>
                <p>
                  {
                    "Where appropriate, we facilitate engagement with relevant stakeholders. Every connection is purposeful."
                  }
                </p>
              </div>
            </article>
            <article>
              <span>{"05"}</span>
              <div>
                <h3>{"Navigate"}</h3>
                <p className={"lead"}>
                  {"We continue to monitor the environment."}
                </p>
                <p>
                  {
                    "Markets, governments and institutions evolve. We provide strategic guidance as circumstances change."
                  }
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className={"section container audience"}>
        <div>
          <div className={"eyebrow"}>
            <span></span>
            {"BUILT FOR CONSEQUENTIAL OBJECTIVES"}
          </div>
          <h2>
            {"Ambition beyond"}
            <br />
            <em>{"ordinary consulting."}</em>
          </h2>
          <p>
            {
              "We assemble the relevant capabilities around the mandate, whether it concerns a single jurisdiction or a multinational strategy."
            }
          </p>
        </div>
        <div className={"audience-list"}>
          <span>{"Multinational corporations"}</span>
          <span>{"Family offices"}</span>
          <span>{"Institutional investors"}</span>
          <span>{"Private equity groups"}</span>
          <span>{"International organizations"}</span>
          <span>{"Founders & entrepreneurs"}</span>
          <span>{"Industry leaders"}</span>
          <span>{"Strategic investors"}</span>
          <span>{"High-net-worth individuals"}</span>
          <span>{"Companies entering new markets"}</span>
        </div>
      </section>
      <section className={"value-section section"}>
        <div className={"container"}>
          <div>
            <div className={"eyebrow"}>
              <span></span>
              {"WHAT OUR CLIENTS BUY"}
            </div>
            <h2>
              {"Perspective."}
              <br />
              {"Preparation."}
              <br />
              <em>{"A credible introduction."}</em>
            </h2>
          </div>
          <p>
            {
              "Our clients buy the ability to approach unfamiliar environments with a clearer understanding of how those environments work. When appropriate, they gain a credible introduction that cannot be replicated through conventional databases or public directories."
            }
          </p>
        </div>
      </section>
      <section className={"section container selection"}>
        <div>
          <div className={"eyebrow"}>
            <span></span>
            {"SELECTED MANDATES"}
          </div>
          <h2>
            {"A firm"}
            <br />
            <em>{"for the few."}</em>
          </h2>
          <p>
            {
              "We deliberately limit the number of engagements we accept. The financial threshold is only one element of our selection process."
            }
          </p>
        </div>
        <div>
          <div className={"selection-price"}>
            {"CHF 1 million"}
            <span>{"+"}</span>
          </div>
          <p>
            {
              "Every prospective engagement undergoes a comprehensive internal review:"
            }
          </p>
          <ul>
            <li>{"Strategic nature of the objective"}</li>
            <li>{"Complexity and jurisdictions involved"}</li>
            <li>{"Reputational considerations"}</li>
            <li>{"Ability to create meaningful value"}</li>
          </ul>
          <p>
            {
              "Not every prospective client is accepted. Each mandate must be the right fit."
            }
          </p>
        </div>
      </section>
      <section className={"responsibility section"}>
        <div className={"container"}>
          <div>
            <svg
              width={"34"}
              height={"34"}
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
            <div className={"eyebrow"}>
              <span></span>
              {"INFLUENCE REQUIRES RESPONSIBILITY"}
            </div>
            <h2>
              {"Power, exercised"}
              <br />
              <em>{"responsibly."}</em>
            </h2>
          </div>
          <div>
            <p>
              {
                "We operate according to applicable laws and regulations in the jurisdictions in which we work."
              }
            </p>
            <p>
              {
                "We do not guarantee political, regulatory, commercial or governmental outcomes. We do not offer improper payments, undisclosed inducements or unlawful access."
              }
            </p>
            <p>
              {
                "Our objective is intelligent, credible and appropriate engagement with the people and institutions relevant to our clients’ objectives."
              }
            </p>
            <div className={"principles"}>
              {"Confidentiality · Discretion · Integrity"}
            </div>
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
