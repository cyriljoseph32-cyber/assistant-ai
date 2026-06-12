// ===========================================================================
// Message service — orchestrates an inbound WhatsApp message end to end.
// This is Workflow A from the spec:
//   receive -> identify contact -> detect intent + language -> upsert CRM
//   -> escalate OR generate reply -> (booking) create booking
//   -> schedule follow-up -> log everything.
// ===========================================================================

import { detectIntent, generateReply } from "./ai.service";
import {
  getBusiness,
  getOrCreateConversation,
  getOrCreateLead,
  getRecentMessages,
  logAutomation,
  logMessage,
  messageExists,
  updateLead,
  upsertContact,
} from "./crm.service";
import { escalate } from "./escalation.service";
import { bookingHasEssentials, createBookingRequest } from "./booking.service";
import { cancelFollowUps, scheduleFollowUp } from "./followup.service";
import { recordReviewSentiment } from "./review.service";
import { sendWhatsApp } from "@/lib/twilio";
import { env } from "@/lib/config";

export interface InboundMessage {
  fromWhatsApp: string; // E.164, no "whatsapp:" prefix
  body: string;
  profileName?: string; // Twilio "ProfileName"
  providerSid?: string; // Twilio "MessageSid"
}

export interface HandleResult {
  status: "ok" | "duplicate" | "escalated";
  reply?: string;
}

export async function handleInboundMessage(
  msg: InboundMessage,
  businessId = env.businessId
): Promise<HandleResult> {
  // 0) Dedupe — Twilio may retry the webhook.
  if (msg.providerSid && (await messageExists(msg.providerSid))) {
    return { status: "duplicate" };
  }

  const business = await getBusiness(businessId);

  // 1) Identify / create the contact.
  const contact = await upsertContact(businessId, msg.fromWhatsApp, msg.profileName);

  // 2) Conversation + lead.
  const conversation = await getOrCreateConversation(businessId, contact.id);
  const lead = await getOrCreateLead(businessId, contact.id);

  // 3) History + intent detection.
  const history = await getRecentMessages(conversation.id);

  // Store the inbound message first (so it's never lost).
  await logMessage({
    businessId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "inbound",
    sender: "customer",
    body: msg.body,
    providerSid: msg.providerSid,
  });

  // A reply from the customer cancels any pending nurture follow-ups.
  await cancelFollowUps(lead.id);

  const intent = await detectIntent(business, history, msg.body);

  // Persist detected language + intent on contact/lead/conversation.
  await updateLead(lead.id, {
    last_intent: intent.intent,
    interest: intent.booking?.service ?? intent.summary ?? lead.interest,
    status: lead.status === "new" ? "contacted" : lead.status,
    last_message_at: new Date().toISOString(),
  });
  await logAutomation(businessId, "inbound_message", {
    contact: contact.whatsapp,
    intent: intent.intent,
    language: intent.language,
    confidence: intent.confidence,
  });

  // 4) Escalation path — hand to a human, send a holding reply.
  if (intent.escalate || intent.intent === "complaint" || intent.intent === "urgent") {
    // For complaints we still send a calming AI reply; for low-confidence we send a holding line.
    let reply: string;
    if (intent.intent === "complaint" || intent.intent === "urgent") {
      reply = await generateReply(business, intent, history, msg.body);
    } else {
      reply = "Thanks for your message! Let me check this with our team and get right back to you. 🙏";
    }

    await sendWhatsApp(contact.whatsapp, reply);
    await logMessage({
      businessId,
      conversationId: conversation.id,
      contactId: contact.id,
      direction: "outbound",
      sender: "ai",
      body: reply,
      intent: intent.intent,
      language: intent.language,
    });

    await escalate({
      business,
      conversationId: conversation.id,
      contact,
      reason:
        intent.intent === "complaint" || intent.intent === "urgent"
          ? intent.intent
          : "low_confidence",
      message: msg.body,
    });

    return { status: "escalated", reply };
  }

  // 4b) Review responses — capture sentiment (positive/negative).
  if (intent.intent === "review_response") {
    const sentiment = guessSentiment(intent.summary ?? msg.body);
    await recordReviewSentiment({ business, contactId: contact.id, sentiment });
    if (sentiment === "negative") {
      // Negative feedback => treat like a complaint and escalate.
      await escalate({
        business,
        conversationId: conversation.id,
        contact,
        reason: "complaint",
        message: msg.body,
      });
    }
  }

  // 5) Generate the normal reply.
  const reply = await generateReply(business, intent, history, msg.body);
  await sendWhatsApp(contact.whatsapp, reply);
  await logMessage({
    businessId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "outbound",
    sender: "ai",
    body: reply,
    intent: intent.intent,
    language: intent.language,
  });

  // 6) Booking — record a booking request if we have essentials.
  if (intent.intent === "booking_request" && bookingHasEssentials(intent.booking)) {
    await createBookingRequest({
      business,
      contact,
      lead,
      booking: intent.booking!,
    });
    await updateLead(lead.id, { status: "qualified" });
  }

  // 7) Schedule a 24h follow-up to nurture the lead if it goes quiet.
  await scheduleFollowUp(businessId, lead, contact, 1);

  return { status: "ok", reply };
}

// Tiny heuristic; the AI summary usually makes this easy. Good enough for MVP.
function guessSentiment(text: string): "positive" | "negative" | "unknown" {
  const t = text.toLowerCase();
  const neg = ["bad", "terrible", "awful", "disappoint", "angry", "refund", "worst", "rude", "dirty", "late", "problem", "complaint", "horrible"];
  const pos = ["great", "good", "amazing", "loved", "love", "perfect", "excellent", "best", "fantastic", "thank", "wonderful", "happy", "awesome"];
  if (neg.some((w) => t.includes(w))) return "negative";
  if (pos.some((w) => t.includes(w))) return "positive";
  return "unknown";
}
