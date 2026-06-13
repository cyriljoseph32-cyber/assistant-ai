// ===========================================================================
// Email service — Gmail channel. Polls the owner's inbox, runs each new email
// through the same AI intent layer as WhatsApp, then either auto-replies
// (info questions) or escalates to a human (bookings, complaints, unsure).
// Called by /api/cron/email (and the manual "check email" trigger).
// ===========================================================================

import { supabase } from "@/lib/supabase";
import { gmailConfigured, getEmail, listUnread, markRead, sendEmail } from "@/lib/gmail";
import { detectIntent, generateReply } from "./ai.service";
import { getBusiness, getRecentMessages, logAutomation, logMessage, updateLead } from "./crm.service";
import { escalate } from "./escalation.service";
import { env } from "@/lib/config";
import type { Contact, Conversation, Lead } from "@/lib/types";

/** Upsert a contact identified by email (whatsapp may be null for email-only). */
async function upsertEmailContact(
  businessId: string,
  email: string,
  name?: string | null
): Promise<Contact> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", businessId)
    .eq("email", email)
    .maybeSingle();
  if (existing) return existing as Contact;

  const { data, error } = await supabase
    .from("contacts")
    .insert({ business_id: businessId, email, name: name ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

async function getOrCreateEmailConversation(
  businessId: string,
  contactId: string
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("channel", "email")
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ business_id: businessId, contact_id: contactId, channel: "email" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Conversation;
}

async function getOrCreateLead(businessId: string, contactId: string): Promise<Lead> {
  const { data: existing } = await supabase
    .from("leads")
    .select("*")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .not("status", "in", "(won,lost)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as Lead;
  const { data, error } = await supabase
    .from("leads")
    .insert({ business_id: businessId, contact_id: contactId, source: "email" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function processInbox(
  businessId = env.businessId,
  max = 10
): Promise<{ processed: number; replied: number; escalated: number }> {
  if (!gmailConfigured()) {
    await logAutomation(businessId, "email_skipped", { reason: "gmail not configured" }, "warn");
    return { processed: 0, replied: 0, escalated: 0 };
  }

  const business = await getBusiness(businessId);
  const unread = await listUnread(max);
  let processed = 0;
  let replied = 0;
  let escalated = 0;

  for (const { id } of unread) {
    try {
      const mail = await getEmail(id);
      if (!mail.fromEmail || !mail.body.trim()) {
        await markRead(id);
        continue;
      }

      const contact = await upsertEmailContact(businessId, mail.fromEmail, mail.fromName);
      const conversation = await getOrCreateEmailConversation(businessId, contact.id);
      const lead = await getOrCreateLead(businessId, contact.id);

      const history = await getRecentMessages(conversation.id);
      await logMessage({
        businessId,
        conversationId: conversation.id,
        contactId: contact.id,
        direction: "inbound",
        sender: "customer",
        body: `[Email] ${mail.subject}\n\n${mail.body}`,
      });

      const intent = await detectIntent(business, history, `${mail.subject}\n\n${mail.body}`);
      await updateLead(lead.id, {
        last_intent: intent.intent,
        interest: intent.booking?.service ?? intent.summary ?? lead.interest,
        status: lead.status === "new" ? "contacted" : lead.status,
        last_message_at: new Date().toISOString(),
      });
      await logAutomation(businessId, "email_inbound", {
        from: mail.fromEmail,
        intent: intent.intent,
        escalate: intent.escalate,
      });

      const escalateThis =
        intent.escalate ||
        intent.intent === "complaint" ||
        intent.intent === "urgent" ||
        intent.intent === "booking_request";

      const reply = await generateReply(business, intent, history, `${mail.subject}\n\n${mail.body}`);

      await sendEmail({
        to: mail.fromEmail,
        subject: mail.subject,
        body: reply,
        threadId: mail.threadId,
        inReplyTo: mail.messageIdHeader,
      });
      await logMessage({
        businessId,
        conversationId: conversation.id,
        contactId: contact.id,
        direction: "outbound",
        sender: escalateThis ? "human" : "ai",
        body: reply,
        intent: intent.intent,
      });
      replied++;

      if (escalateThis) {
        await escalate({
          business,
          conversationId: conversation.id,
          contact,
          reason:
            intent.intent === "complaint" || intent.intent === "urgent"
              ? intent.intent
              : intent.intent === "booking_request"
              ? "booking"
              : "low_confidence",
          message: `[Email] ${mail.subject}: ${mail.body.slice(0, 200)}`,
        });
        escalated++;
      }

      await markRead(id);
      processed++;
    } catch (e) {
      await logAutomation(businessId, "email_failed", { id, error: String(e) }, "error");
    }
  }

  await logAutomation(businessId, "email_run", { processed, replied, escalated });
  return { processed, replied, escalated };
}
