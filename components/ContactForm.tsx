"use client";
import { useRef, useState, type FormEvent } from "react";
import type {
  Profile,
  ConsultationInput,
  ConsultationResult,
} from "@/lib/types";
import { services } from "@/lib/content";
import { PolicyButton } from "./Policies";
export function ContactForm({
  profile,
  expertise = "",
}: {
  profile?: Profile;
  expertise?: string;
}) {
  const requestKey = useRef<{ payload: string; key: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const payload = {
      ...data,
      consent: data.consent === "on",
    } as unknown as ConsultationInput;
    const encoded = JSON.stringify(payload);
    if (requestKey.current?.payload !== encoded)
      requestKey.current = { payload: encoded, key: crypto.randomUUID() };
    setSaving(true);
    setError(false);
    setStatus("");
    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey.current.key,
        },
        body: encoded,
      });
      if (!response.ok) throw new Error("Could not save request");
      const result = (await response.json()) as ConsultationResult;
      setStatus(
        "Your proposal has been received. Your AI representative will prepare a response for the next hourly email delivery. Reference: " +
          result.id,
      );
      requestKey.current = null;
      form.reset();
    } catch {
      setError(true);
      setStatus(
        "We could not save your request. Please keep your details and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="contact-form-panel">
      <span className="eyebrow plain">CONFIDENTIAL CONSULTATION</span>
      <h2>Tell us about your objective.</h2>
      {profile ? (
        <div className="selected-contact">
          <img src={profile.image} alt="" width="44" height="44" />
          <div>
            <small>ENQUIRY FOR</small>
            <strong>{profile.name}</strong>
          </div>
        </div>
      ) : null}
      <form id="contact-form" onSubmit={submit}>
        <input type="hidden" name="profileId" value={profile?.id ?? ""} />
        <div className="form-row">
          <label>
            Full name <span>*</span>
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={120}
              placeholder="Your full name"
            />
          </label>
          <label>
            Work email <span>*</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@company.com"
            />
          </label>
        </div>
        <label>
          Organization <span>*</span>
          <input
            name="organization"
            autoComplete="organization"
            required
            maxLength={160}
            placeholder="Company or organization"
          />
        </label>
        <div className="form-row">
          <label>
            Jurisdiction(s) <span>*</span>
            <input
              name="jurisdictions"
              required
              maxLength={300}
              placeholder="Countries or regions"
            />
          </label>
          <label>
            Timeframe <span>*</span>
            <select name="timeframe" required defaultValue="">
              <option value="">Select a timeframe</option>
              {[
                "Within 1 month",
                "1–3 months",
                "3–6 months",
                "Long-term planning",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Area of interest
          <select name="expertise" defaultValue={expertise}>
            <option value="">Select a capability</option>
            {services.map((s) => (
              <option key={s.title}>{s.title}</option>
            ))}
          </select>
        </label>
        <label>
          Your objective <span>*</span>
          <textarea
            name="objective"
            required
            minLength={20}
            maxLength={5000}
            rows={4}
            placeholder="What would you like to accomplish? Please omit sensitive documents or credentials."
          />
        </label>
        <label className="consent">
          <input name="consent" type="checkbox" required />
          <span>
            I agree to the{" "}
            <PolicyButton kind="confidentiality">
              confidentiality notice
            </PolicyButton>{" "}
            and understand that submitting an enquiry does not establish an
            engagement.
          </span>
        </label>
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "Saving request…" : "Save consultation request"}
        </button>
        <p className="form-preview-note">
          Your proposal is saved securely. Your AI representative prepares a
          response for hourly email delivery. Your request remains saved if
          delivery is temporarily unavailable.
        </p>
        <div
          className={
            "form-status" + (status ? (error ? " error" : " success") : "")
          }
          role="status"
          aria-live="polite"
        >
          {status}
        </div>
      </form>
    </div>
  );
}
