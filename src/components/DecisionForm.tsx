"use client";

import { useEffect, useState } from "react";
import type { ApiError, DecisionInput } from "@/types/analysis";
import { decisionInputSchema, toFieldErrors } from "@/lib/validation";

interface FieldConfig {
  name: keyof DecisionInput;
  label: string;
  hint: string;
  placeholder: string;
  rows: number;
  minLength: number;
}

const FIELDS: FieldConfig[] = [
  {
    name: "decision",
    label: "What are you deciding?",
    hint: "The specific decision or choice under consideration.",
    placeholder: "e.g., Should I accept a 6-month AI internship at an early-stage startup?",
    rows: 2,
    minLength: 5,
  },
  {
    name: "context",
    label: "What information or circumstances surround this decision?",
    hint: "Key background, timeline, terms, compensation, commute, or obligations.",
    placeholder: "e.g., ₹40,000 stipend, 45 minutes from home, 9-6 working hours, AI role, starts next month.",
    rows: 3,
    minLength: 10,
  },
  {
    name: "reasons",
    label: "Why are you currently leaning this way?",
    hint: "The main motivations, advantages, or arguments in favor.",
    placeholder: "e.g., Good stipend, close to home, industry experience in a high-demand field.",
    rows: 3,
    minLength: 10,
  },
  {
    name: "priorities",
    label: "What matters most to you?",
    hint: "Your primary goals, core values, or long-term priorities.",
    placeholder: "e.g., Career growth, practical learning, keeping up with college academics.",
    rows: 2,
    minLength: 3,
  },
  {
    name: "concerns",
    label: "What are you uncertain or worried about?",
    hint: "Known doubts, risks, friction points, or constraints.",
    placeholder: "e.g., Worried about balancing college attendance and upcoming exam preparation.",
    rows: 2,
    minLength: 3,
  },
];

const DEFAULT_EMPTY: DecisionInput = {
  decision: "",
  context: "",
  reasons: "",
  priorities: "",
  concerns: "",
};

interface Props {
  initialValues?: DecisionInput;
  loading: boolean;
  serverError: ApiError | null;
  onSubmit: (input: DecisionInput) => void;
  onBack?: () => void;
}

const SAMPLE_SCENARIO: DecisionInput = {
  decision: "Should I accept a 6-month AI internship at an early-stage startup?",
  context: "Stipend of ₹40,000/month, 45-minute commute each way, 9:00 AM to 6:00 PM on-site hours, starts next month.",
  reasons: "Strong stipend for an intern, manageable commute, direct practical experience in generative AI and LLM systems.",
  priorities: "Accelerating career growth in AI, gaining practical engineering skills, and keeping up academic standing in college.",
  concerns: "Balancing on-site work hours with mandatory 75% college attendance and upcoming semester exam preparation.",
};

export function DecisionForm({
  initialValues = DEFAULT_EMPTY,
  loading,
  serverError,
  onSubmit,
  onBack,
}: Props) {
  const [values, setValues] = useState<DecisionInput>(initialValues);
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof DecisionInput, string>>>({});
  const [clearedServerFields, setClearedServerFields] = useState<Partial<Record<keyof DecisionInput, boolean>>>({});

  // Sync if initial values change (e.g. from refine)
  useEffect(() => {
    setValues(initialValues);
    setClearedServerFields({});
  }, [initialValues]);

  // Reset cleared fields when a new serverError arrives
  useEffect(() => {
    setClearedServerFields({});
  }, [serverError]);

  const activeServerErrors = Object.fromEntries(
    Object.entries(serverError?.fieldErrors ?? {}).filter(
      ([key]) => !clearedServerFields[key as keyof DecisionInput],
    ),
  );

  const fieldErrors = { ...activeServerErrors, ...clientErrors };

  function handleLoadSample() {
    setValues(SAMPLE_SCENARIO);
    setClientErrors({});
    setClearedServerFields({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const parsed = decisionInputSchema.safeParse(values);
    if (!parsed.success) {
      setClientErrors(toFieldErrors(parsed.error));
      return;
    }
    setClientErrors({});
    onSubmit(parsed.data);
  }

  return (
    <div className="form-wrapper">
      <div className="form-header">
        <div className="form-header-nav">
          {onBack && (
            <button
              type="button"
              className="btn-text-back"
              onClick={onBack}
              aria-label="Back to overview"
            >
              ← Back to overview
            </button>
          )}
          <button
            type="button"
            className="btn-sample-load"
            onClick={handleLoadSample}
            disabled={loading}
            title="Pre-fill with a realistic internship scenario"
          >
            Load sample scenario
          </button>
        </div>
        <h2 className="form-title">Describe your decision</h2>
        <p className="form-subtitle">
          Provide your current thoughts as honestly as possible. All five fields are required
          so the analysis can evaluate your full reasoning chain.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="decision-form">
        {FIELDS.map((f) => {
          const errorMsg = fieldErrors[f.name];
          const errorId = `${f.name}-error`;
          const hintId = `${f.name}-hint`;

          return (
            <div key={f.name} className="form-field">
              <div className="label-row">
                <label htmlFor={f.name} className="field-label">
                  {f.label}
                </label>
                <span className="required-tag" aria-hidden="true">
                  Required
                </span>
              </div>
              <p id={hintId} className="field-hint">
                {f.hint}
              </p>
              <textarea
                id={f.name}
                rows={f.rows}
                value={values[f.name]}
                disabled={loading}
                placeholder={f.placeholder}
                aria-required="true"
                aria-invalid={Boolean(errorMsg)}
                aria-describedby={`${hintId}${errorMsg ? ` ${errorId}` : ""}`}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [f.name]: e.target.value }));
                  if (clientErrors[f.name]) {
                    setClientErrors((prev) => ({ ...prev, [f.name]: undefined }));
                  }
                  if (serverError?.fieldErrors?.[f.name]) {
                    setClearedServerFields((prev) => ({ ...prev, [f.name]: true }));
                  }
                }}
              />
              {errorMsg && (
                <p id={errorId} className="field-error-text" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>
          );
        })}

        {serverError && !serverError.fieldErrors && (
          <div className="server-error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <div className="error-body">
              <strong>Unable to complete analysis</strong>
              <p>{serverError.message}</p>
              <button
                type="button"
                className="btn-retry"
                onClick={() => onSubmit(values)}
                disabled={loading}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="form-footer">
          <button
            type="submit"
            className="btn-primary btn-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Examining your reasoning..." : "Reveal My Blind Spots"}
          </button>
          <span className="privacy-note">
            Your reasoning is processed in-memory and is never stored or persisted by this application.
          </span>
        </div>
      </form>
    </div>
  );
}
