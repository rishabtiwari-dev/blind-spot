import { test } from "node:test";
import assert from "node:assert/strict";
import { analysisSchema } from "../src/lib/validation";

const VALID_ANALYSIS = {
  blindSpots: [
    {
      title: "Schedule Conflict with Academic Obligations",
      description: "A 9-6 schedule plus commute takes 10+ hours daily, leaving minimal study time.",
      whyItMatters: "May result in attendance shortages or lower exam scores.",
      severity: "high",
      evidence: "Context states 9-6 working hours and 45 minutes from home.",
    },
  ],
  assumptions: [
    {
      title: "AI Role Guarantees Technical Mentorship",
      description: "Assumes the job title guarantees meaningful technical development.",
      challenge: "What evidence confirms dedicated senior engineering mentorship exists?",
      evidence: "User cites AI role as a primary reason without describing daily duties.",
    },
  ],
  conflicts: [
    {
      title: "Academic Priority vs. Full-Time Hours",
      description: "Academics is named as a top priority yet full-time hours occupy the school day.",
      tension: "Full-time work hours directly conflict with class attendance.",
      evidence: "Priorities lists academics while context specifies 9-6 working hours.",
    },
  ],
  missingEvidence: [
    {
      title: "Exam Flexibility Policy",
      description: "Whether the employer allows study leave during university exam weeks.",
      whyItMatters: "Determines whether academic performance can be safeguarded.",
      evidence: "Concerns mentions balancing college.",
    },
  ],
  priorityMismatches: [
    {
      title: "Financial Focus vs. Learning Priority",
      description: "Stated priority emphasizes learning, but reasons emphasize stipend.",
      statedPriority: "Learning and career growth",
      reasoningPattern: "First stated reason is ₹40,000 stipend and proximity.",
    },
  ],
  questions: [
    {
      question: "Does the startup offer formal leave or reduced hours during semester exams?",
      whyAsk: "Directly tests whether the academic concern can be accommodated by company policy.",
    },
  ],
};

test("Output Validation: accepts valid complete structured analysis", () => {
  const result = analysisSchema.safeParse(VALID_ANALYSIS);
  assert.equal(result.success, true);
});

test("Output Validation: accepts valid empty categories (nothing found)", () => {
  const emptyAnalysis = {
    blindSpots: [],
    assumptions: [],
    conflicts: [],
    missingEvidence: [],
    priorityMismatches: [],
    questions: [],
  };

  const result = analysisSchema.safeParse(emptyAnalysis);
  assert.equal(result.success, true);
});

test("Output Validation: rejects missing category key", () => {
  const missingConflicts = { ...VALID_ANALYSIS };
  // @ts-expect-error test omission
  delete missingConflicts.conflicts;

  const result = analysisSchema.safeParse(missingConflicts);
  assert.equal(result.success, false, "Expected failure when a category key is absent");
});

test("Output Validation: normalizes uppercase and mixed-case severity", () => {
  const variations = ["HIGH", "High", "MEDIUM", "Medium", "LOW", "Low"];

  for (const s of variations) {
    const analysis = {
      ...VALID_ANALYSIS,
      blindSpots: [{ ...VALID_ANALYSIS.blindSpots[0], severity: s }],
    };
    const result = analysisSchema.safeParse(analysis);
    assert.equal(result.success, true, `Expected ${s} to be accepted and normalized`);
    if (result.success) {
      assert.equal(
        result.data.blindSpots[0]?.severity,
        s.toLowerCase(),
        `Expected ${s} to normalize to ${s.toLowerCase()}`,
      );
    }
  }
});

test("Output Validation: rejects invalid severity value", () => {
  const invalidSeverity = {
    ...VALID_ANALYSIS,
    blindSpots: [{ ...VALID_ANALYSIS.blindSpots[0], severity: "critical" }],
  };

  const result = analysisSchema.safeParse(invalidSeverity);
  assert.equal(result.success, false);
});

test("Output Validation: rejects malformed item missing required string fields", () => {
  const missingWhyItMatters = {
    ...VALID_ANALYSIS,
    blindSpots: [
      {
        title: "Title only",
        description: "Desc",
        // missing whyItMatters
        severity: "high",
        evidence: "Ev",
      },
    ],
  };

  assert.equal(analysisSchema.safeParse(missingWhyItMatters).success, false);

  const emptyStringField = {
    ...VALID_ANALYSIS,
    blindSpots: [
      {
        title: "   ", // whitespace only
        description: "Desc",
        whyItMatters: "Why",
        severity: "high",
        evidence: "Ev",
      },
    ],
  };

  assert.equal(analysisSchema.safeParse(emptyStringField).success, false);
});
