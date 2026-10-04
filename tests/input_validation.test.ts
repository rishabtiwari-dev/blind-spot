import { test } from "node:test";
import assert from "node:assert/strict";
import { decisionInputSchema, toFieldErrors } from "../src/lib/validation";

const VALID_INPUT = {
  decision: "Should I accept a 6-month AI internship?",
  context: "₹40,000 stipend, 45 minutes from home, 9-6 working hours, AI role, starts next month.",
  reasons: "Good stipend, close to home, industry experience in a high-demand field.",
  priorities: "Career growth, deep learning, maintaining college academic standing.",
  concerns: "Worried about balancing college attendance and semester exams.",
};

test("Input Validation: accepts valid complete input", () => {
  const result = decisionInputSchema.safeParse(VALID_INPUT);
  assert.equal(result.success, true);
});

test("Input Validation: rejects missing required field", () => {
  const fields = ["decision", "context", "reasons", "priorities", "concerns"] as const;

  for (const field of fields) {
    const invalid = { ...VALID_INPUT, [field]: "" };
    const result = decisionInputSchema.safeParse(invalid);
    assert.equal(result.success, false, `Expected ${field} to fail when empty`);

    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      assert.ok(fieldErrors[field], `Expected error message for field ${field}`);
    }
  }
});

test("Input Validation: rejects fields below minimum character length", () => {
  const shortInputs = [
    { ...VALID_INPUT, decision: "Abc" }, // Min 5
    { ...VALID_INPUT, context: "Too short" }, // Min 10
    { ...VALID_INPUT, reasons: "Short" }, // Min 10
    { ...VALID_INPUT, priorities: "No" }, // Min 3
    { ...VALID_INPUT, concerns: "No" }, // Min 3
  ];

  for (const input of shortInputs) {
    const result = decisionInputSchema.safeParse(input);
    assert.equal(result.success, false);
  }
});

test("Input Validation: rejects excessive field length", () => {
  const longDecision = { ...VALID_INPUT, decision: "A".repeat(301) }; // Max 300
  const longContext = { ...VALID_INPUT, context: "A".repeat(3001) }; // Max 3000
  const longReasons = { ...VALID_INPUT, reasons: "A".repeat(3001) }; // Max 3000
  const longPriorities = { ...VALID_INPUT, priorities: "A".repeat(2001) }; // Max 2000
  const longConcerns = { ...VALID_INPUT, concerns: "A".repeat(2001) }; // Max 2000

  assert.equal(decisionInputSchema.safeParse(longDecision).success, false);
  assert.equal(decisionInputSchema.safeParse(longContext).success, false);
  assert.equal(decisionInputSchema.safeParse(longReasons).success, false);
  assert.equal(decisionInputSchema.safeParse(longPriorities).success, false);
  assert.equal(decisionInputSchema.safeParse(longConcerns).success, false);
});

test("Input Validation: accepts backward-compatible legacy factors and constraints", () => {
  const legacy = {
    decision: "Should I accept a 6-month AI internship?",
    context: "₹40,000 stipend, 45 minutes from home, 9-6 working hours.",
    reasons: "Good stipend, close to home, industry experience.",
    factors: "Career growth, learning, academics.",
    constraints: "Balancing college coursework.",
  };

  const result = decisionInputSchema.safeParse(legacy);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.priorities, legacy.factors);
    assert.equal(result.data.concerns, legacy.constraints);
  }
});

test("Input Validation: rejects malformed requests (non-object or null)", () => {
  assert.equal(decisionInputSchema.safeParse(null).success, false);
  assert.equal(decisionInputSchema.safeParse(undefined).success, false);
  assert.equal(decisionInputSchema.safeParse("not an object").success, false);
  assert.equal(decisionInputSchema.safeParse(12345).success, false);
  assert.equal(decisionInputSchema.safeParse([]).success, false);
});
