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
const str = { type: "STRING" } as const;
const obj = (fields: Record<string, unknown>) => ({
  type: "OBJECT",
  properties: fields,
  required: Object.keys(fields),
  propertyOrdering: Object.keys(fields),
});
const arr = (items: unknown) => ({ type: "ARRAY", items });

const RESPONSE_SCHEMA = obj({
  blindSpots: arr(
    obj({
      title: str,
      description: str,
      whyItMatters: str,
      severity: { type: "STRING", enum: ["high", "medium", "low"] },
      evidence: str,
    }),
  ),
  assumptions: arr(obj({ title: str, description: str, challenge: str, evidence: str })),
  conflicts: arr(obj({ title: str, description: str, tension: str, evidence: str })),
  missingEvidence: arr(obj({ title: str, description: str, whyItMatters: str, evidence: str })),
  priorityMismatches: arr(
    obj({ title: str, description: str, statedPriority: str, reasoningPattern: str }),
  ),
  questions: arr(obj({ question: str, whyAsk: str })),
});

/** Outcome of one model attempt. `retryable` failures move on to the next model. */
type Attempt =
  | { ok: true; analysis: Analysis }
  | { ok: false; retryable: boolean; error: AppError };

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
    console.error(`[ai] ${model}: network/timeout`, err);
    return {
      ok: false,
      retryable: true,
      error: new AppError("AI_ERROR", "Could not reach the AI service. Please try again.", 502),
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(`[ai] ${model}: HTTP ${res.status} ${body.slice(0, 500)}`);
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

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  const candidate = data?.candidates?.[0];
  const raw = candidate?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!raw) {
    console.warn(`[ai] ${model}: empty output (finishReason=${candidate?.finishReason})`);
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
    console.warn(`[ai] ${model}: unparseable JSON (finishReason=${candidate?.finishReason})`);
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
    console.warn(`[ai] ${model}: schema validation failed`, result.error.issues.slice(0, 5));
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
