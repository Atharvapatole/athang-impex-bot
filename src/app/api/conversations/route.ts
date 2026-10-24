import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { searchParams } = new URL(req.url);

    const businessId = searchParams.get("businessId");
    const channelType = searchParams.get("channelType");
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const where: any = {};
    if (businessId) where.businessId = businessId;
    if (channelType) where.channelType = channelType;
    if (status) where.status = status;

    if (query) {
      where.OR = [
        { channelIdentifier: { contains: query } },
        { contact: { displayName: { contains: query } } },
        { messages: { some: { content: { contains: query } } } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        business: { select: { name: true, slug: true } },
        contact: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ conversations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
