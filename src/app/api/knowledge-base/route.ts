import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const whereClause: any = {};
    if (businessId) whereClause.businessId = businessId;

    const sources = await prisma.knowledgeBaseSource.findMany({
      where: whereClause,
      include: {
        business: { select: { name: true, slug: true } },
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sources });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get("sourceId");

    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
    }

    // Delete source (chunks will cascade delete)
    await prisma.knowledgeBaseSource.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ success: true, message: "Source and indexed chunks deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
