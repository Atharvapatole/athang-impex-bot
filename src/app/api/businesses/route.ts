import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);

    const businesses = await prisma.business.findMany({
      include: {
        _count: {
          select: {
            channels: true,
            kbSources: true,
            conversations: true,
            leads: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ businesses });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message || "Failed to fetch businesses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["OWNER", "ADMIN"]);
    const body = await req.json();

    const {
      name,
      slug,
      description,
      website,
      email,
      phone,
      timezone,
      systemInstructions,
      whenYouDontKnow,
      welcomeMessage,
      safeFailureMessage,
      humanHandoffMessage,
      closingMessage,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const existing = await prisma.business.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json({ error: "A business with this slug already exists" }, { status: 400 });
    }

    const business = await prisma.business.create({
      data: {
        name,
        slug: cleanSlug,
        description,
        website,
        email,
        phone,
        timezone: timezone || "UTC",
        isActive: true,
        systemInstructions: systemInstructions || `You are the AI assistant for ${name}. Answer accurately based on the business knowledge base.`,
        whenYouDontKnow: whenYouDontKnow || `If you don't know the answer, politely ask the user to contact ${email || "support"}.`,
        welcomeMessage: welcomeMessage || `Welcome to ${name}! How can we assist you today?`,
        safeFailureMessage: safeFailureMessage || `Sorry, our assistant is temporarily unavailable. Please contact ${email || "support"}.`,
        humanHandoffMessage: humanHandoffMessage || `An agent has been notified and will be with you shortly.`,
        closingMessage: closingMessage || `Thank you for contacting ${name}!`,
      },
    });

    // Save initial version
    await prisma.businessInstructionVersion.create({
      data: {
        businessId: business.id,
        systemInstructions: business.systemInstructions,
        whenYouDontKnow: business.whenYouDontKnow,
        welcomeMessage: business.welcomeMessage,
        safeFailureMessage: business.safeFailureMessage,
        humanHandoffMessage: business.humanHandoffMessage,
        closingMessage: business.closingMessage,
        editedByAdminId: user.id,
        versionNote: "Initial creation",
      },
    });

    return NextResponse.json({ success: true, business }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to create business" }, { status: 500 });
  }
}
