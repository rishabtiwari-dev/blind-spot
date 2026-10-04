import { z } from "zod";
import type {
  Analysis,
  Assumption,
  BlindSpot,
  Conflict,
  DecisionInput,
  MissingEvidence,
  PriorityMismatch,
  ReflectionQuestion,
} from "@/types/analysis";

const field = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const decisionInputSchema: z.ZodType<DecisionInput> = z.preprocess(
  (raw: unknown) => {
    if (isRecord(raw)) {
      return {
        ...raw,
        priorities: raw.priorities ?? raw.factors ?? "",
        concerns: raw.concerns ?? raw.constraints ?? "",
      };
    }
    return raw;
  },
  z.object({
    decision: field("Decision", 5, 300),
    context: field("Context", 10, 3000),
    reasons: field("Reasons", 10, 3000),
    priorities: field("Priorities", 3, 2000),
    concerns: field("Concerns", 3, 2000),
  }),
);

const text = z.string().trim().min(1);

const severitySchema = z
  .string()
  .trim()
  .transform((s) => s.toLowerCase())
  .pipe(z.enum(["low", "medium", "high"]));

export const blindSpotSchema: z.ZodType<BlindSpot> = z.object({
  title: text,
  description: text,
  whyItMatters: text,
  severity: severitySchema,
  evidence: text,
});

export const assumptionSchema: z.ZodType<Assumption> = z.object({
  title: text,
  description: text,
  challenge: text,
  evidence: text,
});

export const conflictSchema: z.ZodType<Conflict> = z.object({
  title: text,
  description: text,
  tension: text,
  evidence: text,
});

export const missingEvidenceSchema: z.ZodType<MissingEvidence> = z.object({
  title: text,
  description: text,
  whyItMatters: text,
  evidence: text,
});

export const priorityMismatchSchema: z.ZodType<PriorityMismatch> = z.object({
  title: text,
  description: text,
  statedPriority: text,
  reasoningPattern: text,
});

export const questionSchema: z.ZodType<ReflectionQuestion> = z.object({
  question: text,
  whyAsk: text,
});

/**
 * Strict: every category key must be present (an empty array is a valid
 * "nothing found"); a missing key is treated as malformed output, never filled in.
 */
export const analysisSchema: z.ZodType<Analysis> = z.object({
  blindSpots: z.array(blindSpotSchema),
  assumptions: z.array(assumptionSchema),
  conflicts: z.array(conflictSchema),
  missingEvidence: z.array(missingEvidenceSchema),
  priorityMismatches: z.array(priorityMismatchSchema),
  questions: z.array(questionSchema),
});

function isDecisionInputField(key: unknown): key is keyof DecisionInput {
  return (
    key === "decision" ||
    key === "context" ||
    key === "reasons" ||
    key === "priorities" ||
    key === "concerns"
  );
}

/** Flatten zod issues into a per-field message map. */
export function toFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof DecisionInput, string>> {
  const out: Partial<Record<keyof DecisionInput, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (isDecisionInputField(field) && !out[field]) {
      out[field] = issue.message;
    }
  }
  return out;
}
