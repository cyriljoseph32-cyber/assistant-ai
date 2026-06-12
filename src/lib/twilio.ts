// ===========================================================================
// Twilio WhatsApp helpers: send messages + validate inbound webhook signatures.
// Client is lazily initialised so the module imports cleanly at build time.
// ===========================================================================

import twilio, { Twilio } from "twilio";
import { env, toWhatsAppAddress } from "./config";

let _client: Twilio | null = null;

function client(): Twilio {
  if (!_client) _client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  return _client;
}

/**
 * Send a WhatsApp message to a customer or the owner.
 * @param to E.164 number, with or without the "whatsapp:" prefix.
 */
export async function sendWhatsApp(to: string, body: string): Promise<string> {
  const msg = await client().messages.create({
    from: env.twilioWhatsAppFrom,
    to: toWhatsAppAddress(to),
    body,
  });
  return msg.sid;
}

/**
 * Validate that an inbound webhook really came from Twilio.
 * url    = the full public URL Twilio posted to (incl. https + path).
 * params = the parsed form body (key/value).
 */
export function isValidTwilioRequest(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!env.twilioValidateSignature) return true; // dev escape hatch
  if (!signature) return false;
  return twilio.validateRequest(env.twilioAuthToken, signature, url, params);
}
