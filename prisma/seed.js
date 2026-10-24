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
  console.log("🌱 Seeding database...");

  // 1. Administrators
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 12);
  const admin = await prisma.administrator.upsert({
    where: { email: "admin@platform.local" },
    update: {},
    create: {
      email: "admin@platform.local",
      name: "Platform Owner",
      passwordHash: adminPasswordHash,
      role: "OWNER",
    },
  });

  const agentPasswordHash = await bcrypt.hash("AgentPassword123!", 12);
  await prisma.administrator.upsert({
    where: { email: "agent@platform.local" },
    update: {},
    create: {
      email: "agent@platform.local",
      name: "Support Specialist",
      passwordHash: agentPasswordHash,
      role: "SUPPORT_AGENT",
    },
  });

  console.log("✅ Administrators seeded (admin@platform.local / AdminPassword123!)");

  // 2. Business A: ATHANG IMPEX
  const athangImpex = await prisma.business.upsert({
    where: { slug: "athang-impex" },
    update: {},
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

  // Seed Knowledge Base for Athang Impex
  const athangKbSource = await prisma.knowledgeBaseSource.create({
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

  // Seed sample contact & lead for Athang Impex
  const athangContact = await prisma.contact.create({
    data: {
      businessId: athangImpex.id,
      channelType: "WHATSAPP",
      identifier: "+971501234567",
      displayName: "Tariq Al-Mansoor (Dubai Imports)",
    },
  });

  const athangConv = await prisma.conversation.create({
    data: {
      businessId: athangImpex.id,
      contactId: athangContact.id,
      channelType: "WHATSAPP",
      channelIdentifier: "+971501234567",
      status: "OPEN",
      isHumanTakeover: false,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: athangConv.id,
        senderType: "CUSTOMER",
        content: "Hello, we are looking for 15 MT of Dehydrated White Onion Powder shipped to Jebel Ali Port, Dubai.",
        state: "DELIVERED",
      },
      {
        conversationId: athangConv.id,
        senderType: "AI",
        content: "Hello Tariq! Thank you for contacting ATHANG IMPEX. We can supply premium 80-100 mesh White Onion Powder packed in 25kg multi-wall kraft bags. To prepare a formal quotation for Jebel Ali port, could you please confirm your company name, target delivery date, and whether you require CIF or FOB terms?",
        aiProviderUsed: "GROQ",
        modelUsed: "llama-3.3-70b-versatile",
        latencyMs: 640,
        state: "SENT",
      },
    ],
  });

  await prisma.lead.create({
    data: {
      businessId: athangImpex.id,
      contactId: athangContact.id,
      conversationId: athangConv.id,
      buyerName: "Tariq Al-Mansoor",
      company: "Gulf Spice & Foodstuffs LLC",
      country: "United Arab Emirates",
      destinationPort: "Jebel Ali Port, Dubai",
      productOfInterest: "Dehydrated Onion Powder",
      quantityAndUnit: "15 Metric Tons",
      packagingPreference: "25kg paper bags with PE liner",
      purchaseTimeline: "Within 30 days",
      emailOrPhone: "tariq@gulfspice.example.com",
      status: "QUALIFIED",
    },
  });

  // 3. Business B: BENZWELL
  const benzwell = await prisma.business.upsert({
    where: { slug: "benzwell" },
    update: {},
    create: {
      slug: "benzwell",
      name: "BENZWELL",
      description: "Digital products marketplace and software solutions platform.",
      website: "https://benzwell.in",
      email: "support@benzwell.in",
      phone: "+91 8000000000",
      timezone: "Asia/Kolkata",
      isActive: true,
      systemInstructions: `You are the AI customer support assistant for BENZWELL, an online digital products and software store.
Products include:
- Digital templates, UI kits, development boilerplates, design assets, and productivity plugins.
Your role:
- Answer questions regarding digital product features, file compatibility, license terms (Single vs Extended License), and download access.
- Assist users with account login troubleshooting, downloading purchased files, and license key activation.
- Never guess or invent payment transactions, discount codes, refund approvals, or proprietary source code.
- If a customer asks about a specific refund or failed payment, ask for their Order ID and instruct them to email support@benzwell.in.`,
      whenYouDontKnow: `For account-specific billing transactions, unreleased products, or custom enterprise licensing, state: "For privacy and payment security, specific orders and account billing are handled by our dedicated support desk. Please email support@benzwell.in with your Order ID or registered email."`,
      welcomeMessage: `Welcome to BENZWELL Support! How can we assist you with our digital products or your account today?`,
      safeFailureMessage: `Sorry, our automated support system is momentarily busy. Please contact support@benzwell.in and our team will get right back to you.`,
      humanHandoffMessage: `Your issue has been escalated to a BENZWELL support specialist. We will respond shortly.`,
      closingMessage: `Thank you for choosing BENZWELL. Happy creating!`,
    },
  });

  // Seed Knowledge Base for Benzwell
  const benzwellKbSource = await prisma.knowledgeBaseSource.create({
    data: {
      businessId: benzwell.id,
      sourceUrl: "https://benzwell.in/docs/customer_faq_and_support_guide.pdf",
      name: "BENZWELL Customer FAQ & License Guide",
      status: "INDEXED",
      fileSizeBytes: 180000,
      pageCount: 3,
      chunkCount: 2,
      extractedPreview: "BENZWELL Digital Products - Customer Guide, Downloads and License Terms...",
      lastSyncedAt: new Date(),
    },
  });

  await prisma.knowledgeBaseChunk.createMany({
    data: [
      {
        businessId: benzwell.id,
        sourceId: benzwellKbSource.id,
        chunkIndex: 0,
        pageNumber: 1,
        content: `BENZWELL Licensing Overview:
1. Standard Personal/Single License:
- Use in 1 end product for personal or single commercial project.
- Cannot be redistributed or resold as standalone assets.
2. Extended / Commercial License:
- Use in unlimited commercial client projects or SaaS products.
- Includes lifetime updates and priority email support.
All digital downloads include complete documentation, Figma/source assets, and clean code.`,
        tokenEstimate: 85,
      },
      {
        businessId: benzwell.id,
        sourceId: benzwellKbSource.id,
        chunkIndex: 1,
        pageNumber: 2,
        content: `BENZWELL Download and Access Troubleshooting:
- Accessing Purchases: Log in to benzwell.in/dashboard -> My Downloads. Download links remain active 24/7.
- Expired Download Links: If your session timed out, click 'Resend Access Token' on the login screen.
- Refund Policy: 14-day refund window for technical defects that cannot be resolved by support.
- Contact: support@benzwell.in for all order escalations.`,
        tokenEstimate: 95,
      },
    ],
  });

  // 4. Seed AI Provider Configurations (Global Defaults + Business Configs)
  const providers = [
    {
      provider: "GROQ",
      modelId: "llama-3.3-70b-versatile",
      priority: 1,
      isEnabled: true,
      timeoutMs: 15000,
      maxTokens: 1024,
      temperature: 0.3,
      apiKeyEncrypted: encryptCredential("gsk_placeholder_test_key_groq"),
      status: "CONFIGURED",
    },
    {
      provider: "MISTRAL",
      modelId: "mistral-large-latest",
      priority: 2,
      isEnabled: true,
      timeoutMs: 15000,
      maxTokens: 1024,
      temperature: 0.3,
      apiKeyEncrypted: encryptCredential("mistral_placeholder_test_key"),
      status: "CONFIGURED",
    },
    {
      provider: "GEMINI",
      modelId: "gemini-1.5-flash",
      priority: 3,
      isEnabled: true,
      timeoutMs: 15000,
      maxTokens: 1024,
      temperature: 0.3,
      apiKeyEncrypted: encryptCredential("gemini_placeholder_test_key"),
      status: "CONFIGURED",
    },
  ];

  for (const p of providers) {
    await prisma.aIProviderConfig.create({
      data: {
        ...p,
        businessId: athangImpex.id,
      },
    });
    await prisma.aIProviderConfig.create({
      data: {
        ...p,
        businessId: benzwell.id,
      },
    });
  }

  // 5. Seed Channels
  await prisma.channelIntegration.create({
    data: {
      businessId: athangImpex.id,
      channelType: "WHATSAPP",
      name: "ATHANG Official WhatsApp",
      isEnabled: true,
      phoneNumberId: "109876543210987",
      wabaId: "987654321098765",
      webhookVerifyToken: "athang_whatsapp_verify_token_2026",
      credentialsEncrypted: encryptCredential(JSON.stringify({
        accessToken: "EAAB_placeholder_whatsapp_token",
        appSecret: "meta_app_secret_placeholder_12345",
      })),
      status: "CONFIGURED",
    },
  });

  await prisma.channelIntegration.create({
    data: {
      businessId: athangImpex.id,
      channelType: "TELEGRAM",
      name: "ATHANG Export Bot",
      isEnabled: true,
      botUsername: "AthangImpexBot",
      webhookSecretToken: "athang_telegram_secret_99234",
      credentialsEncrypted: encryptCredential(JSON.stringify({
        botToken: "123456789:AAH_placeholder_telegram_token_athang",
      })),
      status: "CONFIGURED",
    },
  });

  await prisma.channelIntegration.create({
    data: {
      businessId: benzwell.id,
      channelType: "TELEGRAM",
      name: "Benzwell Support Bot",
      isEnabled: true,
      botUsername: "BenzwellSupportBot",
      webhookSecretToken: "benzwell_telegram_secret_80000",
      credentialsEncrypted: encryptCredential(JSON.stringify({
        botToken: "987654321:BBH_placeholder_telegram_token_benzwell",
      })),
      status: "CONFIGURED",
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
