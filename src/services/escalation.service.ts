// ===========================================================================
// Escalation service — hand a conversation to a human.
// Creates an escalation record, flags the conversation, and pings the owner.
// ===========================================================================

import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { logAutomation } from "./crm.service";
import type { Business, Contact } from "@/lib/types";

export async function escalate(params: {
  business: Business;
  conversationId: string;
  contact: Contact;
  reason: string; // complaint | urgent | low_confidence | manual
  message: string; // the customer message that triggered it
}): Promise<void> {
  const { business, conversationId, contact, reason, message } = params;

  await supabase.from("escalations").insert({
    business_id: business.id,
    conversation_id: conversationId,
    contact_id: contact.id,
    reason,
    message,
  });

  await supabase
    .from("conversations")
    .update({ status: "escalated" })
    .eq("id", conversationId);

  await logAutomation(business.id, "escalation_created", {
    reason,
    contact: contact.whatsapp,
  });

  // Notify the owner on WhatsApp.
  const owner = business.owner_whatsapp;
  if (owner) {
    const who = contact.name ? `${contact.name} (${contact.whatsapp})` : contact.whatsapp;
    const note = `🚨 ${business.name} — needs your attention\nReason: ${reason}\nFrom: ${who}\nMessage: "${message}"\n\nReply to them directly on WhatsApp.`;
    try {
      await sendWhatsApp(owner, note);
    } catch (e) {
      await logAutomation(business.id, "escalation_notify_failed", { error: String(e) }, "error");
    }
  }
}
