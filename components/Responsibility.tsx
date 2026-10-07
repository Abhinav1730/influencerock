"use client";

import { FileText, LockKey, Scales, ShieldCheck } from "@phosphor-icons/react";

const commitments = [
  { title: "Lawful and ethical", body: "We operate within applicable laws and with integrity.", icon: Scales },
  { title: "No improper payments", body: "We do not make or facilitate improper payments.", icon: ShieldCheck },
  { title: "No guaranteed outcomes", body: "We provide strategic guidance, not promises of decisions.", icon: FileText },
  { title: "Your confidentiality", body: "Sensitive information is handled with discretion.", icon: LockKey },
];

export function Responsibility() {
  return (
    <section className="responsibility-section" id="responsibility" aria-labelledby="responsibility-heading">
      <div className="container responsibility-grid">
        <div className="responsibility-title">
          <p className="eyebrow">Our commitment</p>
          <h2 id="responsibility-heading">Responsible engagement.<br />Lasting trust.</h2>
        </div>
        {commitments.map(({ title, body, icon: Icon }) => (
          <div className="commitment" key={title}>
            <Icon size={29} weight="light" aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
