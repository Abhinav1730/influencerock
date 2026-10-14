"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { notices } from "@/lib/content";
import { Icon } from "./Icon";
type Kind = keyof typeof notices;
const PolicyContext = createContext<(kind: Kind) => void>(() => {});
export function PolicyProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<Kind>("confidentiality");
  const notice = notices[kind];
  return (
    <PolicyContext.Provider
      value={(k) => {
        setKind(k);
        ref.current?.showModal();
      }}
    >
      {children}
      <dialog
        ref={ref}
        id="policy-dialog"
        aria-labelledby="policy-title"
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
          aria-label="Close notice"
          onClick={() => ref.current?.close()}
        >
          <Icon name="close" />
        </button>
        <div className="eyebrow">
          <span />
          INFLUENCE ROCK
        </div>
        <h2 id="policy-title">{notice.title}</h2>
        {notice.sections.map(([heading, text]) => (
          <section key={heading}>
            <h3>{heading}</h3>
            {heading === "Country data attribution" ? (
              <p>
                Country, capital, language and geographic data is adapted from{" "}
                <a
                  href="https://github.com/mledoze/countries"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  mledoze/countries
                </a>
                , available under the{" "}
                <a
                  href="https://opendatacommons.org/licenses/odbl/1-0/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Database License
                </a>
                . The adapted data and license are included in the website
                source repository.
              </p>
            ) : (
              <p>{text}</p>
            )}
          </section>
        ))}
      </dialog>
    </PolicyContext.Provider>
  );
}
export function PolicyButton({
  kind,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind: Kind }) {
  const open = useContext(PolicyContext);
  return (
    <button {...props} type="button" onClick={() => open(kind)}>
      {children}
    </button>
  );
}
