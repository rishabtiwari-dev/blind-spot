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

export const decisionInputSchema: z.ZodType<DecisionInput> = z.preprocess(
  (raw: unknown) => {
    if (raw && typeof raw === "object") {
      const rec = raw as Record<string, unknown>;
      return {
        ...rec,
        priorities: rec.priorities ?? rec.factors ?? "",
        concerns: rec.concerns ?? rec.constraints ?? "",
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

/** Flatten zod issues into a per-field message map. */
export function toFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof DecisionInput, string>> {
  const out: Partial<Record<keyof DecisionInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof DecisionInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
