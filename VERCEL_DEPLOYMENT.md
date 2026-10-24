# ATHANG IMPEX AI Chatbot Platform — Production Vercel & PostgreSQL Deployment Guide

This guide describes how to deploy the production **ATHANG IMPEX** AI Chatbot Platform to **Vercel** with a serverless PostgreSQL database (Neon, Supabase, or Vercel Postgres).

---

## 1. Architecture Overview for Vercel

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS EDGE                   │
│                                                             │
│   Meta WhatsApp Cloud API          Telegram Bot API         │
│             │                             │                 │
│             ▼                             ▼                 │
│   /api/webhooks/whatsapp        /api/webhooks/telegram      │
│             │                             │                 │
│             └──────────────┬──────────────┘                 │
│                            ▼                                │
│               Inline Worker Execution                       │
│           (await worker.processJob(job.id))                 │
│                            │                                │
│             ┌──────────────┴──────────────┐                 │
│             ▼                             ▼                 │
│    Groq / Mistral / Gemini        PostgreSQL Database       │
│      AI Fallback Pipeline           (Neon / Supabase)       │
└─────────────────────────────────────────────────────────────┘
```

### Why Inline Worker Execution on Vercel?
- Vercel functions are **ephemeral/stateless serverless lambdas**. They do not support 24/7 continuous `while(true)` background loops (`scripts/worker.js`).
- If webhooks only inserted jobs into a database table without processing them, customer messages would sit un-replied unless an external cron or worker ran.
- In `src/app/api/webhooks/whatsapp/route.ts` and `src/app/api/webhooks/telegram/route.ts`, each job is:
  1. Ingested with duplicate prevention (`externalMessageId` unique constraint).
  2. Acknowledged and processed **inline** using `await worker.processJob(job.id)` before the HTTP response terminates.
  3. The AI reply is generated via the 3-Tier Fallback Engine (`Groq` &rarr; `Mistral` &rarr; `Gemini`) and sent directly to WhatsApp / Telegram.
  4. Response returns `200 OK` within ~1.2s, satisfying Meta's 15s webhook requirement.
- For VPS / Docker environments, the standalone daemon `npm run worker` can still be run concurrently to drain any async retries or backlog.

---

## 2. PostgreSQL Database Setup (Neon / Supabase)

### Option A: Neon Serverless Postgres (Recommended)
1. Sign up at [neon.tech](https://neon.tech) and create a new project named `athang-impex-chatbot`.
2. Copy the pooled connection string (with `?sslmode=require&pgbouncer=true`).
3. Set `DATABASE_URL` in your `.env` or Vercel Environment Variables.

### Option B: Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** &rarr; **Database** &rarr; **Connection String** (use Transaction Pooler / port 6543).

### Database Migration & Seeding
Before first login or during Vercel deployment, apply the Prisma schema to your remote PostgreSQL database:

```bash
# Set your remote PostgreSQL connection string
export DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
# On Windows PowerShell:
# $env:DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# 1. Automatically configure schema for PostgreSQL, push tables, and seed ATHANG IMPEX
npm run db:setup

# Or run individually:
npm run db:push   # Prepares schema and runs `prisma db push`
npm run db:seed   # Seeds initial admin, ATHANG IMPEX tenant, catalog & channels
```

### Automatic Provider Switching (`scripts/prepare-prisma.js`)
- The project includes `scripts/prepare-prisma.js` which automatically switches the datasource provider in `prisma/schema.prisma` between `sqlite` (for local development) and `postgresql` (for remote databases / Vercel).
- During `npm run build` or `npm run postinstall` on Vercel, `prepare-prisma.js` automatically executes and configures Prisma Client for PostgreSQL.

### Automatic Runtime Administrator Bootstrap
- Even if `npm run db:seed` was not manually run, the platform includes a self-healing bootstrap in `src/lib/bootstrap.ts`.
- When an administrator attempts to log in, if `Administrator.count() === 0`, the system automatically provisions the default administrator:
  - **Email**: `admin@platform.local` (or `ADMIN_DEFAULT_EMAIL` environment variable)
  - **Password**: `AdminPassword123!` (or `ADMIN_DEFAULT_PASSWORD` environment variable)
  - **Role**: `OWNER`
- This bootstrap runs non-destructively and will never overwrite or duplicate existing administrator accounts.

---

## 3. Required Production Environment Variables

Configure these in **Vercel Project Settings &rarr; Environment Variables**:

| Variable Name | Required | Description | Example / Format |
|---|---|---|---|
| `DATABASE_URL` | **YES** | PostgreSQL connection string | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `ENCRYPTION_MASTER_KEY` | **YES** | 64-character hex string (32 bytes AES-256) | Run `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_SECRET` | **YES** | Secure secret for admin session tokens | Run `openssl rand -hex 32` |
| `APP_BASE_URL` | **YES** | Authoritative production URL (no trailing slash) | `https://athangimpexbot.vercel.app` |
| `ADMIN_DEFAULT_PASSWORD` | Recommended | Initial admin login password | `StrongPassword123!` |
| `DEFAULT_BUSINESS_SLUG` | Optional | Defaults to `athang-impex` | `athang-impex` |
| `GROQ_API_KEY` | Optional (if set in DB) | Default Groq fallback API key | `gsk_...` |
| `MISTRAL_API_KEY` | Optional (if set in DB) | Default Mistral fallback API key | `...` |
| `GEMINI_API_KEY` | Optional (if set in DB) | Default Gemini fallback API key | `AIzaSy...` |

