// ===========================================================================
// Central env config + validation.
// Values are read + validated LAZILY (on first access), not at import time, so
// `next build` succeeds even before env vars are set on the host. A missing
// REQUIRED var only throws when a request actually needs it.
// ===========================================================================

// Always trim: pasting a value into a hosting dashboard often appends a stray
// newline/space, which silently breaks things like UUID casts (BUSINESS_ID).
function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseServiceKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },

  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get anthropicModel() {
    return optional("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");
  },

  get twilioAccountSid() {
    return required("TWILIO_ACCOUNT_SID");
  },
  get twilioAuthToken() {
    return required("TWILIO_AUTH_TOKEN");
  },
  get twilioWhatsAppFrom() {
    return required("TWILIO_WHATSAPP_FROM");
  },
  get twilioValidateSignature() {
    return optional("TWILIO_VALIDATE_SIGNATURE", "true") === "true";
  },

  get businessId() {
    return required("BUSINESS_ID");
  },
  get ownerWhatsApp() {
    return optional("OWNER_WHATSAPP");
  },
  get ownerEmail() {
    return optional("OWNER_EMAIL", "cyril.joseph@coco-samui-ai.com");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
  get appBaseUrl() {
    return optional("APP_BASE_URL", "http://localhost:3000");
  },
  // Empty when unset — auth fails closed (no default password).
  get dashboardPassword() {
    return optional("DASHBOARD_PASSWORD");
  },

  // --- Gmail (optional email channel) ---
  get gmailClientId() {
    return optional("GMAIL_CLIENT_ID");
  },
  get gmailClientSecret() {
    return optional("GMAIL_CLIENT_SECRET");
  },
  get gmailRefreshToken() {
    return optional("GMAIL_REFRESH_TOKEN");
  },
};

/** True only when all three Gmail OAuth secrets are present. */
export function gmailConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN
  );
}

// "whatsapp:+66..." helpers — Twilio prefixes WhatsApp numbers with "whatsapp:".
export function toWhatsAppAddress(e164: string): string {
  return e164.startsWith("whatsapp:") ? e164 : `whatsapp:${e164}`;
}

export function fromWhatsAppAddress(addr: string): string {
  return addr.replace(/^whatsapp:/, "");
}
