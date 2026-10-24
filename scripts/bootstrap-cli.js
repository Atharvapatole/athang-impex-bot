const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const path = require("path");

// Ensure prepare-prisma has run
require(path.join(__dirname, "prepare-prisma.js"));

const prisma = new PrismaClient();

// Helper to parse CLI arguments like --email foo@bar.com --password secret --reset-password
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--reset-password") {
      options.resetPassword = true;
    } else if (args[i].startsWith("--") && i + 1 < args.length) {
      const key = args[i].slice(2);
      options[key] = args[i + 1];
      i++;
    }
  }
  return options;
}

async function main() {
  console.log("🔒 Checking administrator accounts and business bootstrap...");
  const cliArgs = parseArgs();

  try {
    const adminCount = await prisma.administrator.count();
    const email = (cliArgs.email || process.env.ADMIN_DEFAULT_EMAIL || "admin@platform.local").toLowerCase().trim();
    const password = cliArgs.password || process.env.ADMIN_DEFAULT_PASSWORD || "AdminPassword123!";
    const name = cliArgs.name || process.env.ADMIN_DEFAULT_NAME || "Platform Owner";

    if (adminCount > 0) {
      if (cliArgs.resetPassword) {
        // Explicit password update requested by operator
        const existing = await prisma.administrator.findUnique({ where: { email } });
        if (!existing) {
          console.error(`❌ Cannot reset password: administrator with email "${email}" not found.`);
          process.exit(1);
        }
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.administrator.update({
          where: { email },
          data: { passwordHash, updatedAt: new Date() },
        });
        console.log(`✅ Successfully updated password for administrator: ${email}`);
      } else {
        const existingAdmins = await prisma.administrator.findMany({
          select: { email: true, name: true, role: true, createdAt: true },
        });
        console.log(`✅ Database already has ${adminCount} administrator account(s):`);
        for (const a of existingAdmins) {
          console.log(`   - ${a.email} (${a.role}) - created: ${a.createdAt.toISOString()}`);
        }
        console.log("ℹ️  Existing credentials and passwords were left intact (non-destructive).");
        console.log("ℹ️  To rotate an existing administrator password, run:");
        console.log("   node scripts/bootstrap-cli.js --reset-password --email <email> --password <newPassword>");
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 12);

      const created = await prisma.administrator.create({
        data: {
          email,
          name,
          passwordHash,
          role: "OWNER",
        },
      });

      console.log(`✅ Successfully bootstrapped initial administrator:`);
      console.log(`   - Email: ${created.email}`);
      console.log(`   - Name: ${created.name}`);
      console.log(`   - Role: ${created.role}`);
      console.log(`   - Id: ${created.id}`);
      console.log(`ℹ️  Password set securely (hash stored, credentials not printed).`);
    }

    // 2. Ensure ATHANG IMPEX business exists
    const businessCount = await prisma.business.count();
    if (businessCount === 0) {
      const business = await prisma.business.create({
        data: {
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
      console.log(`✅ Bootstrapped primary business: ${business.name} (${business.slug})`);
    } else {
      const b = await prisma.business.findFirst({ select: { name: true, slug: true } });
      console.log(`✅ Business profile already exists: ${b.name} (${b.slug})`);
    }
  } catch (err) {
    console.error("❌ Administrator bootstrap failed:", err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
