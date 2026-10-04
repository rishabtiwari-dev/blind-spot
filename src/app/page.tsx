"use client";

import { useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { DecisionForm } from "@/components/DecisionForm";
import { LandingIntro } from "@/components/LandingIntro";
import { LoadingState } from "@/components/LoadingState";
import { requestAnalysis } from "@/lib/api-client";
import type { Analysis, ApiError, DecisionInput } from "@/types/analysis";

type AppStep = "intro" | "input" | "loading" | "report";

const EMPTY_INPUT: DecisionInput = {
  decision: "",
  context: "",
  reasons: "",
  priorities: "",
  concerns: "",
};

export default function Home() {
  const [step, setStep] = useState<AppStep>("intro");
  const [values, setValues] = useState<DecisionInput>(EMPTY_INPUT);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleSubmit(input: DecisionInput) {
    setValues(input);
    setError(null);
    setStep("loading");

    const res = await requestAnalysis(input);

    if (res.ok) {
      setAnalysis(res.analysis);
      setError(null);
      setStep("report");
    } else {
      setError(res.error);
      // Return user to the form with their input fully preserved
      setStep("input");
    }
  }

  function handleReset() {
    setAnalysis(null);
    setError(null);
    setValues(EMPTY_INPUT);
    setStep("intro");
  }

  function handleRefine() {
    setError(null);
    setStep("input");
  }

  return (
    <div className="app-shell">
      {/* Top Navigation / Brand Bar */}
      <header className="brand-header">
        <div className="brand-container">
          <div
            className="brand-logo-group"
            onClick={step === "loading" || step === "report" ? undefined : () => setStep("intro")}
            role={step === "loading" || step === "report" ? undefined : "button"}
            tabIndex={step === "loading" || step === "report" ? undefined : 0}
            aria-label="The Blind Spot Home"
          >
            <span className="brand-glyph" aria-hidden="true">
              👁️‍🗨️
            </span>
            <div className="brand-titles">
              <span className="brand-name">The Blind Spot</span>
              <span className="brand-tagline">Reasoning Reflection Tool</span>
            </div>
          </div>
          <div className="header-meta">
            <span className="principle-pill">No verdicts • Your decision</span>
          </div>
        </div>
      </header>

      {/* Main Experience Flow */}
      <main className="main-content" id="main-content">
        {step === "intro" && (
          <LandingIntro onStart={() => setStep("input")} />
        )}

        {step === "input" && (
          <DecisionForm
            initialValues={values}
            loading={false}
            serverError={error}
            onSubmit={handleSubmit}
            onBack={() => setStep("intro")}
          />
        )}

        {step === "loading" && (
          <LoadingState decision={values.decision} />
        )}

        {step === "report" && analysis && (
          <AnalysisResult
            decision={values.decision}
            analysis={analysis}
            onReset={handleReset}
            onRefine={handleRefine}
          />
        )}
      </main>
    </div>
  );
}
