"use client";
import { useRef } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { Icon } from "./Icon";
export function ProfileCard({
  profile: p,
  compact = false,
}: {
  profile: Profile;
  compact?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = () => dialog.current?.showModal();
  const imageAlt = (p.portraitSource === "initials" ? "Initials avatar for " : "Professional portrait of ") + p.name;
  return (
    <>
      <article className={"profile-card" + (compact ? " compact" : "")}>
        <button
          className="profile-open image-button"
          onClick={open}
          aria-label={"View " + p.name + " profile"}
        >
          <img
            src={p.image}
            alt={imageAlt}
            loading="lazy"
            width="640"
            height="760"
          />
          <span className="portrait-region">{p.representation === "human" ? "Human delegate" : p.region}</span>
        </button>
        <div className="profile-body">
          <span className="profile-country">{p.country}</span>
          <h3>
            <button className="profile-open" onClick={open}>
              {p.name}
            </button>
          </h3>
          <p className="profile-role">{p.title}</p>
          <div className="profile-location">
            <Icon name="pin" size={14} />
            {p.city}
          </div>
          <div className="profile-bottom">
            <span>{p.expertise}</span>
            <button
              className="profile-open"
              onClick={open}
              aria-label={"View " + p.name}
            >
              View profile
            </button>
          </div>
        </div>
      </article>
      <dialog
        ref={dialog}
        className="profile-dialog"
        aria-labelledby={"profile-title-" + p.id}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              e.currentTarget.close();
          }
        }}
      >
        <button
          className="dialog-close"
          aria-label="Close profile"
          onClick={() => dialog.current?.close()}
        >
          <Icon name="close" />
        </button>
        <div className="profile-detail-image">
          <img
            src={p.image}
            alt={imageAlt}
            width="640"
            height="760"
            loading="lazy"
          />
        </div>
        <div className="profile-detail-copy">
          <div className="eyebrow">
            <span />
            {p.region.toUpperCase()}
          </div>
          <h2 id={"profile-title-" + p.id}>{p.name}</h2>
          <p className="detail-role">{p.title}</p>
          <div className="detail-location">
            <Icon name="pin" size={16} />
            {p.city}, {p.country}
          </div>
          <p>{p.bio}</p>
          <dl>
            <div>
              <dt>Specialization</dt>
              <dd>{p.expertise}</dd>
            </div>
            <div>
              <dt>Sector focus</dt>
              <dd>{p.industry}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{p.languages.join(" · ")}</dd>
            </div>
          </dl>
          <div className="profile-detail-actions">
            <Link className="button primary" href={"/schedule?delegate=" + p.id} onClick={() => dialog.current?.close()}>
              Schedule a SmartMeet
            </Link>
            <Link
              className="button primary"
              href={"/contact?profile=" + p.id}
              onClick={() => dialog.current?.close()}
            >
              Contact this profile
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
