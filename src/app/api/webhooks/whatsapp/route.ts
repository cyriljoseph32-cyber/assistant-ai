// ===========================================================================
// POST /api/webhooks/whatsapp
// Twilio posts inbound WhatsApp messages here (form-encoded).
// We validate the signature, hand off to the message service, and ACK fast.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { isValidTwilioRequest } from "@/lib/twilio";
import { handleInboundMessage } from "@/services/message.service";
import { logAutomation } from "@/services/crm.service";
import { env, fromWhatsAppAddress } from "@/lib/config";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Twilio sends application/x-www-form-urlencoded.
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  // Validate the request actually came from Twilio.
  const signature = req.headers.get("x-twilio-signature");
  const url = `${env.appBaseUrl}/api/webhooks/whatsapp`;
  if (!isValidTwilioRequest(signature, url, params)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = fromWhatsAppAddress(params["From"] ?? "");
  const body = (params["Body"] ?? "").trim();
  const profileName = params["ProfileName"];
  const providerSid = params["MessageSid"];

  if (!from || !body) {
    // Nothing to process (e.g. media-only). ACK so Twilio doesn't retry.
    return twiml();
  }

  // Per-sender abuse guard: beyond 20 messages / 5 min we store nothing and
  // skip the AI so a spammer can't drive unbounded Claude spend.
  if (!rateLimit(`wa:${from}`, 20, 5 * 60_000)) {
    await logAutomation(env.businessId, "rate_limited", { from }, "warn");
    return twiml();
  }

  try {
    // Process synchronously — fast enough for MVP volumes. For higher volume,
    // enqueue here and return immediately (see README "Scaling").
    await handleInboundMessage({ fromWhatsApp: from, body, profileName, providerSid });
  } catch (e) {
    await logAutomation(env.businessId, "webhook_error", { error: String(e) }, "error");
    // Still ACK — we don't want Twilio retry storms. The error is logged.
  }

  // Return empty TwiML: we already sent our reply via the REST API.
  return twiml();
}

function twiml() {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
