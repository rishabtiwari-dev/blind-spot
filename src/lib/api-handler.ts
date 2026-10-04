import { AppError } from "./errors";
import { rateLimiter } from "./rate-limiter";
import { decisionInputSchema, toFieldErrors } from "./validation";
import type { Analysis, AnalyzeResponse, DecisionInput } from "@/types/analysis";

const MAX_PAYLOAD_BYTES = 32_768; // 32KB max request size

function fail(error: AppError, headers?: Record<string, string>): Response {
  return Response.json(
    { ok: false, error: error.toApiError() } satisfies AnalyzeResponse,
    {
      status: error.status,
      headers: {
        "Cache-Control": "no-store",
        ...(headers ?? {}),
      },
    },
  );
}

function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export type AnalyzerFn = (input: DecisionInput) => Promise<Analysis>;

/**
 * Handles the /api/analyze request logic:
 * Rate limiting -> Payload limit -> JSON parse -> Input validation -> Analyzer invocation -> Response
 */
export async function handleAnalyzeRequest(
  request: Request,
  analyzer: AnalyzerFn,
): Promise<Response> {
  try {
    // 1. Abuse Protection & Rate Limiting
    const clientIp = extractClientIp(request);
    const rateCheck = rateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return fail(
        new AppError(
          "RATE_LIMITED",
          `Too many requests. Please wait ${rateCheck.resetSeconds}s before analyzing another decision.`,
          429,
        ),
        { "Retry-After": String(rateCheck.resetSeconds) },
      );
    }

    // 2. Payload size guard
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const parsedLength = Number.parseInt(contentLength, 10);
      if (Number.isFinite(parsedLength) && parsedLength > MAX_PAYLOAD_BYTES) {
        throw new AppError(
          "INVALID_INPUT",
          "Request payload exceeds maximum allowed size (32KB).",
          413,
        );
      }
    }

    const rawText = await request.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      throw new AppError(
        "INVALID_INPUT",
        "Request payload exceeds maximum allowed size (32KB).",
        413,
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      throw new AppError("INVALID_INPUT", "Request body must be valid JSON.", 400);
    }

    // 3. Strong validation
    const parsed = decisionInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        "INVALID_INPUT",
        "Please fix the highlighted fields.",
        400,
        toFieldErrors(parsed.error),
      );
    }

    // 4. Server-side AI analysis
    const analysis = await analyzer(parsed.data);
    return Response.json(
      { ok: true, analysis } satisfies AnalyzeResponse,
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    if (err instanceof AppError) return fail(err);
    if (process.env.NODE_ENV !== "production") {
      console.error("Unhandled error in analyze request:", err);
    }
    return fail(new AppError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500));
  }
}
