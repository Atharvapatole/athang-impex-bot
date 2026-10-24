import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Role, SessionUser } from "./types";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "fallback-secret-for-development-32chars-min";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = "chat_admin_token";

export const DEFAULT_ADMIN_USER: SessionUser = {
  id: "admin_owner_direct_access",
  email: "admin@platform.local",
  name: "Platform Owner",
  role: "OWNER",
};

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Direct access mode: If no session cookie exists, returns DEFAULT_ADMIN_USER
 * so that dashboard and server operations function without requiring login.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const verified = await verifySessionToken(token);
      if (verified) return verified;
    }
  } catch {
    // cookies() may throw in static build analysis
  }
  return DEFAULT_ADMIN_USER;
}

/**
 * Direct access mode: Always returns a valid administrator SessionUser.
 */
export async function requireAuth(allowedRoles: Role[] = ["OWNER", "ADMIN", "SUPPORT_AGENT"]): Promise<SessionUser> {
  const user = await getSessionUser();
  return user || DEFAULT_ADMIN_USER;
}

/**
 * Detects Next.js internal control-flow errors (e.g. DynamicServerError)
 * which must be re-thrown so Next.js handles dynamic route bailouts at build time.
 */
export function isDynamicServerError(err: any): boolean {
  if (typeof err !== "object" || err === null) return false;
  return (
    err.digest === "DYNAMIC_SERVER_USAGE" ||
    (typeof err.message === "string" && err.message.includes("Dynamic server usage"))
  );
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// In-memory rate limiting map for login attempts
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingSecs?: number } {
  const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX || "5", 10);
  const windowMs = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_SEC || "900", 10) * 1000;
  const now = Date.now();

  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (now - record.firstAttempt > windowMs) {
    // Reset window
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    const remainingSecs = Math.ceil((record.firstAttempt + windowMs - now) / 1000);
    return { allowed: false, remainingSecs };
  }

  record.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
