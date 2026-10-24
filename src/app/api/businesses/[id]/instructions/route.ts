import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);

    const versions = await prisma.businessInstructionVersion.findMany({
      where: { businessId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ versions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Revert to a specific version
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["OWNER", "ADMIN"]);
    const { versionId } = await req.json();

    if (!versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const version = await prisma.businessInstructionVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.businessId !== params.id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Update active business instructions
    const updated = await prisma.business.update({
      where: { id: params.id },
      data: {
        systemInstructions: version.systemInstructions,
        whenYouDontKnow: version.whenYouDontKnow,
        welcomeMessage: version.welcomeMessage,
        safeFailureMessage: version.safeFailureMessage,
        humanHandoffMessage: version.humanHandoffMessage,
        closingMessage: version.closingMessage,
      },
    });

    // Record reversion as new version snapshot
    await prisma.businessInstructionVersion.create({
      data: {
        businessId: params.id,
        systemInstructions: version.systemInstructions,
        whenYouDontKnow: version.whenYouDontKnow,
        welcomeMessage: version.welcomeMessage,
        safeFailureMessage: version.safeFailureMessage,
        humanHandoffMessage: version.humanHandoffMessage,
        closingMessage: version.closingMessage,
        editedByAdminId: user.id,
        versionNote: `Reverted to version from ${version.createdAt.toISOString()}`,
      },
    });

    return NextResponse.json({ success: true, business: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
