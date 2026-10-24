import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const where: any = {};
    if (businessId) where.businessId = businessId;

    const jobs = await prisma.messageJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { name: true, slug: true } },
      },
    });

    const recentErrors = await prisma.message.findMany({
      where: {
        state: "FAILED",
        ...(businessId ? { conversation: { businessId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        conversation: {
          include: {
            business: { select: { name: true } },
            contact: true,
          },
        },
      },
    });

    return NextResponse.json({
      jobs,
      recentErrors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
