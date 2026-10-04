interface Props {
  onStart: () => void;
}

export function LandingIntro({ onStart }: Props) {
  return (
    <section className="landing" aria-labelledby="hero-title">
      <div className="hero-badge" aria-hidden="true">
        Reasoning Reflection Tool
      </div>
      <h1 id="hero-title" className="hero-title">
        See what your decision might be missing.
      </h1>
      <p className="hero-subtitle">
        When evaluating an important choice, we often focus on what’s visible while overlooking
        unstated assumptions, internal tensions, and critical missing evidence.
      </p>

      <div className="principle-banner" role="note">
        <span className="principle-icon" aria-hidden="true">⚖️</span>
        <div className="principle-content">
          <strong>We don’t make the decision for you.</strong>
          <p>No verdicts, no scores, and no unsolicited advice. We challenge your thinking so you can decide with clarity.</p>
        </div>
      </div>

      <div className="hero-actions hero-actions-top">
        <button type="button" className="btn-primary btn-cta-main" onClick={onStart}>
          Analyze my decision →
        </button>
        <span className="cta-note">Takes 2–3 minutes • No account required</span>
      </div>

      <div className="dimensions-section">
        <h2 className="dimensions-section-heading">How the analysis examines your reasoning</h2>
        <div className="dimensions-grid" aria-label="Analytical dimensions">
          <div className="dim-card">
            <span className="dim-icon" aria-hidden="true">🔴</span>
            <h3>Blind Spots</h3>
            <p>Overlooked factors that could fundamentally alter outcomes.</p>
          </div>
          <div className="dim-card">
            <span className="dim-icon" aria-hidden="true">🧠</span>
            <h3>Hidden Assumptions</h3>
            <p>Beliefs taken for granted rather than backed by evidence.</p>
          </div>
          <div className="dim-card">
            <span className="dim-icon" aria-hidden="true">⚔️</span>
            <h3>Reasoning Conflicts</h3>
            <p>Tensions where your goals, reasons, and constraints clash.</p>
          </div>
          <div className="dim-card">
            <span className="dim-icon" aria-hidden="true">🔎</span>
            <h3>Missing Evidence</h3>
            <p>Crucial facts or verification you lack before committing.</p>
          </div>
          <div className="dim-card">
            <span className="dim-icon" aria-hidden="true">🎯</span>
            <h3>Priority Mismatches</h3>
            <p>Gaps between your stated values and your actual arguments.</p>
          </div>
          <div className="dim-card">
            <span className="dim-icon" aria-hidden="true">❓</span>
            <h3>Reflection Questions</h3>
            <p>Actionable inquiries to investigate before making your move.</p>
          </div>
        </div>
      </div>

      <div className="hero-actions hero-actions-bottom">
        <button type="button" className="btn-primary" onClick={onStart}>
          Analyze my decision
        </button>
      </div>
    </section>
  );
}

