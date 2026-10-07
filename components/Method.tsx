import { method } from "@/lib/content";

export function Method() {
  return (
    <section className="method-section section-pad" id="method" aria-labelledby="method-heading">
      <div className="container">
        <div className="section-rule-heading">
          <p className="eyebrow" id="method-heading">How a mandate moves</p>
          <span className="rule" />
          <p className="micro-label">A disciplined approach. A clearer path.</p>
        </div>
        <div className="method-steps">
          {method.map((step, index) => (
            <div className="method-step" key={step.title}>
              <div className="method-step-head"><span>{String(index + 1).padStart(2, "0")}</span><h3>{step.title}</h3></div>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
