export class TelegramClient {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Diagnostic test checking bot token and status via getMe.
   */
  async testConnection(): Promise<{ success: boolean; botInfo?: any; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.ok) {
        return { success: false, error: data.description || "Telegram getMe failed" };
      }

      return { success: true, botInfo: data.result };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to reach Telegram API" };
    }
  }

  /**
   * Sets up webhook with Telegram using an optional secret token.
   */
  async setWebhook(
    webhookUrl: string,
    secretToken?: string
  ): Promise<{ success: boolean; description?: string; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`;
      const body: any = {
        url: webhookUrl,
        allowed_updates: ["message", "edited_message"],
        drop_pending_updates: false,
      };
      if (secretToken) body.secret_token = secretToken;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.ok) {
        return { success: false, error: data.description };
      }
      return { success: true, description: data.description };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Gets current webhook status and diagnostics from Telegram.
   */
  async getWebhookInfo(): Promise<{ success: boolean; info?: any; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getWebhookInfo`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.ok) {
        return { success: false, error: data.description || "getWebhookInfo failed" };
      }

      return { success: true, info: data.result };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to reach Telegram getWebhookInfo" };
    }
  }

  /**
   * Disconnects / deletes the webhook from Telegram.
   */
  async deleteWebhook(): Promise<{ success: boolean; description?: string; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      if (!data.ok) {
        return { success: false, error: data.description || "deleteWebhook failed" };
      }

      return { success: true, description: data.description };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to delete Telegram webhook" };
    }
  }

  /**
   * Sends an outbound message to a Telegram chat.
   */
  async sendTextMessage(
    chatId: string | number,
    text: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        return { success: false, error: data.description || "Telegram sendMessage failed" };
      }

      return { success: true, messageId: data.result?.message_id };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to send Telegram message" };
    }
  }
}
