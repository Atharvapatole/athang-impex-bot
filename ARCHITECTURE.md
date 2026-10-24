# Architecture & Technical Design Document

## Enterprise Multi-Business AI Chatbot Platform

### 1. Architectural Overview

```
                      +-----------------------------+
                      |   Inbound Channels Layer    |
                      |  WhatsApp Cloud API / Meta   |
                      |     Telegram Bot API        |
                      +--------------+--------------+
                                     |
               (Webhook POST with HMAC / Secret Header)
                                     v
                 +-----------------------------------+
                 |    API Webhook Handlers Layer     |
                 |  - Verify HMAC-SHA256 / Token     |
                 |  - Idempotency & Deduplication    |
                 |  - Fast HTTP 200 Acknowledgment   |
                 +-------------------+---------------+
                                     |
                                (Enqueue)
                                     v
                 +-----------------------------------+
                 |     Durable MessageJob Queue      |
                 |  - State: QUEUED -> PROCESSING    |
                 |  - Atomic Locking & Lease Renewal |
                 |  - Bounded Backoff with Jitter    |
                 +-------------------+---------------+
                                     |
                                (Worker Loop)
                                     v
                 +-----------------------------------+
                 |      Background Message Worker     |
                 +-------------------+---------------+
                                     |
            +------------------------+------------------------+
            |                                                 |
            v                                                 v
  +--------------------+                             +--------------------+
  |  Human Takeover?   |                             |   Lead Extractor   |
  |  If true: bypass   |                             |  - Buyer / Port    |
  |  auto AI response  |                             |  - Qty / Specs     |
  +---------+----------+                             +--------------------+
            | (If false)
            v
  +--------------------------------------------------+
  |    Tenant-Isolated Knowledge Retriever (BM25)   |
  |  - Filter by businessId strictly                 |
  |  - Lexical token score + phrase boost            |
  |  - Zero expensive external embedding API calls   |
  +-------------------------+------------------------+
                            |
                            v
  +--------------------------------------------------+
  |             Grounded Prompt Builder              |
  |  - Untrusted reference data guardrails           |
  |  - System & "When You Don't Know" instructions   |
  |  - Conversation history buffer                   |
  +-------------------------+------------------------+
                            |
                            v
  +--------------------------------------------------+
  |     3-Tier Deterministic AI Fallback Engine      |
  |                                                  |
  |   [ Priority 1: Groq (Llama 3.3 70B) ]           |
  |             | (Failover on error)                |
  |             v                                    |
  |   [ Priority 2: Mistral (Mistral Large) ]        |
  |             | (Failover on error)                |
  |             v                                    |
  |   [ Priority 3: Gemini (Gemini 1.5 Flash) ]      |
  |             | (Failover on error)                |
  |             v                                    |
  |   [ Safe Failure Fallback: Business Contacts ]   |
  +-------------------------+------------------------+
                            |
                            v
  +--------------------------------------------------+
  |             Outbound Channel Sender              |
  |  - Meta WhatsApp Graph API v21.0                 |
  |  - Telegram Bot API sendMessage                  |
  +--------------------------------------------------+
```

---

### 2. Multi-Tenant Business Isolation

The platform enforces strict logical multi-tenancy at the database and application levels:
- **Businesses Seeded**:
  - `ATHANG IMPEX` (`slug: athang-impex`): Merchant exporter of Dehydrated Onion Powder, Dehydrated Onion Flakes, Ginger Powder, Tomato Powder.
  - `BENZWELL` (`slug: benzwell`): Digital templates, design assets, licensing, and customer support.
- **Data Scoping**:
  - Knowledge chunks, channel credentials, system instructions, customer contacts, conversations, leads, and usage logs are scoped by foreign keys to `businessId`.
  - All queries include mandatory `WHERE businessId = ?` predicates. A query for ATHANG IMPEX cannot view or retrieve BENZWELL data.

---

### 3. Cryptographic Security Standards

1. **Master Key Authenticated Encryption (AES-256-GCM)**:
   - All third-party secrets (Meta Access Tokens, Telegram Bot Tokens, Groq/Mistral/Gemini API keys) are encrypted before writing to the database using AES-256-GCM.
   - Master key is provided via `ENCRYPTION_MASTER_KEY` (32 bytes).
   - In UI responses, all keys are masked (`••••••••`). Plaintext credentials are never transmitted to client browsers.
2. **Password Security**:
   - Administrator passwords are hashed with `bcrypt` (12 rounds) with individual salts.
3. **Session Authentication & CSRF**:
   - JWT tokens signed with `HS256` stored in `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) cookies.
4. **SSRF Guard on PDF Ingestion**:
   - Prevents Server-Side Request Forgery when administrators paste hosted PDF URLs.
   - Enforces HTTPS in production.
   - Validates IP resolution against RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), link-local/cloud metadata (`169.254.169.254`).

---

### 4. Deterministic 3-Tier AI Fallback Engine

The fallback engine provides 24/7 reliability:
1. **Tier 1 (Primary)**: **Groq** (`llama-3.3-70b-versatile`) — Ultra-low latency inference, high throughput.
2. **Tier 2 (Secondary)**: **Mistral** (`mistral-large-latest`) — Robust enterprise-grade multilingual performance.
3. **Tier 3 (Tertiary)**: **Google Gemini** (`gemini-1.5-flash`) — High-availability safety net.
4. **Safe Failure Fallback**:
   - If all upstream providers fail, the system outputs the business-specific safe failure message containing official company contact details (`info@athangimpex.in` / `+91 9923407176` for ATHANG IMPEX; `support@benzwell.in` for BENZWELL).
   - Never sends duplicate customer replies.
