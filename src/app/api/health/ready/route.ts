import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDynamicServerError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Verify database connectivity
    await prisma.business.count();

    const pendingJobs = await prisma.messageJob.count({
      where: { status: "QUEUED" },
    });

    return NextResponse.json(
      {
        status: "ready",
        database: "connected",
        queueBacklog: pendingJobs,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (isDynamicServerError(err)) {
      throw err;
    }

    console.error("[Health Ready Error]", err);
    return NextResponse.json(
      {
        status: "not_ready",
        database: "disconnected",
        error: "Database connectivity check failed",
        code: err?.code || "DB_ERROR",
        message: err?.message ? err.message.substring(0, 150) : "Database unavailable",
      },
      { status: 503 }
    );
  }
}
