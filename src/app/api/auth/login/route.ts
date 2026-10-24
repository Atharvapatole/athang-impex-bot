import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";
import { createSessionToken, setSessionCookie, checkLoginRateLimit, resetLoginRateLimit, isDynamicServerError } from "@/lib/auth";
import { ensureAdministratorBootstrap } from "@/lib/bootstrap";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkLoginRateLimit(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateCheck.remainingSecs} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { email, password } = body;
    const cleanEmail = email.toLowerCase().trim();

    // Ensure initial administrator and business exist if the database is newly provisioned
    await ensureAdministratorBootstrap();

    const admin = await prisma.administrator.findUnique({
      where: { email: cleanEmail },
    });

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    resetLoginRateLimit(ip);

    const token = await createSessionToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as any,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (err: any) {
    if (isDynamicServerError(err)) {
      throw err;
    }

    console.error("[Login Error]", err?.message || err);

    // Identify Prisma database connectivity or table missing errors
    const isPrismaError =
      err?.code?.startsWith?.("P") ||
      err?.name === "PrismaClientInitializationError" ||
      err?.name === "PrismaClientKnownRequestError" ||
      err?.name === "PrismaClientRustPanicError";

    if (isPrismaError) {
      return NextResponse.json(
        {
          error:
            "Database connectivity error or schema uninitialized. Please check DATABASE_URL and run prisma migrations.",
          code: err?.code || "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
