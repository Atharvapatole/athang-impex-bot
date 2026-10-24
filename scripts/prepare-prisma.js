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
const isPostgres =
  dbUrl.startsWith("postgres://") ||
  dbUrl.startsWith("postgresql://") ||
  (isVercel && !dbUrl.startsWith("file:"));

const targetProvider = isPostgres ? "postgresql" : "sqlite";

// In PostgreSQL / Supabase mode, ensure DIRECT_URL is present in process.env
// so Prisma CLI commands (generate, migrate) do not fail if only DATABASE_URL is initially supplied
if (isPostgres && !process.env.DIRECT_URL && dbUrl) {
  process.env.DIRECT_URL = dbUrl;
}

let expectedDatasource;
if (targetProvider === "postgresql") {
  expectedDatasource = `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")\n}`;
} else {
  expectedDatasource = `datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}`;
}

const datasourceRegex = /datasource\s+db\s+\{[\s\S]*?\}/m;
const currentMatch = schema.match(datasourceRegex);
const currentDatasource = currentMatch ? currentMatch[0].replace(/\r\n/g, "\n").trim() : "";
const normalizedExpected = expectedDatasource.replace(/\r\n/g, "\n").trim();

if (currentDatasource !== normalizedExpected) {
  schema = schema.replace(datasourceRegex, expectedDatasource);
  fs.writeFileSync(schemaPath, schema, "utf8");
  console.log(`[Prisma Prepare] Configured datasource provider: "${targetProvider}" (PostgreSQL: ${isPostgres})`);
} else {
  console.log(`[Prisma Prepare] Datasource provider is already "${targetProvider}"`);
}
