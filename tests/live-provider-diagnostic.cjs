const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function getMasterKey() {
  const hex = process.env.ENCRYPTION_MASTER_KEY || "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
  return Buffer.from(hex, "hex");
}

function decryptCredential(encryptedData) {
  if (!encryptedData) return "";
  const parts = encryptedData.split(":");
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const masterKey = getMasterKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  let decrypted = decipher.update(ciphertextB64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function sanitize(text) {
  if (!text) return "";
  return text.replace(/gsk_[a-zA-Z0-9_-]+/g, "[REDACTED_KEY]")
             .replace(/AIza[a-zA-Z0-9_-]+/g, "[REDACTED_KEY]")
             .replace(/[a-zA-Z0-9_-]{30,}/g, "[REDACTED_SECRET]");
}

async function runLiveProbe() {
  console.log("=== RUNNING LIVE REAL API PROBE (DISTINCT PROVIDERS) ===\n");

  const providers = ["GROQ", "MISTRAL", "GEMINI"];
  const results = [];

  for (const provName of providers) {
    const config = await prisma.aIProviderConfig.findFirst({
      where: { provider: provName },
    });

    if (!config) continue;

    const rawKey = decryptCredential(config.apiKeyEncrypted);
    const modelId = config.modelId;

    console.log(`Sending live request to ${provName} (Model: ${modelId})...`);

    const start = Date.now();
    let httpStatus = null;
    let latencyMs = 0;
    let usage = "None";
    let statusDetail = "";
    let isLiveSuccess = false;

    try {
      if (provName === "GROQ") {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${rawKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        });
        latencyMs = Date.now() - start;
        httpStatus = res.status;
        const text = await res.text();
        if (res.ok) {
          const data = JSON.parse(text);
          usage = `${data.usage?.prompt_tokens} prompt / ${data.usage?.completion_tokens} comp`;
          isLiveSuccess = true;
          statusDetail = "OK";
        } else {
          statusDetail = sanitize(text.slice(0, 150));
        }
      } else if (provName === "MISTRAL") {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${rawKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        });
        latencyMs = Date.now() - start;
        httpStatus = res.status;
        const text = await res.text();
        if (res.ok) {
          const data = JSON.parse(text);
          usage = `${data.usage?.prompt_tokens} prompt / ${data.usage?.completion_tokens} comp`;
          isLiveSuccess = true;
          statusDetail = "OK";
        } else {
          statusDetail = sanitize(text.slice(0, 150));
        }
      } else if (provName === "GEMINI") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(rawKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        });
        latencyMs = Date.now() - start;
        httpStatus = res.status;
        const text = await res.text();
        if (res.ok) {
          const data = JSON.parse(text);
          usage = `${data.usageMetadata?.promptTokenCount} prompt / ${data.usageMetadata?.candidatesTokenCount} comp`;
          isLiveSuccess = true;
          statusDetail = "OK";
        } else {
          statusDetail = sanitize(text.slice(0, 150));
        }
      }
    } catch (err) {
      latencyMs = Date.now() - start;
      statusDetail = err.message;
    }

    results.push({
      provider: provName,
      modelId,
      liveRequest: true,
      httpStatus,
      latencyMs,
      usage,
      isLiveSuccess,
      statusDetail: statusDetail.trim(),
    });

    console.log(`  -> HTTP ${httpStatus} (${latencyMs}ms): ${statusDetail.trim()}`);
  }

  console.log("\n=== SUMMARY TABLE DATA ===");
  console.log(JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

runLiveProbe().catch(console.error);
