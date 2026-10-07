"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { scenarios } from "@/lib/content";

export function ScenarioCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = scenarios[activeIndex];
  const next = scenarios[(activeIndex + 1) % scenarios.length];

  function move(direction: -1 | 1) {
    setActiveIndex((currentIndex) => (currentIndex + direction + scenarios.length) % scenarios.length);
  }

  return (
    <section className="scenarios-section section-pad" id="situations" aria-labelledby="scenarios-heading">
      <div className="container">
        <div className="section-rule-heading scenarios-heading">
          <p className="eyebrow" id="scenarios-heading">Real-world situations</p>
          <span className="rule" />
          <p className="micro-label">Different challenges. A clearer way forward.</p>
        </div>
        <div className="scenario-track" aria-live="polite">
          <article className="scenario-active">
            <Image src={current.image} alt="Landscape illustrating the scenario" fill sizes="(max-width: 900px) 100vw, 75vw" />
            <div className="scenario-topline">
              <span>{String(activeIndex + 1).padStart(2, "0")} / {String(scenarios.length).padStart(2, "0")}</span>
              <div className="carousel-controls">
                <button type="button" onClick={() => move(-1)} aria-label="Previous scenario"><ArrowLeft size={19} weight="light" /></button>
                <button type="button" onClick={() => move(1)} aria-label="Next scenario"><ArrowRight size={19} weight="light" /></button>
              </div>
            </div>
            <div className="scenario-content glass-panel">
              <p className="micro-label">Illustrative scenario</p>
              <h2>{current.title}</h2>
              <div className="scenario-columns">
                <div>
                  <h3 className="micro-label">The challenge</h3>
                  <p>{current.challenge}</p>
                  <h3 className="micro-label">How we would help</h3>
                  <p>{current.approach}</p>
                </div>
                <div>
                  <h3 className="micro-label">Key considerations</h3>
                  <ul>{current.considerations.map((item) => <li key={item}>{item}</li>)}</ul>
                  <p className="scenario-note">No outcome is guaranteed. This is an illustrative situation, not a client case study.</p>
                </div>
              </div>
            </div>
          </article>
          <button className="scenario-peek" type="button" onClick={() => move(1)} aria-label={`View next scenario: ${next.title}`}>
            <Image src={next.image} alt="" fill sizes="25vw" />
            <span className="scenario-peek-copy"><small>Next scenario</small><strong>{next.title}</strong><ArrowRight size={19} weight="light" /></span>
          </button>
        </div>
        <div className="carousel-progress" aria-hidden="true"><span style={{ transform: `translateX(${activeIndex * 100}%)` }} /></div>
      </div>
    </section>
  );
}
