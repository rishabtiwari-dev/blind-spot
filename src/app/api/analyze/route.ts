import { analyzeDecision } from "@/lib/ai/service";
import { handleAnalyzeRequest } from "@/lib/api-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAnalyzeRequest(request, analyzeDecision);
}
