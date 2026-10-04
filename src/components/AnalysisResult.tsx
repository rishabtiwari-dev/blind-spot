import type { Analysis } from "@/types/analysis";

interface Props {
  decision: string;
  analysis: Analysis;
  onReset: () => void;
  onRefine: () => void;
}

interface SectionProps {
  id: string;
  badgeIcon: string;
  title: string;
  subtitle: string;
  count: number;
  emptyMessage?: string;
  children: React.ReactNode;
}

function ReportSection({
  id,
  badgeIcon,
  title,
  subtitle,
  count,
  emptyMessage,
  children,
}: SectionProps) {
  return (
    <section className="report-section" aria-labelledby={`${id}-heading`}>
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-icon" aria-hidden="true">
            {badgeIcon}
          </span>
          <h2 id={`${id}-heading`} className="section-title">
            {title}
          </h2>
          <span className="section-count" aria-label={`${count} items`}>
            {count}
          </span>
        </div>
        <p className="section-subtitle">{subtitle}</p>
      </div>
      <div className="section-content">
        {count === 0 ? (
          <div className="section-empty-state" role="status">
            <span className="empty-check" aria-hidden="true">✓</span>
            <div className="empty-state-content">
              <span className="empty-state-title">No issues flagged in this dimension</span>
              <p className="empty-state-text">
                {emptyMessage || "No significant issues identified in this dimension based on your stated reasoning."}
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function AnalysisResult({ decision, analysis, onReset, onRefine }: Props) {
  const {
    blindSpots,
    assumptions,
    conflicts,
    missingEvidence,
    priorityMismatches,
    questions,
  } = analysis;

  const emptyCategories = [
    ["Blind spots", blindSpots],
    ["Assumptions", assumptions],
    ["Conflicts", conflicts],
    ["Missing evidence", missingEvidence],
    ["Priority mismatches", priorityMismatches],
    ["Questions", questions],
  ]
    .filter(([, items]) => (items as unknown[]).length === 0)
    .map(([label]) => label as string);
  const nothingFound = emptyCategories.length === 6;

  return (
    <div className="report-container">
      {/* 5. RESULT HEADER */}
      <header className="report-header">
        <div className="report-header-badge">Analysis Complete</div>
        <h1 className="report-title">Your Blind Spot Report</h1>
        <p className="report-subtitle">
          This isn’t a verdict. It’s a map of what may deserve a second look.
        </p>

        {decision && (
          <div className="decision-recap-card" aria-label="Analyzed decision">
            <span className="recap-label">Decision Analyzed</span>
            <p className="recap-text">“{decision}”</p>
          </div>
        )}

        {nothingFound ? (
          <p className="empty-note">
            No significant gaps were identified in the reasoning you provided. That is an
            observation about your written reasoning, not an endorsement of the decision.
          </p>
        ) : (
          emptyCategories.length > 0 && (
            <p className="empty-note">
              Nothing notable found for: {emptyCategories.join(", ")}.
            </p>
          )
        )}
      </header>

      {/* 4. THE SIX REASONING DIMENSIONS */}
      <div className="report-body">
        {/* A. BLIND SPOTS */}
        <ReportSection
          id="blind-spots"
          badgeIcon="🔴"
          title="Blind Spots"
          subtitle="What may be missing from your reasoning"
          count={blindSpots.length}
          emptyMessage="No critical unconsidered factors or overlooked constraints detected in your stated reasoning."
        >
          <ul className="cards-list">
            {blindSpots.map((item, i) => (
              <li
                key={i}
                className={`finding-card ${item.severity === "high" ? "severity-high" : `severity-${item.severity}`}`}
              >
                <div className="card-topbar">
                  <h3 className="card-heading">{item.title}</h3>
                  <span
                    className={`severity-badge ${item.severity}`}
                    title={`Significance to reasoning: ${item.severity}`}
                    aria-label={`Significance to reasoning: ${item.severity}`}
                  >
                    {item.severity} severity
                  </span>
                </div>
                <p className="card-description">{item.description}</p>
                <div className="card-metadata">
                  <div className="meta-block">
                    <span className="meta-label">Why it matters:</span>
                    <span className="meta-value">{item.whyItMatters}</span>
                  </div>
                  <div className="meta-block meta-evidence">
                    <span className="meta-label">Reference:</span>
                    <span className="meta-value">{item.evidence}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>

        {/* B. ASSUMPTIONS */}
        <ReportSection
          id="assumptions"
          badgeIcon="🧠"
          title="Hidden Assumptions"
          subtitle="What your reasoning appears to take for granted"
          count={assumptions.length}
          emptyMessage="No ungrounded or speculative assumptions identified in your arguments."
        >
          <ul className="cards-list">
            {assumptions.map((item, i) => (
              <li key={i} className="finding-card">
                <h3 className="card-heading">{item.title}</h3>
                <p className="card-description">{item.description}</p>
                <div className="card-metadata">
                  <div className="meta-block">
                    <span className="meta-label">Challenge to consider:</span>
                    <span className="meta-value">{item.challenge}</span>
                  </div>
                  <div className="meta-block meta-evidence">
                    <span className="meta-label">Based on:</span>
                    <span className="meta-value">{item.evidence}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>

        {/* C. CONFLICTS */}
        <ReportSection
          id="conflicts"
          badgeIcon="⚔️"
          title="Reasoning Conflicts"
          subtitle="Where parts of your reasoning may pull in different directions"
          count={conflicts.length}
          emptyMessage="No direct contradictions detected between your stated goals, reasons, and concerns."
        >
          <ul className="cards-list">
            {conflicts.map((item, i) => (
              <li key={i} className="finding-card">
                <h3 className="card-heading">{item.title}</h3>
                <p className="card-description">{item.description}</p>
                <div className="card-metadata">
                  <div className="meta-block">
                    <span className="meta-label">Tension:</span>
                    <span className="meta-value">{item.tension}</span>
                  </div>
                  <div className="meta-block meta-evidence">
                    <span className="meta-label">Contrasting points:</span>
                    <span className="meta-value">{item.evidence}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>

        {/* D. MISSING EVIDENCE */}
        <ReportSection
          id="missing-evidence"
          badgeIcon="🔎"
          title="Missing Evidence"
          subtitle="What information could change how you understand the decision"
          count={missingEvidence.length}
          emptyMessage="No critical unverified claims or informational gaps identified for your evaluation."
        >
          <ul className="cards-list">
            {missingEvidence.map((item, i) => (
              <li key={i} className="finding-card">
                <h3 className="card-heading">{item.title}</h3>
                <p className="card-description">{item.description}</p>
                <div className="card-metadata">
                  <div className="meta-block">
                    <span className="meta-label">Why this is needed:</span>
                    <span className="meta-value">{item.whyItMatters}</span>
                  </div>
                  <div className="meta-block meta-evidence">
                    <span className="meta-label">Unverified topic:</span>
                    <span className="meta-value">{item.evidence}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>

        {/* E. PRIORITY MISMATCHES */}
        <ReportSection
          id="priority-mismatches"
          badgeIcon="🎯"
          title="Priority Mismatches"
          subtitle="Where your stated priorities may differ from what your reasoning emphasizes"
          count={priorityMismatches.length}
          emptyMessage="Your stated priorities align consistently with the arguments you emphasized."
        >
          <ul className="cards-list">
            {priorityMismatches.map((item, i) => (
              <li key={i} className="finding-card">
                <h3 className="card-heading">{item.title}</h3>
                <p className="card-description">{item.description}</p>
                <div className="card-metadata">
                  <div className="meta-block">
                    <span className="meta-label">Stated priority:</span>
                    <span className="meta-value">{item.statedPriority}</span>
                  </div>
                  <div className="meta-block">
                    <span className="meta-label">Actual reasoning focus:</span>
                    <span className="meta-value">{item.reasoningPattern}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>

        {/* F. QUESTIONS TO EXPLORE */}
        <ReportSection
          id="questions"
          badgeIcon="❓"
          title="Questions to Explore"
          subtitle="What could you investigate before deciding"
          count={questions.length}
          emptyMessage="No additional exploration questions surfaced beyond your stated points."
        >
          <ul className="cards-list questions-list">
            {questions.map((item, i) => (
              <li key={i} className="finding-card question-card">
                <h3 className="question-heading">“{item.question}”</h3>
                <div className="card-metadata">
                  <div className="meta-block">
                    <span className="meta-label">Why investigate this:</span>
                    <span className="meta-value">{item.whyAsk}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>
      </div>

      {/* 6. USER AGENCY CALLOUT */}
      <footer className="report-footer">
        <div className="agency-card">
          <div className="agency-icon" aria-hidden="true">
            🧭
          </div>
          <div className="agency-text">
            <h3 className="agency-title">The decision is still yours.</h3>
            <p className="agency-description">
              We surface possibilities worth examining. You decide what matters.
            </p>
          </div>
        </div>

        {/* 7. RESET / NEW DECISION ACTIONS */}
        <div className="report-actions">
          <button type="button" className="btn-secondary" onClick={onRefine}>
            Refine this reasoning
          </button>
          <button type="button" className="btn-primary" onClick={onReset}>
            Analyze another decision
          </button>
        </div>
      </footer>
    </div>
  );
}
