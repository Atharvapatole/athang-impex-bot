import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Validates and gets the 32-byte master key from environment variables.
 */
function getMasterKey(): Buffer {
  const hexOrString = process.env.ENCRYPTION_MASTER_KEY;
  if (!hexOrString) {
    throw new Error("ENCRYPTION_MASTER_KEY is not defined in environment variables");
  }

  // If 64 hex characters (32 bytes)
  if (hexOrString.length === 64 && /^[0-9a-fA-F]+$/.test(hexOrString)) {
    return Buffer.from(hexOrString, "hex");
  }

  // If provided as raw string, hash it with SHA-256 to ensure exact 32-byte key
  return crypto.createHash("sha256").update(hexOrString).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM authenticated encryption.
 * Output format: iv:authTag:ciphertext (base64 encoded parts)
 */
export function encryptCredential(plaintext: string): string {
  if (!plaintext) return "";
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV standard for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return `${iv.toString("base64")}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 */
export function decryptCredential(encryptedData: string): string {
  if (!encryptedData) return "";
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format. Expected iv:authTag:ciphertext");
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const masterKey = getMasterKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextB64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Mask sensitive credentials for safe UI display (e.g. "sk-...ABCD")
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return "Not Configured";
  if (secret.length <= 8) return "••••••••";
  const start = secret.slice(0, 4);
  const end = secret.slice(-4);
  return `${start}••••••••${end}`;
}

/**
 * Secure password hashing using bcrypt.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/**
 * Verify password against bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Verifies Meta WhatsApp Cloud API HMAC-SHA256 signature.
 * Header: sha256=<signature>
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;

  const expectedSignature = parts[1];
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody);
  const calculatedSignature = hmac.digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(calculatedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison for Telegram secret tokens.
 */
export function verifyTelegramSecretToken(receivedToken?: string | null, configuredToken?: string | null): boolean {
  if (!receivedToken || !configuredToken) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(receivedToken), Buffer.from(configuredToken));
  } catch {
    return false;
  }
}
