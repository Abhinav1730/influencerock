import Link from "next/link";
import { PolicyButton } from "@/components/Policies";
export function Footer() {
  return (
    <footer id="footer">
      <div className={"container"}>
        <div className={"footer-top"}>
          <Link href={"/"} className={"brand"}>
            <span className={"brand-mark"}>
              {"IR"}
              <span></span>
            </span>
            <span className={"brand-name"}>
              {"INFLUENCE ROCK"}
              <span>{"INTERNATIONAL RELATIONS"}</span>
            </span>
          </Link>
          <div className={"footer-nav"}>
            <Link href="/outreach">Press &amp; outreach</Link>
            <Link href={"/expertise"} className={""}>
              {"Expertise"}
            </Link>
            <Link href={"/network"} className={""}>
              {"Our people"}
            </Link>
            <Link href={"/contact"} className={""}>
              {"Contact"}
            </Link>
          </div>
        </div>
        <div className={"footer-bottom"}>
          <span>{"© 2026 Influence Rock. All rights reserved."}</span>
          <div>
            <PolicyButton kind={"confidentiality"}>
              {"Confidentiality"}
            </PolicyButton>
            <PolicyButton kind={"integrity"}>
              {"Integrity & Terms"}
            </PolicyButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
