import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);

    const business = await prisma.business.findUnique({
      where: { id: params.id },
      include: {
        channels: true,
        aiConfigs: { orderBy: { priority: "asc" } },
        kbSources: {
          include: {
            _count: { select: { chunks: true } },
          },
        },
        _count: {
          select: {
            conversations: true,
            leads: true,
            usageRecords: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ business });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["OWNER", "ADMIN"]);
    const body = await req.json();

    const current = await prisma.business.findUnique({
      where: { id: params.id },
    });

    if (!current) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const {
      name,
      description,
      website,
      email,
      phone,
      address,
      productsServices,
      businessHours,
      supportedLanguages,
      faq,
      timezone,
      isActive,
      systemInstructions,
      whenYouDontKnow,
      welcomeMessage,
      safeFailureMessage,
      humanHandoffMessage,
      closingMessage,
      versionNote,
    } = body;

    // Check if instructions changed to record version history
    const instructionsChanged =
      (systemInstructions !== undefined && systemInstructions !== current.systemInstructions) ||
      (whenYouDontKnow !== undefined && whenYouDontKnow !== current.whenYouDontKnow) ||
      (welcomeMessage !== undefined && welcomeMessage !== current.welcomeMessage) ||
      (safeFailureMessage !== undefined && safeFailureMessage !== current.safeFailureMessage) ||
      (humanHandoffMessage !== undefined && humanHandoffMessage !== current.humanHandoffMessage) ||
      (closingMessage !== undefined && closingMessage !== current.closingMessage);

    const updated = await prisma.business.update({
      where: { id: params.id },
      data: {
        name: name ?? current.name,
        description: description ?? current.description,
        website: website ?? current.website,
        email: email ?? current.email,
        phone: phone ?? current.phone,
        address: address ?? current.address,
        productsServices: productsServices ?? current.productsServices,
        businessHours: businessHours ?? current.businessHours,
        supportedLanguages: supportedLanguages ?? current.supportedLanguages,
        faq: faq ?? current.faq,
        timezone: timezone ?? current.timezone,
        isActive: isActive ?? current.isActive,
        systemInstructions: systemInstructions ?? current.systemInstructions,
        whenYouDontKnow: whenYouDontKnow ?? current.whenYouDontKnow,
        welcomeMessage: welcomeMessage ?? current.welcomeMessage,
        safeFailureMessage: safeFailureMessage ?? current.safeFailureMessage,
        humanHandoffMessage: humanHandoffMessage ?? current.humanHandoffMessage,
        closingMessage: closingMessage ?? current.closingMessage,
      },
    });

    if (instructionsChanged) {
      await prisma.businessInstructionVersion.create({
        data: {
          businessId: updated.id,
          systemInstructions: updated.systemInstructions,
          whenYouDontKnow: updated.whenYouDontKnow,
          welcomeMessage: updated.welcomeMessage,
          safeFailureMessage: updated.safeFailureMessage,
          humanHandoffMessage: updated.humanHandoffMessage,
          closingMessage: updated.closingMessage,
          editedByAdminId: user.id,
          versionNote: versionNote || "Updated via dashboard editor",
        },
      });
    }

    return NextResponse.json({ success: true, business: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(["OWNER"]);
    await prisma.business.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: "Business deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
