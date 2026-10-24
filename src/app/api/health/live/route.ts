import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "live",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
