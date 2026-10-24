# Multi-Channel AI Chatbot Platform — ATHANG IMPEX & BENZWELL

An enterprise-grade, multi-business AI chatbot management platform providing automated 24/7 grounded replies across **Official Meta WhatsApp Cloud API** and **Official Telegram Bot API**, backed by a deterministic **3-tier AI fallback engine** (Groq &rarr; Mistral &rarr; Google Gemini), hosted PDF knowledge-base retrieval with SSRF defense, human agent takeover, and lead extraction.

---

## 1. Key Capabilities

- **Strict Multi-Tenant Isolation**: Supports independent businesses out of the box (**ATHANG IMPEX** for merchant export of dehydrated onions, garlic, ginger, and tomato powder; **BENZWELL** for digital products and software support).
- **3-Tier AI Fallback Engine**:
  - **Tier 1 (Primary)**: Groq (`llama-3.3-70b-versatile`) — Ultra-fast inference.
  - **Tier 2 (Secondary)**: Mistral AI (`mistral-large-latest`) — Multilingual accuracy.
  - **Tier 3 (Tertiary)**: Google Gemini (`gemini-1.5-flash`) — High-reliability safety net.
  - **Safe Failure Mode**: Never fabricates or leaks data if all providers fail; surfaces company-specific contact details (`info@athangimpex.in` / `+91 9923407176`).
- **Hosted PDF Knowledge Base**:
  - Ingestion via HTTPS URL with full **SSRF Protection** (blocks private networks RFC 1918, loopback, and cloud metadata `169.254.169.254`).
  - Lexical / BM25 token matching with sentence-boundary overlapping chunking.
  - Zero external paid embedding API dependencies required.
- **Official Channel Integrations**:
  - **Meta WhatsApp Cloud API**: Webhook verification handshake, HMAC-SHA256 signature validation with App Secret, and Graph API v21.0 outbound sender.
  - **Telegram Bot API**: Webhook secret token validation, update deduplication, and getMe connection testing.
- **Durable Background Job Queue**:
  - Webhooks immediately acknowledge with HTTP 200 within <200ms.
  - Background worker picks up queued events with database locking, exponential backoff with jitter, crash recovery, and idempotency deduplication.
- **Admin Dashboard & Human Takeover**:
  - 14 dedicated pages with dark/light themes.
  - Live conversation inbox with real-time human takeover mode to pause AI replies, resume AI, or send manual replies directly to WhatsApp/Telegram customers.
  - Lead capture table with CSV export tailored to export buyers (quantity, destination port, packaging) and digital support tickets.

---

## 2. Technology Stack

- **Frontend & Fullstack**: Next.js 14 App Router, React 18, TypeScript (strict mode), Tailwind CSS, Lucide icons.
- **Database & ORM**: PostgreSQL (Production) / SQLite (Local prototyping/testing), Prisma ORM v5.22.
- **Security**: AES-256-GCM authenticated encryption for stored credentials, bcrypt (12 rounds) for passwords, HttpOnly SameSite session cookies.
- **Deployment**: Multi-stage Dockerfile, Docker Compose with PostgreSQL 16 & persistent storage.

---

## 3. Quickstart & Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Step 1: Install Dependencies & Setup Environment
```bash
npm install
cp .env.example .env
```

Ensure your `.env` contains:
```env
DATABASE_URL="file:./dev.db"
ENCRYPTION_MASTER_KEY="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
JWT_SECRET="chat-platform-master-jwt-secret-key-32chars-min-prod"
NODE_ENV="development"
PORT=3000
APP_BASE_URL="http://localhost:3000"
```

### Step 2: Initialize Database & Seed
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

Default administrator seeded:
- **Email**: `admin@platform.local`
- **Password**: `AdminPassword123!`
- **Role**: `OWNER`

### Step 3: Run Automated Tests
```bash
npm test
```
All unit and integration tests (cryptography, SSRF guard, tenant isolation, PDF chunking, lead extraction, fallback engine) will execute and pass.

### Step 4: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## 4. Production Deployment with Docker Compose

To deploy 24/7 on an always-on server:

```bash
docker compose up -d --build
```

This starts:
1. `chatbot_postgres`: PostgreSQL 16 with persistent volume `postgres_data`.
2. `chatbot_web`: The Next.js dashboard and webhook receiver on port 3000.
3. `chatbot_worker`: The durable background message processor with auto-restart.

Check service status and logs:
```bash
docker compose ps
docker compose logs -f worker
```

---

## 5. Webhook Endpoints for Messaging Channels

### Meta WhatsApp Cloud API
- **Webhook Callback URL**: `https://your-domain.com/api/webhooks/whatsapp`
- **Verification Token**: Found in `/channels` dashboard (e.g. `athang_whatsapp_verify_token_2026`).
- **Signature Verification**: Validates incoming `x-hub-signature-256` HMAC header using your configured Meta App Secret.

### Telegram Bot API
- **Webhook URL**: `https://your-domain.com/api/webhooks/telegram?business=athang-impex` (or `benzwell`)
- **Secret Token**: Configured in `/channels` dashboard, verified via `x-telegram-bot-api-secret-token` header.

---

## 6. Health & Monitoring Endpoints

- **Liveness Probe**: `GET /api/health/live` &rarr; HTTP 200 `{ status: "live", uptime: ... }`
- **Readiness Probe**: `GET /api/health/ready` &rarr; HTTP 200 `{ status: "ready", database: "connected", queueBacklog: 0 }`
