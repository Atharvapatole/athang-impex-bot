import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const where: any = {};
    if (businessId) where.businessId = businessId;

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        business: { select: { name: true, slug: true } },
        _count: { select: { conversations: true, leads: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ contacts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
