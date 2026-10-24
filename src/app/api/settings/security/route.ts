import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/crypto";

export async function GET() {
  try {
    const user = await requireAuth(["OWNER", "ADMIN"]);

    const admins = await prisma.administrator.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      securityOverview: {
        masterKeyStatus: process.env.ENCRYPTION_MASTER_KEY ? "CONFIGURED_ACTIVE" : "MISSING",
        encryptionCipher: "AES-256-GCM authenticated encryption",
        hashAlgorithm: "bcrypt (12 rounds)",
        cookieFlags: "HttpOnly, SameSite=Lax, Secure (in production)",
        csrfMitigation: "Strict SameSite Cookie & JSON content types",
        ssrfProtection: "Enabled (Private, Loopback, AWS/GCP Metadata blocked)",
      },
      administrators: admins,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const admin = await prisma.administrator.findUnique({
      where: { id: user.id },
    });

    if (!admin) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.administrator.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
