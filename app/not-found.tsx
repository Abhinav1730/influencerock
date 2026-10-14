import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page-hero container">
      <h1>A different direction.</h1>
      <p>This page could not be found.</p>
      <Link href="/" className="button primary">
        Return to the firm
      </Link>
    </section>
  );
}
