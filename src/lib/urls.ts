import { NextRequest } from "next/server";

export const CANONICAL_PRODUCTION_BASE_URL = "https://athangimpexbot.vercel.app";

/**
 * Returns the authoritative application base URL without trailing slash.
 * Priority:
 * 1. APP_BASE_URL environment variable (authoritative when configured)
 * 2. VERCEL_URL environment variable (set automatically on Vercel deployments)
 * 3. If running in production mode, defaults to CANONICAL_PRODUCTION_BASE_URL
 * 4. Local development fallback: incoming request host/protocol or localhost:3000
 */
export function getAppBaseUrl(req?: NextRequest): string {
  // If APP_BASE_URL is explicitly configured, it is authoritative
  if (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim() !== "") {
    return process.env.APP_BASE_URL.trim().replace(/\/+$/, "");
  }

  // On Vercel platform without explicit APP_BASE_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  }

  // In production mode, always enforce the canonical production domain
  // Never expose localhost or untrusted Host headers in production
  if (process.env.NODE_ENV === "production") {
    return CANONICAL_PRODUCTION_BASE_URL;
  }

  // Local development only: inspect request if available
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

/**
 * Authoritative WhatsApp webhook URL.
 */
export function getWhatsAppWebhookUrl(req?: NextRequest): string {
  return `${getAppBaseUrl(req)}/api/webhooks/whatsapp`;
}

/**
 * Authoritative Telegram webhook URL.
 */
export function getTelegramWebhookUrl(req?: NextRequest): string {
  return `${getAppBaseUrl(req)}/api/webhooks/telegram`;
}
