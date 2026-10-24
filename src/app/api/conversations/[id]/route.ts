import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        business: true,
        contact: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
        leads: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const body = await req.json();
    const { status, isHumanTakeover } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (isHumanTakeover !== undefined) data.isHumanTakeover = isHumanTakeover;

    const updated = await prisma.conversation.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
