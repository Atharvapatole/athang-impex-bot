import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const businessWhere = businessId ? { businessId } : {};

    // Messages counts
    const incomingCount = await prisma.message.count({
      where: {
        senderType: "CUSTOMER",
        ...(businessId ? { conversation: { businessId } } : {}),
      },
    });

    const outgoingAiCount = await prisma.message.count({
      where: {
        senderType: "AI",
        ...(businessId ? { conversation: { businessId } } : {}),
      },
    });

    const outgoingAgentCount = await prisma.message.count({
      where: {
        senderType: "AGENT",
        ...(businessId ? { conversation: { businessId } } : {}),
      },
    });

    // Provider usage breakdown
    const usageRecords = await prisma.usageRecord.findMany({
      where: businessWhere,
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    let totalTokens = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalLatency = 0;
    const providerStats: Record<string, { requests: number; tokens: number; totalLatency: number }> = {
      GROQ: { requests: 0, tokens: 0, totalLatency: 0 },
      MISTRAL: { requests: 0, tokens: 0, totalLatency: 0 },
      GEMINI: { requests: 0, tokens: 0, totalLatency: 0 },
    };

    for (const r of usageRecords) {
      totalTokens += r.totalTokens;
      totalPromptTokens += r.promptTokens;
      totalCompletionTokens += r.completionTokens;
      totalLatency += r.latencyMs;

      if (!providerStats[r.provider]) {
        providerStats[r.provider] = { requests: 0, tokens: 0, totalLatency: 0 };
      }
      providerStats[r.provider].requests += 1;
      providerStats[r.provider].tokens += r.totalTokens;
      providerStats[r.provider].totalLatency += r.latencyMs;
    }

    const avgLatencyMs = usageRecords.length > 0 ? Math.round(totalLatency / usageRecords.length) : 0;

    // Queue backlog
    const pendingJobs = await prisma.messageJob.count({
      where: { status: "QUEUED" },
    });

    const failedJobs = await prisma.messageJob.count({
      where: { status: "FAILED" },
    });

    return NextResponse.json({
      metrics: {
        incomingMessages: incomingCount,
        outgoingAiMessages: outgoingAiCount,
        outgoingAgentMessages: outgoingAgentCount,
        totalTokens,
        totalPromptTokens,
        totalCompletionTokens,
        avgLatencyMs,
        pendingJobs,
        failedJobs,
      },
      providerStats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
