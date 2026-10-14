import Link from "next/link";
export const metadata = { title: "Our Expertise" };
export default function Page() {
  return (
    <>
      <section className={"page-hero container"}>
        <div className={"eyebrow"}>
          <span></span>
          {"OUR EXPERTISE"}
        </div>
        <h1>
          {"Access with purpose."}
          <br />
          <em>{"Intelligence with impact."}</em>
        </h1>
        <div className={"page-intro"}>
          <p>{"We assemble the right capabilities around your objective."}</p>
          <p>
            {
              "When markets are unfamiliar, stakeholders are difficult to identify or the regulatory environment is complex, perspective and relationships matter."
            }
          </p>
        </div>
      </section>
      <section className={"container expertise-list"}>
        <article className={"expertise-detail"} id={"service-0"}>
          <div className={"expertise-number"}>{"01"}</div>
          <div>
            <h2>{"Strategic Access"}</h2>
            <p className={"lead"}>
              {
                "The right conversation can change the trajectory of an opportunity. We identify relevant decision-makers, institutions, business leaders and stakeholders and develop appropriate pathways for engagement."
              }
            </p>
          </div>
          <div className={"capability-list"}>
            <span>{"CORE CAPABILITIES"}</span>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Decision-maker identification"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Institutional mapping"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Purposeful stakeholder engagement"}</span>
            </div>
            <Link
              href={"/contact?expertise=Strategic%20Access"}
              className={"text-link"}
            >
              {"Discuss this capability"}
            </Link>
          </div>
        </article>
        <article className={"expertise-detail"} id={"service-1"}>
          <div className={"expertise-number"}>{"02"}</div>
          <div>
            <h2>{"Government & Public Affairs"}</h2>
            <p className={"lead"}>
              {
                "Government decisions can profoundly affect companies, industries and investments. We help clients understand political and institutional environments, identify relevant stakeholders and engage through legitimate, transparent and carefully managed strategies."
              }
            </p>
          </div>
          <div className={"capability-list"}>
            <span>{"CORE CAPABILITIES"}</span>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Government and institutional mapping"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Stakeholder identification"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Public-affairs strategy"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Regulatory engagement"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Policy monitoring"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Political intelligence"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Strategic introductions"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Stakeholder and coalition engagement"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Cross-border government relations"}</span>
            </div>
            <Link
              href={"/contact?expertise=Government%20%26%20Public%20Affairs"}
              className={"text-link"}
            >
              {"Discuss this capability"}
            </Link>
          </div>
        </article>
        <article className={"expertise-detail"} id={"service-2"}>
          <div className={"expertise-number"}>{"03"}</div>
          <div>
            <h2>{"Global Market Entry"}</h2>
            <p className={"lead"}>
              {
                "Entering a new market means entering an unfamiliar network. We identify relevant institutions, commercial stakeholders, strategic partners and influential networks so clients understand the environment in which they intend to operate."
              }
            </p>
          </div>
          <div className={"capability-list"}>
            <span>{"CORE CAPABILITIES"}</span>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Market ecosystem analysis"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Strategic partner identification"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Local institutional intelligence"}</span>
            </div>
            <Link
              href={"/contact?expertise=Global%20Market%20Entry"}
              className={"text-link"}
            >
              {"Discuss this capability"}
            </Link>
          </div>
        </article>
        <article className={"expertise-detail"} id={"service-3"}>
          <div className={"expertise-number"}>{"04"}</div>
          <div>
            <h2>{"Strategic Introductions"}</h2>
            <p className={"lead"}>
              {
                "Some opportunities begin with a conversation that would otherwise never happen. We facilitate carefully considered introductions between clients and relevant senior figures across government, business, finance and industry."
              }
            </p>
          </div>
          <div className={"capability-list"}>
            <span>{"CORE CAPABILITIES"}</span>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Senior-level introductions"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Cross-sector relationships"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Strategic relevance assessment"}</span>
            </div>
            <Link
              href={"/contact?expertise=Strategic%20Introductions"}
              className={"text-link"}
            >
              {"Discuss this capability"}
            </Link>
          </div>
        </article>
        <article className={"expertise-detail"} id={"service-4"}>
          <div className={"expertise-number"}>{"05"}</div>
          <div>
            <h2>{"Political & Institutional Intelligence"}</h2>
            <p className={"lead"}>
              {
                "We monitor political, regulatory, economic and institutional developments to help clients anticipate change and understand its potential implications. We transform fragmented information into strategic perspective."
              }
            </p>
          </div>
          <div className={"capability-list"}>
            <span>{"CORE CAPABILITIES"}</span>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Political and regulatory monitoring"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Institutional analysis"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Strategic scenario assessment"}</span>
            </div>
            <Link
              href={
                "/contact?expertise=Political%20%26%20Institutional%20Intelligence"
              }
              className={"text-link"}
            >
              {"Discuss this capability"}
            </Link>
          </div>
        </article>
        <article className={"expertise-detail"} id={"service-5"}>
          <div className={"expertise-number"}>{"06"}</div>
          <div>
            <h2>{"Sensitive Situations"}</h2>
            <p className={"lead"}>
              {
                "When circumstances become complex, conventional solutions are often insufficient. We help clients understand the environment, establish appropriate communication channels and develop strategies designed to protect long-term interests."
              }
            </p>
          </div>
          <div className={"capability-list"}>
            <span>{"CORE CAPABILITIES"}</span>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Multi-jurisdiction coordination"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Stakeholder communication strategy"}</span>
            </div>
            <div>
              <svg
                width={"15"}
                height={"15"}
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.4"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"m5 12 4 4L19 6"}></path>
              </svg>
              <span>{"Long-term interest protection"}</span>
            </div>
            <Link
              href={"/contact?expertise=Sensitive%20Situations"}
              className={"text-link"}
            >
              {"Discuss this capability"}
            </Link>
          </div>
        </article>
      </section>
      <section className={"advantage section"}>
        <div className={"container"}>
          <div className={"section-heading"}>
            <div className={"eyebrow"}>
              <span></span>
              {"THE INFLUENCE ROCK ADVANTAGE"}
            </div>
            <h2>
              {"The difference is"}
              <br />
              <em>{"in the connections."}</em>
            </h2>
          </div>
          <div className={"advantage-grid"}>
            <article>
              <span>{"01"}</span>
              <h3>{"Global reach"}</h3>
              <p>
                {
                  "A relationship infrastructure across markets and institutions."
                }
              </p>
            </article>
            <article>
              <span>{"02"}</span>
              <h3>{"Local intelligence"}</h3>
              <p>
                {
                  "Understanding of political, commercial and cultural dynamics."
                }
              </p>
            </article>
            <article>
              <span>{"03"}</span>
              <h3>{"Senior-level relationships"}</h3>
              <p>
                {"Credibility and institutional knowledge where it matters."}
              </p>
            </article>
            <article>
              <span>{"04"}</span>
              <h3>{"Strategic intelligence"}</h3>
              <p>
                {
                  "A political, commercial and reputational assessment before action."
                }
              </p>
            </article>
            <article>
              <span>{"05"}</span>
              <h3>{"Discretion"}</h3>
              <p>
                {
                  "Confidential mandates. Appropriate information security. A need-to-know approach."
                }
              </p>
            </article>
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
