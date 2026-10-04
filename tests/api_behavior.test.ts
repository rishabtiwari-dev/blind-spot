import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handleAnalyzeRequest, type AnalyzerFn } from "../src/lib/api-handler";
import { AppError } from "../src/lib/errors";
import { rateLimiter } from "../src/lib/rate-limiter";
import type { Analysis } from "../src/types/analysis";

const MOCK_ANALYSIS: Analysis = {
  blindSpots: [],
  assumptions: [],
  conflicts: [],
  missingEvidence: [],
  priorityMismatches: [],
  questions: [],
};

const dummyAnalyzer: AnalyzerFn = async () => MOCK_ANALYSIS;

beforeEach(() => {
  rateLimiter.reset();
});

test("API Behavior: rejects invalid JSON body with 400 INVALID_INPUT", async () => {
  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json",
  });

  const res = await handleAnalyzeRequest(req, dummyAnalyzer);
  assert.equal(res.status, 400);

  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "INVALID_INPUT");
});

test("API Behavior: rejects oversized payload (>32KB) with 413", async () => {
  const hugePayload = JSON.stringify({
    decision: "A".repeat(40_000),
    context: "valid context",
    reasons: "valid reasons",
    priorities: "valid priorities",
    concerns: "valid concerns",
  });

  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(hugePayload.length),
    },
    body: hugePayload,
  });

  const res = await handleAnalyzeRequest(req, dummyAnalyzer);
  assert.equal(res.status, 413);

  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "INVALID_INPUT");
});

test("API Behavior: rejects incomplete fields with 400 and field errors", async () => {
  const incomplete = {
    decision: "Test", // too short (min 5)
    context: "",
    reasons: "",
    priorities: "",
    concerns: "",
  };

  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(incomplete),
  });

  const res = await handleAnalyzeRequest(req, dummyAnalyzer);
  assert.equal(res.status, 400);

  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "INVALID_INPUT");
  assert.ok(json.error.fieldErrors, "Expected fieldErrors map");
});

test("API Behavior: throttles rapid requests with 429 and Retry-After header", async () => {
  const body = JSON.stringify({
    decision: "Should I accept an internship?",
    context: "Details here with sufficient length.",
    reasons: "Reasons here with sufficient length.",
    priorities: "Learning.",
    concerns: "Balance.",
  });

  const clientIp = "192.0.2.1";

  // Fire 6 requests to exhaust limit
  for (let i = 0; i < 6; i++) {
    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp,
      },
      body,
    });
    await handleAnalyzeRequest(req, dummyAnalyzer);
  }

  // 7th request must be blocked with 429
  const blockedReq = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": clientIp,
    },
    body,
  });

  const res = await handleAnalyzeRequest(blockedReq, dummyAnalyzer);
  assert.equal(res.status, 429);
  assert.ok(res.headers.get("Retry-After"), "Expected Retry-After header");

  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "RATE_LIMITED");
});

test("API Behavior: handles missing API configuration gracefully (CONFIG_ERROR)", async () => {
  const configFailingAnalyzer: AnalyzerFn = async () => {
    throw new AppError("CONFIG_ERROR", "The AI service is not configured. Set GEMINI_API_KEY.", 500);
  };

  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Should I accept this offer?",
      context: "Full context describing the situation.",
      reasons: "Strong compensation and growth.",
      priorities: "Learning and career progression.",
      concerns: "Longer commute time.",
    }),
  });

  const res = await handleAnalyzeRequest(req, configFailingAnalyzer);
  assert.equal(res.status, 500);

  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "CONFIG_ERROR");
});

test("API Behavior: handles AI service failure gracefully (AI_ERROR -> 502)", async () => {
  const failingAnalyzer: AnalyzerFn = async () => {
    throw new AppError("AI_ERROR", "The AI service is currently unavailable.", 502);
  };

  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Should I accept this offer?",
      context: "Full context describing the situation.",
      reasons: "Strong compensation and growth.",
      priorities: "Learning and career progression.",
      concerns: "Longer commute time.",
    }),
  });

  const res = await handleAnalyzeRequest(req, failingAnalyzer);
  assert.equal(res.status, 502);

  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "AI_ERROR");
});

test("API Behavior: handles malformed AI output gracefully (INVALID_AI_RESPONSE -> 502)", async () => {
  const malformedAnalyzer: AnalyzerFn = async () => {
    throw new AppError("INVALID_AI_RESPONSE", "The AI returned an unreadable response.", 502);
  };

  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Should I accept this offer?",
      context: "Full context describing the situation.",
      reasons: "Strong compensation and growth.",
      priorities: "Learning and career progression.",
      concerns: "Longer commute time.",
    }),
  });

  const res = await handleAnalyzeRequest(req, malformedAnalyzer);
  assert.equal(res.status, 502);

  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "INVALID_AI_RESPONSE");
});

test("API Behavior: returns 200 and no-store headers on success", async () => {
  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Should I accept this offer?",
      context: "Full context describing the situation.",
      reasons: "Strong compensation and growth.",
      priorities: "Learning and career progression.",
      concerns: "Longer commute time.",
    }),
  });

  const res = await handleAnalyzeRequest(req, dummyAnalyzer);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");

  const json = await res.json();
  assert.equal(json.ok, true);
  assert.ok(json.analysis, "Expected analysis object");
});

test("API Behavior: AppError masks stack traces and produces clean wire errors", () => {
  const err = new AppError("INTERNAL_ERROR", "Internal system failure", 500);
  const wire = err.toApiError();

  assert.equal(wire.code, "INTERNAL_ERROR");
  assert.equal(wire.message, "Internal system failure");
  assert.equal((wire as unknown as Record<string, unknown>).stack, undefined);
});
