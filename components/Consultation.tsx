"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { ArrowRight, LockKey, PencilSimple } from "@phosphor-icons/react";

type Overview = {
  name: string;
  organization: string;
  email: string;
  jurisdictions: string;
  summary: string;
  timeframe: string;
};

export function Consultation() {
  const [overview, setOverview] = useState<Overview | null>(null);

  function prepareOverview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    setOverview({
      name: String(data.get("name") ?? ""),
      organization: String(data.get("organization") ?? ""),
      email: String(data.get("email") ?? ""),
      jurisdictions: String(data.get("jurisdictions") ?? ""),
      summary: String(data.get("summary") ?? ""),
      timeframe: String(data.get("timeframe") ?? ""),
    });
  }

  return (
    <section className="consultation-section" id="consultation" aria-labelledby="consultation-heading">
      <Image src="/images/consultation-lake.png" alt="" fill sizes="100vw" className="consultation-image" />
      <div className="consultation-fade" aria-hidden="true" />
      <div className="container consultation-grid">
        <div className="consultation-copy">
          <p className="eyebrow">Confidential consultation</p>
          <h2 id="consultation-heading">Begin the conversation.</h2>
          <p>Share a few details about your objective. We will review whether our expertise and network are the right fit.</p>
          <div className="mandate-note">
            <span>Selected mandates only</span>
            <span>Minimum mandate generally CHF 1 million</span>
          </div>
          <p className="privacy-note"><LockKey size={18} weight="light" aria-hidden="true" /> Your information stays on this device in this design preview.</p>
        </div>
        <div className="consultation-form-panel glass-panel">
          {overview ? (
            <div className="overview-prepared" aria-live="polite">
              <p className="eyebrow">Overview prepared</p>
              <h3>Ready for a confidential review.</h3>
              <p>The details below are shown only in your browser. Submission handling can be connected before launch.</p>
              <dl>
                <div><dt>From</dt><dd>{overview.name} · {overview.organization}</dd></div>
                <div><dt>Email</dt><dd>{overview.email}</dd></div>
                <div><dt>Jurisdictions</dt><dd>{overview.jurisdictions}</dd></div>
                <div><dt>Timeframe</dt><dd>{overview.timeframe}</dd></div>
                <div><dt>Objective</dt><dd>{overview.summary}</dd></div>
              </dl>
              <button className="button button-primary" type="button" onClick={() => setOverview(null)}>
                <PencilSimple size={17} /> Edit overview
              </button>
            </div>
          ) : (
            <form onSubmit={prepareOverview} className="consultation-form">
              <div className="form-row">
                <label>Name<input name="name" autoComplete="name" placeholder="Your name" required /></label>
                <label>Organization<input name="organization" autoComplete="organization" placeholder="Your organization" required /></label>
              </div>
              <div className="form-row">
                <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@organization.com" required /></label>
                <label>Relevant jurisdictions<input name="jurisdictions" placeholder="e.g. Brazil, EU, Southeast Asia" required /></label>
              </div>
              <label>Objective summary<textarea name="summary" rows={3} minLength={20} placeholder="Briefly describe your objective and key considerations" required /></label>
              <label>Required timeframe
                <select name="timeframe" defaultValue="" required>
                  <option value="" disabled>Select timeframe</option>
                  <option value="Immediate">Immediate</option>
                  <option value="Within 3 months">Within 3 months</option>
                  <option value="Within 6 months">Within 6 months</option>
                  <option value="Exploratory">Exploratory</option>
                </select>
              </label>
              <button className="button button-primary form-submit" type="submit">Prepare confidential overview <ArrowRight size={18} weight="light" /></button>
              <p className="form-preview-note">Design preview · No information is transmitted</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
