"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, GlobeHemisphereWest, Path, UsersThree } from "@phosphor-icons/react";
import { capabilities } from "@/lib/content";

const outcomeIcons = [UsersThree, GlobeHemisphereWest, Path];

export function Capabilities() {
  const [selected, setSelected] = useState(0);
  const active = capabilities[selected];

  return (
    <section className="capabilities-section section-pad" id="capabilities" aria-labelledby="capabilities-heading">
      <div className="container capabilities-grid">
        <div className="capabilities-index">
          <p className="eyebrow" id="capabilities-heading">Our capabilities</p>
          <div className="capability-tabs" role="tablist" aria-label="Capabilities">
            {capabilities.map((item, index) => (
              <button
                id={`capability-tab-${index}`}
                key={item.title}
                type="button"
                role="tab"
                aria-selected={selected === index}
                aria-controls="capability-panel"
                className={`capability-tab ${selected === index ? "active" : ""}`}
                onClick={() => setSelected(index)}
              >
                <span>{item.title}</span><ArrowRight size={17} weight="light" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <div id="capability-panel" className="capability-detail" role="tabpanel" aria-labelledby={`capability-tab-${selected}`}>
          <div className="capability-detail-top">
            <div className="capability-copy">
              <h2>{active.title}</h2>
              <p className="capability-intro">{active.intro}</p>
              <p className="capability-description">{active.description}</p>
            </div>
            <div className="capability-image">
              <Image src={active.image} alt="International civic and commercial landscape" fill sizes="(max-width: 900px) 100vw, 35vw" />
            </div>
          </div>
          <p className="micro-label outcomes-label">What this can provide</p>
          <div className="outcomes">
            {active.outcomes.map((outcome, index) => {
              const Icon = outcomeIcons[index];
              return (
                <div className="outcome" key={outcome}>
                  <span className="outcome-icon"><Icon size={24} weight="light" aria-hidden="true" /></span>
                  <span>{outcome}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
