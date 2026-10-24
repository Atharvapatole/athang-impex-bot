import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const status = searchParams.get("status");

    const where: any = {};
    if (businessId) where.businessId = businessId;
    if (status) where.status = status;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        business: { select: { name: true, slug: true } },
        contact: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const body = await req.json();
    const { id, status, buyerName, company, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Lead id is required" }, { status: 400 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status: status || undefined,
        buyerName: buyerName || undefined,
        company: company || undefined,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
