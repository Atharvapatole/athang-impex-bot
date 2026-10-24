const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
if (!fs.existsSync(schemaPath)) {
  console.error("[Prisma Prepare] schema.prisma not found at:", schemaPath);
  process.exit(0);
}

let schema = fs.readFileSync(schemaPath, "utf8");

const dbUrl = process.env.DATABASE_URL || "";
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://") || (isVercel && !dbUrl.startsWith("file:"));

const targetProvider = isPostgres ? "postgresql" : "sqlite";

const currentMatch = schema.match(/datasource\s+db\s+\{\s*provider\s*=\s*"([^"]+)"/);
const currentProvider = currentMatch ? currentMatch[1] : null;

if (currentProvider !== targetProvider) {
  schema = schema.replace(
    /datasource\s+db\s+\{\s*provider\s*=\s*"[^"]+"\s*url\s*=\s*env\("DATABASE_URL"\)\s*\}/m,
    `datasource db {\n  provider = "${targetProvider}"\n  url      = env("DATABASE_URL")\n}`
  );
  fs.writeFileSync(schemaPath, schema, "utf8");
  console.log(`[Prisma Prepare] Switched datasource provider from "${currentProvider}" to "${targetProvider}" (PostgreSQL: ${isPostgres})`);
} else {
  console.log(`[Prisma Prepare] Datasource provider is already "${targetProvider}"`);
}
