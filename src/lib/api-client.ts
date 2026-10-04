import type { AnalyzeResponse, DecisionInput } from "@/types/analysis";

/** Browser-side call to the analyze endpoint. Never throws; returns a typed result. */
export async function requestAnalysis(input: DecisionInput): Promise<AnalyzeResponse> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return (await res.json()) as AnalyzeResponse;
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Network error. Check your connection and try again." },
    };
  }
}
