# Production Deployment & Readiness Checklist

Use this checklist prior to launching the platform on a production server.

---

### Phase 1: Environment & Secrets Configuration

- [ ] **Generate 32-Byte Master Encryption Key**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Set this 64-character hex string as `ENCRYPTION_MASTER_KEY` in production environment variables. Never commit this key to version control.
- [ ] **Generate Strong JWT Secret**:
  Set a cryptographically random secret (minimum 32 characters) for `JWT_SECRET`.
- [ ] **Database Connection String**:
  Set `DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"`.
- [ ] **Change Default Admin Password**:
  Log into `/settings/security` or run a database update to change `admin@platform.local`'s initial password from `AdminPassword123!`.

---

### Phase 2: Official Channel Integrations Setup

#### 1. Meta WhatsApp Cloud API
- [ ] Create a Meta Developer App under [Meta for Developers](https://developers.facebook.com/).
- [ ] Add the **WhatsApp** product.
- [ ] Under **API Setup**, retrieve your:
  - Phone Number ID
  - WhatsApp Business Account ID (WABA ID)
  - Temporary or Permanent System User Access Token
- [ ] Under **Configuration > Webhook**:
  - Callback URL: `https://your-domain.com/api/webhooks/whatsapp`
  - Verify Token: Enter your configured verify token (e.g., `athang_whatsapp_verify_token_2026`).
  - Webhook Fields Subscription: Select `messages`.
- [ ] In `/channels` dashboard:
  - Enter Phone Number ID and Access Token.
  - Click **Test Connection** to verify with Meta Graph API.

#### 2. Telegram Bot API
- [ ] Open Telegram and message `@BotFather`.
- [ ] Use `/newbot` to create your business bot and copy the HTTP API Token.
- [ ] In `/channels` dashboard:
  - Enter the Telegram HTTP API Token.
  - Set a secret token for header verification (`x-telegram-bot-api-secret-token`).
  - Set Webhook URL to: `https://your-domain.com/api/webhooks/telegram?business=athang-impex` (or `benzwell`).
  - Click **Test Connection** to verify with `getMe`.

---

### Phase 3: AI Provider Fallback Setup

- [ ] **Groq (Priority 1)**:
  - Create free account on [Groq Console](https://console.groq.com/).
  - Create API Key and save under `/ai-providers` for `llama-3.3-70b-versatile`.
  - Click **Test Ping** to verify latency.
- [ ] **Mistral AI (Priority 2)**:
  - Create API Key on [Mistral Console](https://console.mistral.ai/).
  - Enter under `/ai-providers` for `mistral-large-latest`.
  - Click **Test Ping**.
- [ ] **Google Gemini (Priority 3)**:
  - Create API Key on [Google AI Studio](https://aistudio.google.com/).
  - Enter under `/ai-providers` for `gemini-1.5-flash`.
  - Click **Test Ping**.

---

### Phase 4: Knowledge Base Ingestion

- [ ] Host product catalog PDFs on a reliable public HTTPS URL (e.g. `https://athangimpex.in/catalog.pdf`).
- [ ] In `/knowledge-base`, enter the PDF URL and click **Fetch and Process PDF**.
- [ ] Verify extracted preview and chunk count.
- [ ] Run the **Retrieval Simulator** with sample customer inquiries (e.g., "What is the moisture content of your dehydrated onion powder?") and confirm top chunks match.

---

### Phase 5: Server Deployment & 24/7 Operations

- [ ] Deploy with Docker Compose:
  ```bash
  docker compose up -d --build
  ```
- [ ] Verify health endpoints:
  - `curl -I https://your-domain.com/api/health/live` (should return HTTP 200)
  - `curl -I https://your-domain.com/api/health/ready` (should return HTTP 200)
- [ ] Ensure background worker (`scripts/worker.js` or `chatbot_worker` container) is continuously running with restart policy `unless-stopped`.
- [ ] Configure HTTPS / SSL using Caddy, Nginx, or Cloudflare with modern TLS 1.3 ciphers.
