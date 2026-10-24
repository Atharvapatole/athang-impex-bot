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
    let safeMessage = "Database connectivity check failed";
    if (err?.code === "P2021") {
      safeMessage = "Database schema uninitialized (tables missing). Run supabase/setup.sql in Supabase SQL Editor or run npm run db:migrate:deploy.";
    } else if (err?.code === "P1001") {
      safeMessage = "Database host unreachable. Verify network and DATABASE_URL.";
    } else if (err?.code === "P1000") {
      safeMessage = "Database authentication failed. Verify database password.";
    }

    return NextResponse.json(
      {
        status: "not_ready",
        database: "disconnected",
        error: safeMessage,
        code: err?.code || "DB_ERROR",
      },
      { status: 503 }
    );
  }
}
