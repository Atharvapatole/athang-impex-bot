import { prisma } from "@/lib/prisma";
import { hashPassword, encryptCredential } from "@/lib/crypto";

export interface BootstrapResult {
  bootstrapped: boolean;
  adminCreated: boolean;
  businessCreated: boolean;
  aiConfigsCreated?: boolean;
  error?: string;
}

let isBootstrapping = false;

/**
 * Ensures that the production database has at least one administrator account,
 * the primary ATHANG IMPEX business profile, and canonical AI provider configs.
 *
 * This runs idempotently and non-destructively:
 * - It NEVER overwrites existing administrators or passwords.
 * - It only creates the default admin if 0 administrators exist in the database.
 * - It only creates the ATHANG IMPEX business if 0 businesses exist in the database.
 * - It creates missing fallback AI provider configs (Groq, Mistral, Gemini) if absent.
 */
export async function ensureAdministratorBootstrap(): Promise<BootstrapResult> {
  if (isBootstrapping) {
    return { bootstrapped: false, adminCreated: false, businessCreated: false };
  }

  isBootstrapping = true;
  try {
    let adminCreated = false;
    let businessCreated = false;
    let aiConfigsCreated = false;

    // 1. Check administrator count
    const adminCount = await prisma.administrator.count();
    if (adminCount === 0) {
      const email = (process.env.ADMIN_DEFAULT_EMAIL || "admin@platform.local").toLowerCase().trim();
      const password = process.env.ADMIN_DEFAULT_PASSWORD || "AdminPassword123!";
      const name = process.env.ADMIN_DEFAULT_NAME || "Platform Owner";

      const passwordHash = await hashPassword(password);

      await prisma.administrator.create({
        data: {
          email,
          name,
          passwordHash,
          role: "OWNER",
        },
      });

      adminCreated = true;
      console.log(`[Bootstrap] Initial administrator created: ${email}`);
    }

    // 2. Check business count
    let athangBiz = await prisma.business.findFirst({
      where: { slug: "athang-impex" },
    });

    if (!athangBiz) {
      const businessCount = await prisma.business.count();
      if (businessCount === 0) {
        athangBiz = await prisma.business.create({
          data: {
            slug: "athang-impex",
            name: "ATHANG IMPEX",
            description: "Merchant exporter of premium dehydrated agricultural products from India.",
            website: "https://athangimpex.in",
            email: "info@athangimpex.in",
            phone: "+91 9923407176",
            address: "Navi Mumbai / Nashik, Maharashtra, India",
            productsServices: "Dehydrated Onion Powder, Dehydrated Onion Flakes, Pure Ginger Powder, Spray-Dried Tomato Powder",
            businessHours: "Mon - Sat: 09:00 - 18:00 IST (UTC+5:30) | 24/7 AI Export Sales Assistant",
            supportedLanguages: "English, Hindi, Marathi",
            faq: "Q: What is the MOQ?\nA: Minimum 1 FCL (20ft container) or LCL air cargo for commercial sample batches.\n\nQ: What packaging sizes are available?\nA: 20kg / 25kg multi-wall paper bags with inner poly liner, or custom export cartons.\n\nQ: What are payment terms?\nA: Standard export terms: 30% advance T/T, balance against B/L copy, or 100% Confirmed Irrevocable L/C at sight.",
            timezone: "Asia/Kolkata",
            isActive: true,
            systemInstructions: `You are the official AI export sales representative for ATHANG IMPEX, a merchant exporter based in India.
Key Products:
1. Dehydrated Onion Powder (Premium grade, 80-100 mesh, moisture < 6%, free flowing, pungency preserved).
2. Dehydrated Onion Flakes / Minced (Commercial and A-grade, moisture < 5%, uniform size).
3. Ginger Powder (High gingerol aroma, fiber < 5%, moisture < 8%).
4. Tomato Powder (100% spray-dried/dehydrated natural tomato, rich red color, lycopene preserved).`,
            whenYouDontKnow: `For custom chemical parameters, spot CFR/CIF container freight rates, or custom packaging not detailed in the knowledge base, state: "For tailored commercial quotations, minimum order quantities, and custom lab specifications, our export manager will assist you directly. Please share your destination port and required tonnage, or contact us at info@athangimpex.in or +91 9923407176."`,
            welcomeMessage:
              "Welcome to ATHANG IMPEX! We are merchant exporters of premium Dehydrated Onion Powder, Onion Flakes, Ginger Powder, and Tomato Powder from India. How can we assist your business today?",
            safeFailureMessage:
              "Sorry, I'm temporarily unable to process your message. Please contact our export team directly at info@athangimpex.in or WhatsApp +91 9923407176 for immediate assistance.",
            humanHandoffMessage:
              "Your export enquiry has been transferred to our export sales team. An agent will be with you shortly.",
            closingMessage: "Thank you for contacting ATHANG IMPEX. Have a great day!",
          },
        });

        businessCreated = true;
        console.log("[Bootstrap] Initial ATHANG IMPEX business profile created");
      } else {
        athangBiz = await prisma.business.findFirst();
      }
    }

    // 3. Ensure Canonical AI Provider Configs for ATHANG IMPEX
    if (athangBiz) {
      const existingConfigs = await prisma.aIProviderConfig.findMany({
        where: { businessId: athangBiz.id },
      });
      const providersPresent = new Set(existingConfigs.map((c) => c.provider));

      const defaultTiers = [
        { provider: "GROQ", modelId: "llama-3.3-70b-versatile", priority: 1 },
        { provider: "MISTRAL", modelId: "mistral-large-latest", priority: 2 },
        { provider: "GEMINI", modelId: "gemini-1.5-flash", priority: 3 },
      ];

      for (const tier of defaultTiers) {
        if (!providersPresent.has(tier.provider)) {
          await prisma.aIProviderConfig.create({
            data: {
              businessId: athangBiz.id,
              provider: tier.provider,
              modelId: tier.modelId,
              priority: tier.priority,
              isEnabled: true,
              timeoutMs: 15000,
              maxTokens: 1024,
              temperature: 0.3,
              apiKeyEncrypted: encryptCredential("placeholder"),
              status: "NOT_CONFIGURED",
            },
          });
          aiConfigsCreated = true;
        }
      }
      if (aiConfigsCreated) {
        console.log("[Bootstrap] Default AI Provider Fallback chain configured for ATHANG IMPEX");
      }
    }

    return {
      bootstrapped: true,
      adminCreated,
      businessCreated,
      aiConfigsCreated,
    };
  } catch (error: any) {
    console.error("[Bootstrap Error]", error?.message || error);
    return {
      bootstrapped: false,
      adminCreated: false,
      businessCreated: false,
      error: error?.message || "Bootstrap failed",
    };
  } finally {
    isBootstrapping = false;
  }
}
