// ===========================================================================
// Central env config + validation.
// Values are read + validated LAZILY (on first access), not at import time, so
// `next build` succeeds even before env vars are set on the host. A missing
// REQUIRED var only throws when a request actually needs it.
// ===========================================================================

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
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
  get cronSecret() {
    return optional("CRON_SECRET");
  },
  get appBaseUrl() {
    return optional("APP_BASE_URL", "http://localhost:3000");
  },
  get dashboardPassword() {
    return optional("DASHBOARD_PASSWORD", "change-me");
  },
};

// "whatsapp:+66..." helpers — Twilio prefixes WhatsApp numbers with "whatsapp:".
export function toWhatsAppAddress(e164: string): string {
  return e164.startsWith("whatsapp:") ? e164 : `whatsapp:${e164}`;
}

export function fromWhatsAppAddress(addr: string): string {
  return addr.replace(/^whatsapp:/, "");
}
