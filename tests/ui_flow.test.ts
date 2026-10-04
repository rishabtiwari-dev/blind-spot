import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingIntro } from "../src/components/LandingIntro";
import { LoadingState } from "../src/components/LoadingState";
import { AnalysisResult } from "../src/components/AnalysisResult";
import { DecisionForm } from "../src/components/DecisionForm";
import type { Analysis } from "../src/types/analysis";

test("UI Flow: LandingIntro renders hero headline, principle, and CTA", () => {
  const html = renderToStaticMarkup(
    React.createElement(LandingIntro, { onStart: () => {} }),
  );

  assert.ok(html.includes("See what your decision might be missing"), "Missing hero headline");
  assert.ok(html.includes("We don’t make the decision for you"), "Missing core product principle");
  assert.ok(html.includes("Analyze my decision"), "Missing start CTA");
  assert.ok(html.includes("Blind Spots"), "Missing Blind Spots lens");
  assert.ok(html.includes("Hidden Assumptions"), "Missing Assumptions lens");
  assert.ok(html.includes("Reasoning Conflicts"), "Missing Conflicts lens");
});

test("UI Flow: LoadingState renders accessible status and echoes decision", () => {
  const decisionText = "Should I accept an AI role?";
  const html = renderToStaticMarkup(
    React.createElement(LoadingState, { decision: decisionText }),
  );

  assert.ok(html.includes("Examining your reasoning..."), "Missing loading title");
  assert.ok(html.includes('role="status"'), "Missing accessible status role");
  assert.ok(html.includes('aria-live="polite"'), "Missing polite aria-live");
  assert.ok(html.includes(decisionText), "Expected decision text to be echoed");
});

test("UI Flow: DecisionForm renders all 5 guided inputs with labels and submit CTA", () => {
  const html = renderToStaticMarkup(
    React.createElement(DecisionForm, {
      loading: false,
      serverError: null,
      onSubmit: () => {},
    }),
  );

  assert.ok(html.includes("What are you deciding?"), "Missing decision label");
  assert.ok(html.includes("What information or circumstances surround this decision?"), "Missing context label");
  assert.ok(html.includes("Why are you currently leaning this way?"), "Missing reasons label");
  assert.ok(html.includes("What matters most to you?"), "Missing priorities label");
  assert.ok(html.includes("What are you uncertain or worried about?"), "Missing concerns label");
  assert.ok(html.includes("Reveal My Blind Spots"), "Missing submit CTA");
});

test("UI Flow: DecisionForm displays server errors gracefully", () => {
  const serverError = {
    code: "AI_ERROR" as const,
    message: "The AI service is temporarily unavailable.",
  };

  const html = renderToStaticMarkup(
    React.createElement(DecisionForm, {
      loading: false,
      serverError,
      onSubmit: () => {},
    }),
  );

  assert.ok(html.includes("Unable to complete analysis"), "Missing error banner title");
  assert.ok(html.includes("The AI service is temporarily unavailable."), "Missing error message");
  assert.ok(html.includes('role="alert"'), "Missing alert role on error banner");
});

test("UI Flow: AnalysisResult renders complete 6-dimension report and agency footer", () => {
  const mockAnalysis: Analysis = {
    blindSpots: [
      {
        title: "Workload Clash",
        description: "9-6 hours leave no study time.",
        whyItMatters: "May harm academics.",
        severity: "high",
        evidence: "Context states 9-6.",
      },
    ],
    assumptions: [
      {
        title: "Role guarantees learning",
        description: "Assumes AI role provides learning without verification.",
        challenge: "What evidence confirms mentorship?",
        evidence: "Reasons cites AI role.",
      },
    ],
    conflicts: [
      {
        title: "Academics vs Hours",
        description: "Full-time work clashes with college.",
        tension: "Time pulls in opposite directions.",
        evidence: "Priorities lists academics.",
      },
    ],
    missingEvidence: [
      {
        title: "Exam leave policy",
        description: "Whether employer accommodates exams.",
        whyItMatters: "Essential for academic success.",
        evidence: "Concerns mentions exams.",
      },
    ],
    priorityMismatches: [
      {
        title: "Stipend over learning",
        description: "Reasons emphasize stipend while priority is learning.",
        statedPriority: "Learning",
        reasoningPattern: "Reasons focus on pay.",
      },
    ],
    questions: [
      {
        question: "Can hours be flexible during exams?",
        whyAsk: "Resolves academic balance concern.",
      },
    ],
  };

  const html = renderToStaticMarkup(
    React.createElement(AnalysisResult, {
      decision: "Accept AI internship?",
      analysis: mockAnalysis,
      onReset: () => {},
      onRefine: () => {},
    }),
  );

  assert.ok(html.includes("Your Blind Spot Report"), "Missing report title");
  assert.ok(html.includes("This isn’t a verdict. It’s a map of what may deserve a second look."), "Missing report subtitle");
  assert.ok(html.includes("Workload Clash"), "Missing blind spot title");
  assert.ok(html.includes("high severity"), "Missing severity label");
  assert.ok(html.includes("Role guarantees learning"), "Missing assumption");
  assert.ok(html.includes("Academics vs Hours"), "Missing conflict");
  assert.ok(html.includes("Exam leave policy"), "Missing missing evidence");
  assert.ok(html.includes("Stipend over learning"), "Missing priority mismatch");
  assert.ok(html.includes("Can hours be flexible during exams?"), "Missing question");
  assert.ok(html.includes("The decision is still yours."), "Missing user agency headline");
  assert.ok(html.includes("Refine this reasoning"), "Missing refine action");
  assert.ok(html.includes("Analyze another decision"), "Missing reset action");
});

test("UI Flow: AnalysisResult gracefully notes empty categories when reasoning is solid", () => {
  const emptyAnalysis: Analysis = {
    blindSpots: [],
    assumptions: [],
    conflicts: [],
    missingEvidence: [],
    priorityMismatches: [],
    questions: [],
  };

  const html = renderToStaticMarkup(
    React.createElement(AnalysisResult, {
      decision: "Thoroughly considered decision",
      analysis: emptyAnalysis,
      onReset: () => {},
      onRefine: () => {},
    }),
  );

  assert.ok(html.includes("No significant gaps were identified in the reasoning you provided."), "Missing empty note");
  assert.ok(html.includes("No issues flagged in this dimension"), "Expected intentional empty state heading in section");
  assert.ok(html.includes("No critical unconsidered factors or overlooked constraints detected"), "Expected intentional empty state message for blind spots");
});

test("UI Flow: DecisionForm renders sample scenario loader and error retry button", () => {
  const serverError = {
    code: "AI_ERROR" as const,
    message: "The model timed out.",
  };

  const html = renderToStaticMarkup(
    React.createElement(DecisionForm, {
      loading: false,
      serverError,
      onSubmit: () => {},
    }),
  );

  assert.ok(html.includes("Load sample scenario"), "Missing sample scenario button");
  assert.ok(html.includes("Try again"), "Missing retry button inside error banner");
});

