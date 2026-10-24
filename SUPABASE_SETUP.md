# ATHANG IMPEX Chatbot — Supabase PostgreSQL Production Setup Guide

This guide describes how to connect the **ATHANG IMPEX** AI Chatbot to **Supabase PostgreSQL** and configure **Vercel** for production.

---

## 1. Create a Supabase Project

1. Log in to [supabase.com](https://supabase.com).
2. Click **New Project**.
3. Fill in:
   - **Name**: `athang-impex-chatbot`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Choose a region closest to your primary users (e.g. `ap-south-1` Mumbai or `ap-southeast-1` Singapore).
4. Click **Create new project** and wait ~1-2 minutes for provisioning.

---

## 2. Retrieve Supabase Credentials & Connection Strings

In your Supabase project dashboard:

### A. PostgreSQL Connection Strings (For Prisma ORM & Database Access)
Navigate to: **Project Settings** &rarr; **Database** &rarr; Scroll down to **Connection String** &rarr; Select **URI** tab:

1. **Transaction Mode Pooler (`DATABASE_URL`) — REQUIRED for Vercel Serverless Runtime**:
   - Mode: **Transaction** (Port: `6543`)
   - Format:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - *Why*: Vercel functions are stateless serverless lambdas. The transaction pooler uses Supavisor/PgBouncer to pool connections and prevent database connection exhaustion.

2. **Session Mode Pooler / Direct Connection (`DIRECT_URL`) — REQUIRED for Prisma CLI Migrations**:
   - Mode: **Session** (Port: `5432`)
   - Format:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
   - *Why*: Running migrations (`prisma migrate deploy`) requires session-level advisory locks which transaction poolers cannot provide.

> [!IMPORTANT]
> Always replace `[YOUR-PASSWORD]` with your actual database password in both strings. If your password contains special characters (like `@`, `#`, `%`), URL-encode them (e.g., `@` becomes `%40`).

---

### B. Supabase Project URL & API Keys (Optional / Reference)
Navigate to: **Project Settings** &rarr; **API**:

1. **Project URL (`SUPABASE_URL`)**:
   - Format: `https://[PROJECT-REF].supabase.co`
2. **Project API Key / Anon Key (`SUPABASE_ANON_KEY`)**:
   - Under *Project API keys* &rarr; copy the `anon` / `public` key.
3. **Service Role Secret Key (`SUPABASE_SERVICE_ROLE_KEY`)**:
   - Under *Project API keys* &rarr; copy the `service_role` secret (OPTIONAL — only needed if using Supabase Auth or direct Supabase storage bypassing Prisma; never expose to frontend).

---

## 3. Initialize Database Schema & Admin Account (Two Easy Methods)

You can choose either **Method 1 (Recommended — Supabase SQL Editor)** or **Method 2 (Prisma CLI)**:

### Method 1: Instant Setup via Supabase SQL Editor (Recommended)
1. In your Supabase dashboard, click the **SQL Editor** icon in the left navigation sidebar.
2. Click **+ New Query**.
3. Open the file [supabase/setup.sql](supabase/setup.sql) from your local project repository, copy its entire contents, and paste them into the SQL editor.
4. Click **Run** (or press `Ctrl+Enter`).
   - *Note on RLS Warning*: `supabase/setup.sql` already contains `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` on all tables and revokes access from `anon` and `authenticated` PostgREST roles. This ensures PostgREST clients cannot read or modify private data, while server-side Prisma (connecting as table owner `postgres`) retains full access.
5. **Done!** This single SQL script:
   - Creates all 13 application tables with appropriate foreign keys and cascading deletes.
   - Enables Row Level Security (RLS) on all tables to lock out unauthorized PostgREST API access.
   - Creates unique indexes (`Administrator_email_key`, `Business_slug_key`, `Session_token_key`, etc.).
   - Registers the initial migration in `_prisma_migrations` so Prisma CLI recognizes the schema as fully synced.
   - Pre-seeds the **ATHANG IMPEX** business profile.
   - Seeds the default owner administrator:
     - **Email**: `admin@platform.local`
     - **Password**: `AdminPassword123!` (securely hashed with bcrypt).

---

### Method 2: Setup via Command Line (Prisma Migrate)
If you prefer running from your local machine terminal:

**Windows PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Apply migrations
npm run db:migrate:deploy

# Bootstrap initial administrator
npm run db:bootstrap
```

**Linux / macOS:**
```bash
export DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Apply migrations
npm run db:migrate:deploy

# Bootstrap initial administrator
npm run db:bootstrap
```

---

## 4. Configure Vercel Production Environment Variables

Go to **Vercel Dashboard** &rarr; select your project `athangimpexbot` &rarr; **Settings** &rarr; **Environment Variables**.

Add or update the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Required | Description | Example / Value |
|---|---|---|---|
| `DATABASE_URL` | **YES** | Supabase pooled connection (Port 6543, pgbouncer=true) | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | **YES** | Supabase session connection (Port 5432) | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres` |
| `ENCRYPTION_MASTER_KEY` | **YES** | 64-character hex key (32 bytes AES-256) | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_SECRET` | **YES** | Secret for signing admin session tokens | 32+ character random string |
| `APP_BASE_URL` | **YES** | Canonical production URL (no trailing slash) | `https://athangimpexbot.vercel.app` |
| `SUPABASE_URL` | Optional | Supabase project URL | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_ANON_KEY` | Optional | Supabase public/anon API key | `eyJhbGciOi...` |
| `ADMIN_DEFAULT_EMAIL` | Optional | Default admin email | `admin@platform.local` |
| `ADMIN_DEFAULT_PASSWORD` | Optional | Default admin password | `AdminPassword123!` |

> [!NOTE]
> Channel credentials (WhatsApp Permanent Token, App Secret, Telegram Bot Token) and AI API keys (Groq, Mistral, Gemini) can either be set in environment variables or entered directly from the Admin Dashboard at `/channels/whatsapp`, `/channels/telegram`, and `/ai-providers`. They are automatically encrypted with `AES-256-GCM` before database insertion.

---

## 5. Redeploy on Vercel & Verify

1. Push latest code to GitHub:
   ```bash
   git add .
   git commit -m "fix: complete Supabase PostgreSQL integration with setup.sql and admin bootstrap"
   git push origin main
   ```
2. In Vercel, navigate to **Deployments** &rarr; Click **Redeploy** on the latest deployment (making sure "Redeploy with existing build cache" is **unchecked** so new environment variables take effect).
3. Once deployed, test the health check endpoint in your browser:
   `https://athangimpexbot.vercel.app/api/health/ready`
   
   It will return:
   ```json
   {
     "status": "ready",
     "database": "connected",
     "queueBacklog": 0
   }
   ```
4. Open the production login page:
   `https://athangimpexbot.vercel.app/login`
5. Sign in with the administrator credentials:
   - **Email**: `admin@platform.local`
   - **Password**: `AdminPassword123!`
6. You will be redirected to `https://athangimpexbot.vercel.app/dashboard`.

---

## 6. How to Change or Reset Administrator Password

### Option A: From Web Dashboard
Once logged in, navigate to **Settings** or your account profile to update your email or password.

### Option B: Via Command Line CLI
You can reset the password directly from your terminal using:
```bash
node scripts/bootstrap-cli.js --reset-password --email admin@platform.local --password "MyNewStrongPassword123!"
```
The script will hash the new password using bcrypt (12 rounds) and update the database record securely without exposing the password in logs.
