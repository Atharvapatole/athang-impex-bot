import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Normalizes PostgreSQL connection string for Supabase and connection poolers.
 *
 * Why this is critical:
 * - Supabase port 6543 (Supavisor / PgBouncer in transaction mode) pools connections across transactions.
 * - Without `pgbouncer=true`, Prisma creates named prepared statements (s0, s1, s5, s9).
 * - On pooled connections, this causes PostgreSQL error 42P05: `prepared statement "s..." already exists`.
 * - Adding `pgbouncer=true` tells Prisma's query engine to disable prepared statement caching.
 * - On Vercel / serverless runtimes, setting `connection_limit=1` prevents pool exhaustion.
 */
export function normalizeDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;

  const isPostgres = rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://");
  if (!isPostgres) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    const isPooler =
      parsed.port === "6543" ||
      parsed.hostname.includes("pooler.supabase.com") ||
      parsed.hostname.includes("pooler.");

    // Transaction pooler mode requires pgbouncer=true to prevent error 42P05
    if (isPooler && !parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    // Serverless concurrency control on Vercel
    const isServerless = process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
    if (isServerless && !parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }

    return parsed.toString();
  } catch {
    let url = rawUrl;
    if ((url.includes(":6543") || url.includes("pooler.")) && !url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
    return url;
  }
}

const rawDbUrl = process.env.DATABASE_URL;
const normalizedDbUrl = normalizeDatabaseUrl(rawDbUrl);

// Update process.env so internal Prisma query engine uses the normalized URL
if (normalizedDbUrl && normalizedDbUrl !== rawDbUrl) {
  process.env.DATABASE_URL = normalizedDbUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: normalizedDbUrl
      ? {
          db: {
            url: normalizedDbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always preserve client in global scope to reuse connection pool across warm serverless function invocations
globalForPrisma.prisma = prisma;
