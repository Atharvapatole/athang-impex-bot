const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function getMasterKey() {
  const hexOrString = process.env.ENCRYPTION_MASTER_KEY || "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
  if (hexOrString.length === 64 && /^[0-9a-fA-F]+$/.test(hexOrString)) {
    return Buffer.from(hexOrString, "hex");
  }
  return crypto.createHash("sha256").update(hexOrString).digest();
}

function encryptCredential(plaintext) {
  if (!plaintext) return "";
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return `${iv.toString("base64")}:${authTag}:${ciphertext}`;
}

async function main() {
  console.log("🌱 Seeding database for ATHANG IMPEX...");

  // 1. Administrators
  const defaultAdminEmail = (process.env.ADMIN_DEFAULT_EMAIL || "admin@platform.local").toLowerCase().trim();
  const defaultAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "AdminPassword123!";
  const adminPasswordHash = await bcrypt.hash(defaultAdminPassword, 12);

  await prisma.administrator.upsert({
    where: { email: defaultAdminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: "OWNER",
    },
    create: {
      email: defaultAdminEmail,
      name: "Platform Owner",
      passwordHash: adminPasswordHash,
      role: "OWNER",
    },
  });

  const agentPasswordHash = await bcrypt.hash("AgentPassword123!", 12);
  await prisma.administrator.upsert({
    where: { email: "agent@platform.local" },
    update: {
      passwordHash: agentPasswordHash,
    },
    create: {
      email: "agent@platform.local",
      name: "Support Specialist",
      passwordHash: agentPasswordHash,
      role: "SUPPORT_AGENT",
    },
  });

  console.log(`✅ Administrators seeded (${defaultAdminEmail} / ${defaultAdminPassword})`);

  // 2. Business: ATHANG IMPEX (Single Business Only)
  const athangImpex = await prisma.business.upsert({
    where: { slug: "athang-impex" },
    update: {
      name: "ATHANG IMPEX",
      description: "Merchant exporter of premium dehydrated agricultural products from India.",
      website: "https://athangimpex.in",
      email: "info@athangimpex.in",
      phone: "+91 9923407176",
      timezone: "Asia/Kolkata",
      isActive: true,
    },
    create: {
      slug: "athang-impex",
      name: "ATHANG IMPEX",
      description: "Merchant exporter of premium dehydrated agricultural products from India.",
      website: "https://athangimpex.in",
      email: "info@athangimpex.in",
      phone: "+91 9923407176",
      timezone: "Asia/Kolkata",
      isActive: true,
      systemInstructions: `You are the official AI export sales representative for ATHANG IMPEX, a merchant exporter based in India.
Key Products:
1. Dehydrated Onion Powder (Premium grade, 80-100 mesh, moisture < 6%, free flowing, pungency preserved).
2. Dehydrated Onion Flakes / Minced (Commercial and A-grade, moisture < 5%, uniform size).
3. Ginger Powder (High gingerol aroma, fiber < 5%, moisture < 8%).
4. Tomato Powder (100% spray-dried/dehydrated natural tomato, rich red color, lycopene preserved).

Your role:
- Assist international buyers (food processors, spice blenders, importers, trading houses).
- Collect export enquiry details: company name, country, destination sea/air port, target quantity (in metric tons or kg), packaging requirements (e.g. 25kg paper bags or cartons with inner liner), and required delivery schedule.
- Ground all facts in the approved knowledge base. Never invent spot prices, certifications, or container shipping rates without explicit mention in knowledge base.
- If specific quotation is required, note the enquiry details and assure them our export desk will issue a formal proforma quotation.`,
      whenYouDontKnow: `For custom chemical parameters, spot CFR/CIF container freight rates, or custom packaging not detailed in the knowledge base, state: "For tailored commercial quotations, minimum order quantities, and custom lab specifications, our export manager will assist you directly. Please share your destination port and required tonnage, or contact us at info@athangimpex.in or +91 9923407176."`,
      welcomeMessage: `Welcome to ATHANG IMPEX! We are merchant exporters of premium Dehydrated Onion Powder, Onion Flakes, Ginger Powder, and Tomato Powder from India. How can we assist your business today?`,
      safeFailureMessage: `Sorry, I'm temporarily unable to process your message. Please contact our export team directly at info@athangimpex.in or WhatsApp +91 9923407176 for immediate assistance.`,
      humanHandoffMessage: `Your export enquiry has been transferred to our export sales team. An agent will be with you shortly.`,
      closingMessage: `Thank you for contacting ATHANG IMPEX. Have a great day!`,
    },
  });

  // 3. Knowledge Base for Athang Impex
  const existingKbSource = await prisma.knowledgeBaseSource.findFirst({
    where: { businessId: athangImpex.id },
  });

  let athangKbSource = existingKbSource;
  if (!existingKbSource) {
    athangKbSource = await prisma.knowledgeBaseSource.create({
      data: {
        businessId: athangImpex.id,
        sourceUrl: "https://athangimpex.in/docs/athang_impex_product_catalog.pdf",
        name: "ATHANG IMPEX Export Catalog & Product Specifications",
        status: "INDEXED",
        fileSizeBytes: 245000,
        pageCount: 4,
        chunkCount: 3,
        extractedPreview: "ATHANG IMPEX - Exporter of Premium Dehydrated Onion, Ginger & Tomato Products...",
        lastSyncedAt: new Date(),
      },
    });

    await prisma.knowledgeBaseChunk.createMany({
      data: [
        {
          businessId: athangImpex.id,
          sourceId: athangKbSource.id,
          chunkIndex: 0,
          pageNumber: 1,
          content: `ATHANG IMPEX Product Line:
1. Dehydrated Onion Powder:
- Color: Creamy white to pale yellow.
- Particle Size: 80 to 100 mesh.
- Moisture Content: Under 5.5%.
- Application: Seasoning mixes, dry soups, sauces, meat processing, snack coatings.
- Standard Packing: 20 kg or 25 kg multi-wall kraft paper bags with food-grade polyethylene inner liner.
- Shelf Life: 24 months stored in cool, dry conditions away from direct sunlight.`,
          tokenEstimate: 95,
        },
        {
          businessId: athangImpex.id,
          sourceId: athangKbSource.id,
          chunkIndex: 1,
          pageNumber: 2,
          content: `ATHANG IMPEX Dehydrated Onion Flakes & Minced Onion:
- Size: Flakes (10-25mm), Minced (1-3mm), Chopped (3-5mm).
- Raw Material: Fresh Indian white and red onions sourced from prime agricultural belts.
- Total Ash: Max 4.0%, Acid Insoluble Ash: Max 0.5%.
- Standard Export Packaging: Corrugated cartons (15-20 kg net weight) with double-sealed LDPE inner liner.
- Container Loading: Approx 7-8 MT in 20ft FCL, 15-16 MT in 40ft HC FCL depending on carton packing.`,
          tokenEstimate: 110,
        },
        {
          businessId: athangImpex.id,
          sourceId: athangKbSource.id,
          chunkIndex: 2,
          pageNumber: 3,
          content: `ATHANG IMPEX Ginger Powder & Tomato Powder:
- Ginger Powder: Sun-dried and kiln-dried ginger root pulverized to fine powder (60-80 mesh). Strong pungency, fiber < 4%, moisture < 7%.
- Tomato Powder: Spray dried from ripe red tomato puree. Free flowing, vibrant natural red, soluble in water to reconstitute tomato paste or soup. Moisture < 4%.
- Export Origin: India. Ports of loading: Nhava Sheva (JNPT) / Mundra Port.
- Minimum Order Quantity (MOQ): 1 MT for LCL shipments, or 20ft FCL for standard sea freight.`,
          tokenEstimate: 125,
        },
      ],
    });
  }

  // 4. AI Provider Configurations for Athang Impex
  const existingProviders = await prisma.aIProviderConfig.count({
    where: { businessId: athangImpex.id },
  });

  if (existingProviders === 0) {
    const providers = [
      {
        provider: "GROQ",
        modelId: "llama-3.3-70b-versatile",
        priority: 1,
        isEnabled: true,
        timeoutMs: 15000,
        maxTokens: 1024,
        temperature: 0.3,
        apiKeyEncrypted: encryptCredential(process.env.GROQ_API_KEY || "gsk_placeholder_test_key_groq"),
        status: process.env.GROQ_API_KEY ? "CONFIGURED" : "PENDING",
      },
      {
        provider: "MISTRAL",
        modelId: "mistral-large-latest",
        priority: 2,
        isEnabled: true,
        timeoutMs: 15000,
        maxTokens: 1024,
        temperature: 0.3,
        apiKeyEncrypted: encryptCredential(process.env.MISTRAL_API_KEY || "mistral_placeholder_test_key"),
        status: process.env.MISTRAL_API_KEY ? "CONFIGURED" : "PENDING",
      },
      {
        provider: "GEMINI",
        modelId: "gemini-1.5-flash",
        priority: 3,
        isEnabled: true,
        timeoutMs: 15000,
        maxTokens: 1024,
        temperature: 0.3,
        apiKeyEncrypted: encryptCredential(process.env.GEMINI_API_KEY || "gemini_placeholder_test_key"),
        status: process.env.GEMINI_API_KEY ? "CONFIGURED" : "PENDING",
      },
    ];

    for (const p of providers) {
      await prisma.aIProviderConfig.create({
        data: {
          ...p,
          businessId: athangImpex.id,
        },
      });
    }
  }

  // 5. Channel Integrations for Athang Impex
  const existingChannels = await prisma.channelIntegration.count({
    where: { businessId: athangImpex.id },
  });

  if (existingChannels === 0) {
    await prisma.channelIntegration.create({
      data: {
        businessId: athangImpex.id,
        channelType: "WHATSAPP",
        name: "ATHANG Official WhatsApp",
        isEnabled: true,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "109876543210987",
        wabaId: process.env.WHATSAPP_WABA_ID || "987654321098765",
        webhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "athang_whatsapp_verify_token_2026",
        credentialsEncrypted: encryptCredential(
          JSON.stringify({
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "EAAB_placeholder_whatsapp_token",
            appSecret: process.env.WHATSAPP_APP_SECRET || "meta_app_secret_placeholder_12345",
          })
        ),
        status: process.env.WHATSAPP_ACCESS_TOKEN ? "CONFIGURED" : "PENDING",
      },
    });

    await prisma.channelIntegration.create({
      data: {
        businessId: athangImpex.id,
        channelType: "TELEGRAM",
        name: "ATHANG Export Bot",
        isEnabled: true,
        botUsername: process.env.TELEGRAM_BOT_USERNAME || "AthangImpexBot",
        webhookSecretToken: process.env.TELEGRAM_SECRET_TOKEN || "athang_telegram_secret_99234",
        credentialsEncrypted: encryptCredential(
          JSON.stringify({
            botToken: process.env.TELEGRAM_BOT_TOKEN || "123456789:AAH_placeholder_telegram_token_athang",
          })
        ),
        status: process.env.TELEGRAM_BOT_TOKEN ? "CONFIGURED" : "PENDING",
      },
    });
  }

  console.log("✅ ATHANG IMPEX seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
