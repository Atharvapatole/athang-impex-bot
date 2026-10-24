import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensureAdministratorBootstrap } from "@/lib/bootstrap";
import { isMissingColumnError, autoHealBusinessSchema } from "@/lib/db-heal";

export async function GET() {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);

    let businesses;
    try {
      businesses = await prisma.business.findMany({
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
    } catch (dbErr: any) {
      if (isMissingColumnError(dbErr)) {
        await autoHealBusinessSchema();
        businesses = await prisma.business.findMany({
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
      } else {
        throw dbErr;
      }
    }

    if (businesses.length === 0) {
      await ensureAdministratorBootstrap();
      businesses = await prisma.business.findMany({
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
    }

    return NextResponse.json({ businesses });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message || "Failed to fetch businesses" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(["OWNER", "ADMIN"]);
    const body = await req.json();

    const {
      id,
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

    // Find business by id or find default ATHANG IMPEX
    let target = null;
    if (id) {
      try {
        target = await prisma.business.findUnique({ where: { id } });
      } catch (findErr: any) {
        if (isMissingColumnError(findErr)) {
          await autoHealBusinessSchema();
          target = await prisma.business.findUnique({ where: { id } });
        } else {
          throw findErr;
        }
      }
    }
    if (!target) {
      try {
        target = await prisma.business.findFirst({
          where: { slug: "athang-impex" },
        });
      } catch (findErr: any) {
        if (isMissingColumnError(findErr)) {
          await autoHealBusinessSchema();
          target = await prisma.business.findFirst({
            where: { slug: "athang-impex" },
          });
        }
      }
    }
    if (!target) {
      target = await prisma.business.findFirst();
    }

    if (!target) {
      await ensureAdministratorBootstrap();
      target = await prisma.business.findFirst();
    }

    if (!target) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    const instructionsChanged =
      (systemInstructions !== undefined && systemInstructions !== target.systemInstructions) ||
      (whenYouDontKnow !== undefined && whenYouDontKnow !== target.whenYouDontKnow) ||
      (welcomeMessage !== undefined && welcomeMessage !== target.welcomeMessage) ||
      (safeFailureMessage !== undefined && safeFailureMessage !== target.safeFailureMessage) ||
      (humanHandoffMessage !== undefined && humanHandoffMessage !== target.humanHandoffMessage) ||
      (closingMessage !== undefined && closingMessage !== target.closingMessage);

    const updatePayload = {
      name: name !== undefined ? name : target.name,
      description: description !== undefined ? description : target.description,
      website: website !== undefined ? website : target.website,
      email: email !== undefined ? email : target.email,
      phone: phone !== undefined ? phone : target.phone,
      address: address !== undefined ? address : target.address,
      productsServices: productsServices !== undefined ? productsServices : target.productsServices,
      businessHours: businessHours !== undefined ? businessHours : target.businessHours,
      supportedLanguages: supportedLanguages !== undefined ? supportedLanguages : target.supportedLanguages,
      faq: faq !== undefined ? faq : target.faq,
      timezone: timezone !== undefined ? timezone : target.timezone,
      isActive: isActive !== undefined ? isActive : target.isActive,
      systemInstructions: systemInstructions !== undefined ? systemInstructions : target.systemInstructions,
      whenYouDontKnow: whenYouDontKnow !== undefined ? whenYouDontKnow : target.whenYouDontKnow,
      welcomeMessage: welcomeMessage !== undefined ? welcomeMessage : target.welcomeMessage,
      safeFailureMessage: safeFailureMessage !== undefined ? safeFailureMessage : target.safeFailureMessage,
      humanHandoffMessage: humanHandoffMessage !== undefined ? humanHandoffMessage : target.humanHandoffMessage,
      closingMessage: closingMessage !== undefined ? closingMessage : target.closingMessage,
    };

    let updated;
    try {
      updated = await prisma.business.update({
        where: { id: target.id },
        data: updatePayload,
      });
    } catch (upErr: any) {
      if (isMissingColumnError(upErr)) {
        await autoHealBusinessSchema();
        try {
          updated = await prisma.business.update({
            where: { id: target.id },
            data: updatePayload,
          });
        } catch (retryErr: any) {
          // If database user lacks ALTER TABLE privilege, fallback to updating core fields
          const corePayload = {
            name: updatePayload.name,
            description: updatePayload.description,
            website: updatePayload.website,
            email: updatePayload.email,
            phone: updatePayload.phone,
            timezone: updatePayload.timezone,
            isActive: updatePayload.isActive,
            systemInstructions: updatePayload.systemInstructions,
            whenYouDontKnow: updatePayload.whenYouDontKnow,
            welcomeMessage: updatePayload.welcomeMessage,
            safeFailureMessage: updatePayload.safeFailureMessage,
            humanHandoffMessage: updatePayload.humanHandoffMessage,
            closingMessage: updatePayload.closingMessage,
          };
          updated = await prisma.business.update({
            where: { id: target.id },
            data: corePayload,
          });
        }
      } else {
        throw upErr;
      }
    }

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
          versionNote: versionNote || "Updated via dashboard profile editor",
        },
      });
    }

    return NextResponse.json({ success: true, business: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to update business" }, { status: 500 });
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
