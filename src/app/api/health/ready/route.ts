import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
    return NextResponse.json(
      {
        status: "not_ready",
        database: "disconnected",
        error: "Database connectivity check failed",
      },
      { status: 503 }
    );
  }
}
