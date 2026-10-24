import { ExtractedLeadData } from "../types";

export class LeadExtractor {
  /**
   * Extracts lead parameters from customer message text based on business context.
   */
  static extractLeadDetails(businessSlug: string, text: string): ExtractedLeadData {
    const data: ExtractedLeadData = {};
    const lower = text.toLowerCase();

    // 1. Email extraction
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      data.emailOrPhone = emailMatch[0];
    }

    // 2. Phone extraction (international format)
    const phoneMatch = text.match(/(?:\+|00)[1-9]\d{1,14}/);
    if (phoneMatch && !data.emailOrPhone) {
      data.emailOrPhone = phoneMatch[0];
    }

    if (businessSlug === "athang-impex") {
      // Products of interest
      if (lower.includes("onion powder") || lower.includes("white onion powder") || lower.includes("red onion powder")) {
        data.productOfInterest = "Dehydrated Onion Powder";
      } else if (lower.includes("onion flake") || lower.includes("minced onion") || lower.includes("chopped onion")) {
        data.productOfInterest = "Dehydrated Onion Flakes";
      } else if (lower.includes("ginger powder") || lower.includes("dry ginger")) {
        data.productOfInterest = "Ginger Powder";
      } else if (lower.includes("tomato powder")) {
        data.productOfInterest = "Tomato Powder";
      }

      // Quantity pattern: e.g. "15 MT", "20 tons", "5000 kg", "1 container", "20ft"
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mt|metric\s*tons?|tons?|kgs?|kilograms?|containers?|fcl)/i);
      if (qtyMatch) {
        data.quantityAndUnit = qtyMatch[0];
      }

      // Destination Port or Country
      const portMatch = text.match(/(?:port|destination|cif|cfr|shipped to|delivery to)\s+([a-zA-Z\s,]+?)(?:\.|\n|$|,|\sfor|\swith)/i);
      if (portMatch) {
        data.destinationPort = portMatch[1].trim();
      }

      // Packaging preference
      if (lower.includes("25kg") || lower.includes("25 kg") || lower.includes("paper bag") || lower.includes("kraft")) {
        data.packagingPreference = "25kg kraft paper bags";
      } else if (lower.includes("carton") || lower.includes("box")) {
        data.packagingPreference = "Cartons with PE liner";
      }

      // Timeline
      if (lower.includes("urgent") || lower.includes("immediate") || lower.includes("asap")) {
        data.purchaseTimeline = "Immediate";
      } else if (lower.includes("month") || lower.includes("30 days")) {
        data.purchaseTimeline = "Within 30 days";
      }
    } else if (businessSlug === "benzwell") {
      // Order reference: e.g. "#12345", "ORD-9876", "Order 5432"
      const orderMatch = text.match(/(?:order\s*#?|ord-|order\s+id\s*:?\s*)([A-Z0-9-]{4,15})/i);
      if (orderMatch) {
        data.orderReference = orderMatch[1];
      }

      // Support topics
      if (lower.includes("download") || lower.includes("access") || lower.includes("link")) {
        data.supportTopic = "Download & File Access";
      } else if (lower.includes("refund") || lower.includes("charge") || lower.includes("billing")) {
        data.supportTopic = "Billing & Refund";
      } else if (lower.includes("license") || lower.includes("commercial")) {
        data.supportTopic = "Licensing Inquiry";
      } else {
        data.supportTopic = "General Support";
      }

      data.supportIssue = text.slice(0, 200);
    }

    return data;
  }
}
