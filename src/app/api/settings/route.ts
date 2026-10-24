import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth(["OWNER", "ADMIN"]);

    return NextResponse.json({
      settings: {
        environment: process.env.NODE_ENV || "development",
        encryptionKeyConfigured: !!process.env.ENCRYPTION_MASTER_KEY,
        encryptionAlgorithm: "AES-256-GCM (Authenticated)",
        jwtConfigured: !!process.env.JWT_SECRET,
        sessionDuration: "24 hours",
        loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || "5", 10),
        loginRateLimitWindowSec: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_SEC || "900", 10),
        databaseUrlConfigured: !!process.env.DATABASE_URL,
        pdfMaxSizeBytes: 15 * 1024 * 1024,
        pdfFetchTimeoutSec: 25,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
