import "server-only";
import { AppError } from "@/lib/errors";
import { analysisSchema } from "@/lib/validation";
import type { Analysis, DecisionInput } from "@/types/analysis";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const DEFAULT_MODEL = "gemini-2.5-flash";
/** Tried in order after GEMINI_MODEL when a model is overloaded, retired, or returns unusable output. */
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro"];
const TIMEOUT_MS = 25_000;

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
}

// ---- Gemini structured-output schema (OpenAPI subset). Mirrors analysisSchema. ----
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    blindSpots: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          whyItMatters: { type: "STRING" },
          severity: { type: "STRING", enum: ["high", "medium", "low"] },
          evidence: { type: "STRING" },
        },
        required: ["title", "description", "whyItMatters", "severity", "evidence"],
        propertyOrdering: ["title", "description", "whyItMatters", "severity", "evidence"],
      },
    },
    assumptions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          challenge: { type: "STRING" },
          evidence: { type: "STRING" },
        },
        required: ["title", "description", "challenge", "evidence"],
        propertyOrdering: ["title", "description", "challenge", "evidence"],
      },
    },
    conflicts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          tension: { type: "STRING" },
          evidence: { type: "STRING" },
        },
        required: ["title", "description", "tension", "evidence"],
        propertyOrdering: ["title", "description", "tension", "evidence"],
      },
    },
    missingEvidence: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          whyItMatters: { type: "STRING" },
          evidence: { type: "STRING" },
        },
        required: ["title", "description", "whyItMatters", "evidence"],
        propertyOrdering: ["title", "description", "whyItMatters", "evidence"],
      },
    },
    priorityMismatches: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          statedPriority: { type: "STRING" },
          reasoningPattern: { type: "STRING" },
        },
        required: ["title", "description", "statedPriority", "reasoningPattern"],
        propertyOrdering: ["title", "description", "statedPriority", "reasoningPattern"],
      },
    },
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          whyAsk: { type: "STRING" },
        },
        required: ["question", "whyAsk"],
        propertyOrdering: ["question", "whyAsk"],
      },
    },
  },
  required: [
    "blindSpots",
    "assumptions",
    "conflicts",
    "missingEvidence",
    "priorityMismatches",
    "questions",
  ],
  propertyOrdering: [
    "blindSpots",
    "assumptions",
    "conflicts",
    "missingEvidence",
    "priorityMismatches",
    "questions",
  ],
} as const;

/** Outcome of one model attempt. `retryable` failures move on to the next model. */
type Attempt =
  | { ok: true; analysis: Analysis }
  | { ok: false; retryable: boolean; error: AppError };

function logWarn(msg: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(msg, ...args);
  }
}

function logError(msg: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(msg, ...args);
  }
}

async function attempt(model: string, apiKey: string, input: DecisionInput): Promise<Attempt> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    logError(`[ai] ${model}: network/timeout`, err);
    return {
      ok: false,
      retryable: true,
      error: new AppError("AI_ERROR", "Could not reach the AI service. Please try again.", 502),
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logWarn(`[ai] ${model}: HTTP ${res.status} ${body.slice(0, 500)}`);
    // 404 = model retired, 429 = rate limited, 5xx = overloaded/transient
    const retryable = res.status === 404 || res.status === 429 || res.status >= 500;
    return {
      ok: false,
      retryable,
      error: new AppError(
        "AI_ERROR",
        "The AI service is currently unavailable. Please try again in a moment.",
        502,
      ),
    };
  }

  const data: GeminiResponse | null = await res.json().catch(() => null);
  const candidate = data?.candidates?.[0];
  const raw = candidate?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!raw) {
    logWarn(`[ai] ${model}: empty output (finishReason=${candidate?.finishReason})`);
    return {
      ok: false,
      retryable: true,
      error: new AppError(
        "INVALID_AI_RESPONSE",
        "The AI did not return an analysis. Please try again.",
        502,
      ),
    };
  }

  const cleaned = raw.startsWith("```")
    ? raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    logWarn(`[ai] ${model}: unparseable JSON (finishReason=${candidate?.finishReason})`);
    return {
      ok: false,
      retryable: true,
      error: new AppError(
        "INVALID_AI_RESPONSE",
        "The AI returned an unreadable response. Please retry.",
        502,
      ),
    };
  }

  const result = analysisSchema.safeParse(parsed);
  if (!result.success) {
    logWarn(`[ai] ${model}: schema validation failed`, result.error.issues.slice(0, 5));
    return {
      ok: false,
      retryable: true,
      error: new AppError(
        "INVALID_AI_RESPONSE",
        "The AI response was incomplete or malformed. Please retry.",
        502,
      ),
    };
  }

  return { ok: true, analysis: result.data };
}

/**
 * Server-only. Calls Gemini and returns strictly validated, typed analysis.
 * Provider details are confined to this file.
 */
export async function analyzeDecision(input: DecisionInput): Promise<Analysis> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new AppError(
      "CONFIG_ERROR",
      "The AI service is not configured. Set GEMINI_API_KEY on the server.",
      500,
    );
  }

  const models = [process.env.GEMINI_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS].filter(
    (m, i, all) => all.indexOf(m) === i,
  );

  let lastError: AppError | null = null;
  for (const model of models) {
    const outcome = await attempt(model, apiKey, input);
    if (outcome.ok) return outcome.analysis;
    lastError = outcome.error;
    if (!outcome.retryable) break;
  }

  throw (
    lastError ??
    new AppError("AI_ERROR", "The AI service is currently unavailable. Please try again.", 502)
  );
}