> **Security Note**: Sensitive channel credentials (WhatsApp Access Token, App Secret, Telegram Bot Token) and AI API keys are stored encrypted in the database using `AES-256-GCM` with `ENCRYPTION_MASTER_KEY`. They can also be entered directly via the Web Dashboard.

---

## 4. Meta WhatsApp Cloud API Configuration

### Step 1: Meta Developer Portal Setup
1. Go to [developers.facebook.com](https://developers.facebook.com) and create or open your **Business App**.
2. Add the **WhatsApp** product.
3. Under **WhatsApp &rarr; API Setup**:
   - Note the **Phone Number ID** (e.g. `512398718625901`).
   - Create a System User in Meta Business Suite to generate a **Permanent Access Token** with permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
4. Under **App Settings &rarr; Basic**:
   - Copy your **App Secret** (used to verify incoming HMAC SHA256 signatures).

### Step 2: Configure in ATHANG IMPEX Dashboard
1. Open the Admin Dashboard: `https://athangimpexbot.vercel.app/channels/whatsapp`.
2. Provide the 5 fields:
   - **Phone Number ID**: Your Meta Phone Number ID.
   - **Verify Token**: Any secret string you choose (e.g., `athang_wa_verify_2026`).
   - **Permanent Access Token**: The System User token (`EAAG...`).
   - **App Secret**: From Meta App Settings &rarr; Basic.
   - **Webhook URL**: Click **Copy Webhook URL** (`https://athangimpexbot.vercel.app/api/webhooks/whatsapp`).
3. Click **Save Configuration**.
4. Click **Test Meta Connection**: Confirms valid Meta Graph API connection and displays phone verification status.

### Step 3: Configure Webhook in Meta Portal
1. Under **WhatsApp &rarr; Configuration**:
   - **Callback URL**: `https://athangimpexbot.vercel.app/api/webhooks/whatsapp`
   - **Verify Token**: The exact string you set in the dashboard (e.g., `athang_wa_verify_2026`).
   - Click **Verify and Save**.
2. Under **Webhook Fields**, subscribe to:
   - `messages` (required for incoming customer inquiries).

---

## 5. Telegram Bot API Configuration

### Step 1: Create Bot in Telegram
1. Open Telegram and message `@BotFather`.
2. Send `/newbot`, name it `AthangImpexBot` and choose a username (e.g., `AthangImpex_bot`).
3. Copy the **Bot Token** (e.g. `7912345678:AAH...`).

### Step 2: Configure in ATHANG IMPEX Dashboard
1. Open `https://athangimpexbot.vercel.app/channels/telegram`.
2. Enter:
   - **Bot Token**: Your BotFather token.
   - **Webhook URL**: Click **Copy Webhook URL** (`https://athangimpexbot.vercel.app/api/webhooks/telegram`).
   - **Webhook Secret Token**: (Optional) 1-256 character secret token matching `[A-Za-z0-9_-]`.
3. Click **Save Configuration**.
4. Click **Test Bot Connection**: Executes `getMe` and verifies the bot username `@AthangImpex_bot`.
5. Click **Set Telegram Webhook**: Calls Telegram `setWebhook` API to bind your Vercel endpoint.
6. Click **Verify Webhook Status**: Calls `getWebhookInfo` to verify `has_custom_certificate`, pending updates, and last error date.

---

## 6. Verifying Production Deployment

1. **Dashboard Check**: Access `https://athangimpexbot.vercel.app/dashboard` and log in with admin credentials.
2. **Channel Status**: Check `/channels` — ensure WhatsApp and Telegram display green badges or verified status.
3. **Knowledge Base**: Verify `Export Catalog & Product Specifications` is loaded under `/knowledge-base` with onion flake, powder, and spice chunks.
4. **End-to-End WhatsApp Test**: Send a WhatsApp message to the connected number: `"What is the shelf life and packaging of dehydrated red onion flakes?"`. Ensure the bot replies within 2 seconds with grounded catalog specifications.
5. **End-to-End Telegram Test**: Send `/start` or `"Please provide garlic powder specifications and FOB pricing"` to `@AthangImpex_bot`. Confirm response.
6. **Leads Capture**: Open `/leads` to verify the buyer's contact and RFQ was extracted and logged into the CRM table.
