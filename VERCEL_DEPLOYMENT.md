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

---

## 2. Supabase PostgreSQL Database Setup

### Step 1: Create Supabase Project
1. Log in to [supabase.com](https://supabase.com) and create a new project (e.g. `athang-impex-chatbot`).
2. Choose a strong database password and select your preferred region (e.g., `ap-south-1` Mumbai or closest to your customers).

### Step 2: Retrieve PostgreSQL Connection Strings
In your Supabase project dashboard, navigate to **Project Settings** &rarr; **Database**:

1. **Transaction Pooler Connection (`DATABASE_URL`)**:
   - Scroll to **Connection String** &rarr; Select **URI** tab &rarr; Choose **Transaction Mode** (Port `6543`).
   - Format:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - This pooled connection is used by the Vercel serverless application runtime to prevent connection exhaustion.

2. **Direct Connection (`DIRECT_URL`)**:
   - Select **Session Mode** (Port `5432`) or direct database connection.
   - Format:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
   - This direct connection is used exclusively by Prisma CLI for running schema migrations (`prisma migrate deploy`), as migrations require advisory locks unsupported by transaction poolers.

### Step 3: Run Database Migrations
Before logging in, apply the Prisma migration to your Supabase database from your local machine:

**Windows PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Apply all migrations safely
npm run db:migrate:deploy

# Bootstrap initial administrator and ATHANG IMPEX business profile
npm run db:bootstrap
```

**Linux / macOS:**
```bash
export DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Apply all migrations safely
npm run db:migrate:deploy

# Bootstrap initial administrator and ATHANG IMPEX business profile
npm run db:bootstrap
```

---

## 3. Vercel Environment Variables Checklist

Configure these in **Vercel Project Settings &rarr; Environment Variables**:

### Required Core Variables
| Variable Name | Environments | Description | Format / Example |
|---|---|---|---|
| `DATABASE_URL` | Production, Preview, Development | Supabase pooled connection (Port 6543, Transaction mode) | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Production, Preview, Development | Supabase direct connection (Port 5432) for migrations | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` |
| `ENCRYPTION_MASTER_KEY` | Production, Preview, Development | 64-character hex string (32 bytes AES-256-GCM) | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_SECRET` | Production, Preview, Development | Secret for signing admin session JWT tokens | 32+ character random string |
| `APP_BASE_URL` | Production, Preview | Authoritative production URL without trailing slash | `https://athangimpexbot.vercel.app` |

### Optional Admin Bootstrap Customization
| Variable Name | Environments | Description | Default if omitted |
|---|---|---|---|
| `ADMIN_DEFAULT_EMAIL` | Production, Preview | Initial owner email | `admin@platform.local` |
| `ADMIN_DEFAULT_PASSWORD` | Production, Preview | Initial owner password | `AdminPassword123!` |
| `ADMIN_DEFAULT_NAME` | Production, Preview | Initial owner display name | `Platform Owner` |
| `LOGIN_RATE_LIMIT_MAX` | Production | Max login attempts per window | `5` |
| `LOGIN_RATE_LIMIT_WINDOW_SEC` | Production | Rate limit window in seconds | `900` (15 minutes) |

### Optional Channel & AI Fallback Credentials (Can also be entered via Web UI)
| Variable Name | Environments | Description |
|---|---|---|
| `GROQ_API_KEY` | Production, Preview | Groq fallback API key (`gsk_...`) |
| `MISTRAL_API_KEY` | Production, Preview | Mistral fallback API key |
| `GEMINI_API_KEY` | Production, Preview | Google Gemini fallback API key (`AIzaSy...`) |
| `WHATSAPP_PHONE_NUMBER_ID` | Production | Meta Phone Number ID |
| `WHATSAPP_WABA_ID` | Production | WhatsApp Business Account ID |
| `WHATSAPP_VERIFY_TOKEN` | Production | Custom webhook verification token |
| `WHATSAPP_ACCESS_TOKEN` | Production | Meta permanent system user token |
| `WHATSAPP_APP_SECRET` | Production | Meta App Secret for HMAC SHA-256 verification |
| `TELEGRAM_BOT_TOKEN` | Production | Telegram Bot API token from @BotFather |
| `TELEGRAM_BOT_USERNAME` | Production | Telegram bot username (e.g. `AthangImpexBot`) |
| `TELEGRAM_SECRET_TOKEN` | Production | Telegram webhook verification header token |

> **Security Note**: All secrets entered via the Admin Dashboard or stored in the database are encrypted at rest using `AES-256-GCM`. Database credentials are never logged or exposed in client responses.

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
