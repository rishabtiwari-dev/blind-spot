/** What the user submits for analysis. */
export interface DecisionInput {
  decision: string;
  context: string;
  reasons: string;
  priorities: string;
  concerns: string;
}

export type Severity = "low" | "medium" | "high";

export interface BlindSpot {
  title: string;
  description: string;
  whyItMatters: string;
  severity: Severity;
  evidence: string;
}

export interface Assumption {
  title: string;
  description: string;
  challenge: string;
  evidence: string;
}

export interface Conflict {
  title: string;
  description: string;
  tension: string;
  evidence: string;
}

export interface MissingEvidence {
  title: string;
  description: string;
  whyItMatters: string;
  evidence: string;
}

export interface PriorityMismatch {
  title: string;
  description: string;
  statedPriority: string;
  reasoningPattern: string;
}

export interface ReflectionQuestion {
  question: string;
  whyAsk: string;
}

/**
 * Structured reasoning reflection output.
 * Deliberately contains NO recommendation, verdict, or score.
 */
export interface Analysis {
  blindSpots: BlindSpot[];
  assumptions: Assumption[];
  conflicts: Conflict[];
  missingEvidence: MissingEvidence[];
  priorityMismatches: PriorityMismatch[];
  questions: ReflectionQuestion[];
}

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "CONFIG_ERROR"
  | "AI_ERROR"
  | "INVALID_AI_RESPONSE"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** Field-level validation messages, when code is INVALID_INPUT. */
  fieldErrors?: Partial<Record<keyof DecisionInput, string>>;
}

export type AnalyzeResponse =
  | { ok: true; analysis: Analysis }
  | { ok: false; error: ApiError };
