import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isDynamicServerError } from "@/lib/auth";
import { OpenRouterAdapter } from "@/lib/ai/openrouter";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
  } catch (authErr: any) {
    if (isDynamicServerError(authErr)) {
      throw authErr;
    }
    const isForbidden = authErr?.message === "FORBIDDEN";
    return NextResponse.json(
      { error: isForbidden ? "Forbidden" : "Unauthorized" },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const provider = (req.nextUrl.searchParams.get("provider") || "OPENROUTER").toUpperCase();

    if (provider === "OPENROUTER") {
      const liveModels = await OpenRouterAdapter.getAvailableModels();
      // Filter out free and notable open-source models
      const freeModels = liveModels.filter((m) => m.isFree);
      const notable = liveModels.filter(
        (m) =>
          !m.isFree &&
          (m.id.includes("llama-3.3") ||
            m.id.includes("deepseek") ||
            m.id.includes("mistral") ||
            m.id.includes("qwen") ||
            m.id.includes("gemini"))
      ).slice(0, 15);

      return NextResponse.json({
        provider: "OPENROUTER",
        defaultModel: "openrouter/free",
        freeModels: freeModels.map((m) => ({ id: m.id, name: m.name, isFree: true })),
        notableModels: notable.map((m) => ({ id: m.id, name: m.name, isFree: false })),
        totalAvailable: liveModels.length,
      });
    }

    if (provider === "MISTRAL") {
      return NextResponse.json({
        provider: "MISTRAL",
        defaultModel: "mistral-large-latest",
        models: [
          { id: "mistral-large-latest", name: "Mistral Large (Flagship Reasoning)", tier: "Paid/Enterprise" },
          { id: "mistral-small-latest", name: "Mistral Small (Cost-Effective Workhorse)", tier: "General" },
          { id: "open-mistral-7b", name: "Open-Mistral 7B (Lightweight Open)", tier: "Free/Open" },
          { id: "codestral-latest", name: "Codestral (Specialized Coding)", tier: "Code" },
          { id: "mistral-embed", name: "Mistral Embed (Embeddings)", tier: "Embeddings" },
        ],
      });
    }

    if (provider === "GROQ") {
      return NextResponse.json({
        provider: "GROQ",
        defaultModel: "llama-3.3-70b-versatile",
        models: [
          { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile (Primary Engine)" },
          { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (Ultra-fast)" },
          { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (MoE Architecture)" },
          { id: "gemma2-9b-it", name: "Gemma 2 9B Instruct" },
        ],
      });
    }

    if (provider === "GEMINI") {
      return NextResponse.json({
        provider: "GEMINI",
        defaultModel: "gemini-1.5-flash",
        models: [
          { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast & Grounded)" },
          { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Context)" },
          { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Experimental" },
        ],
      });
    }

    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  } catch (err: any) {
    if (isDynamicServerError(err)) {
      throw err;
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
