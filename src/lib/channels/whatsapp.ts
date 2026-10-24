export interface WhatsAppCredentials {
  accessToken: string;
  appSecret: string;
}

export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(phoneNumberId: string, accessToken: string, apiVersion: string = "v21.0") {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
  }

  /**
   * Diagnostic test for Meta credentials and phone number verification without sending unsolicited messages.
   */
  async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.phoneNumberId || !this.accessToken) {
      return { success: false, error: "Phone Number ID and Access Token are required" };
    }

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        const errorMsg = data?.error?.message || `Meta Graph API returned HTTP ${res.status}`;
        const errorType = data?.error?.type || "OAuthException";
        return {
          success: false,
          error: `${errorType}: ${errorMsg}`,
        };
      }

      return {
        success: true,
        data: {
          verifiedName: data.verified_name || "N/A",
          displayPhoneNumber: data.display_phone_number || "N/A",
          qualityRating: data.quality_rating || "UNKNOWN",
          codeVerificationStatus: data.code_verification_status || "VERIFIED",
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to connect to Meta WhatsApp Cloud API" };
    }
  }

  /**
   * Sends an outbound text message via WhatsApp Cloud API.
   */
  async sendTextMessage(
    to: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      const cleanTo = to.replace(/[^\d]/g, "");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTo,
          type: "text",
          text: {
            preview_url: false,
            body: text,
          },
        }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (!res.ok) {
        const errorMsg = data?.error?.message || `Meta Graph API returned HTTP ${res.status}`;
        return { success: false, error: errorMsg };
      }

      const messageId = data.messages?.[0]?.id;
      return { success: true, messageId };
    } catch (err: any) {
      return { success: false, error: err.message || "Outbound WhatsApp send failed" };
    }
  }
}
