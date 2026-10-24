import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Direct access mode: If navigating to /login, redirect directly to /dashboard
  if (pathname === "/login" || pathname === "/login/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow direct access to all dashboard pages and APIs without login
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
