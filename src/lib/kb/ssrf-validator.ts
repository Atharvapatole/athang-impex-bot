import dns from "dns/promises";
import net from "net";

/**
 * Checks if an IP address is a private, loopback, link-local, or cloud metadata address.
 */
export function isForbiddenIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [p0, p1] = parts;

    // Loopback 127.0.0.0/8
    if (p0 === 127) return true;

    // 0.0.0.0/8
    if (p0 === 0) return true;

    // RFC 1918 Private ranges:
    // 10.0.0.0/8
    if (p0 === 10) return true;
    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16
    if (p0 === 192 && p1 === 168) return true;

    // Link-local / Cloud metadata (AWS, GCP, Azure, DigitalOcean) 169.254.0.0/16
    if (p0 === 169 && p1 === 254) return true;

    // Multicast & Broadcast
    if (p0 >= 224) return true;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // Unspecified
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    // Unique local address fc00::/7
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // Link local fe80::/10
    if (lower.startsWith("fe80") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a target URL against SSRF attacks.
 * Verifies scheme (HTTP/HTTPS; HTTPS-only in production), resolves hostname,
 * and confirms IP is strictly public.
 */
export async function validateSafePdfUrl(urlString: string): Promise<{ safeUrl: URL }> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Scheme validation
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && parsed.protocol !== "https:") {
    throw new Error("Only secure HTTPS URLs are permitted in production for PDF ingestion");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject obvious local hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Access to local and internal hostnames is prohibited");
  }

  // Resolve DNS to verify IP addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Could not resolve hostname: ${hostname}`);
    }

    for (const record of addresses) {
      if (isForbiddenIp(record.address)) {
        throw new Error(
          `Security violation: Target resolves to restricted or private IP address (${record.address})`
        );
      }
    }
  } catch (err: any) {
    if (err.message.includes("Security violation") || err.message.includes("restricted")) {
      throw err;
    }
    throw new Error(`DNS resolution failed for hostname: ${hostname}`);
  }

  return { safeUrl: parsed };
}
