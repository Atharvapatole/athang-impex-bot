import { prisma } from "./prisma";

let healAttempted = false;

/**
 * Checks if an error is due to a missing column in the database (e.g. Business.address)
 */
export function isMissingColumnError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = err.code || "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    msg.includes("has no column")
  );
}

/**
 * Checks if an error is PostgreSQL error 42P05 ("prepared statement already exists").
 * This occurs when connecting to PgBouncer / Supavisor transaction poolers without ?pgbouncer=true.
 */
export function isPreparedStatementError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = err.code || "";
  return (
    code === "42P05" ||
    msg.includes("42p05") ||
    (msg.includes("prepared statement") && msg.includes("already exists"))
  );
}

/**
 * Ensures the 5 Business operational columns exist in PostgreSQL.
 * Safe, idempotent, and non-destructive.
 */
export async function autoHealBusinessSchema(): Promise<boolean> {
  const statements = [
    'ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "address" TEXT',
    'ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "productsServices" TEXT',
    'ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "businessHours" TEXT',
    'ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "supportedLanguages" TEXT',
    'ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "faq" TEXT',
  ];

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (e: any) {
      console.warn(`[AutoHeal] Notice executing statement "${stmt}":`, e?.message || e);
    }
  }
  healAttempted = true;
  return true;
}
