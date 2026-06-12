// ===========================================================================
// CRM service — the data layer for contacts, leads, conversations, messages.
// Every other service builds on these. All writes are scoped to a business_id.
// ===========================================================================

import { supabase } from "@/lib/supabase";
import { env } from "@/lib/config";
import type {
  Business,
  Contact,
  Conversation,
  Lead,
  Message,
  MessageDirection,
  MessageSender,
} from "@/lib/types";

export async function getBusiness(businessId = env.businessId): Promise<Business> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();
  if (error || !data) throw new Error(`Business not found: ${businessId}`);
  return data as Business;
}

/** Find an existing contact by WhatsApp number, or create one. */
export async function upsertContact(
  businessId: string,
  whatsapp: string,
  name?: string
): Promise<Contact> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", businessId)
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (existing) {
    if (name && !existing.name) {
      const { data: updated } = await supabase
        .from("contacts")
        .update({ name })
        .eq("id", existing.id)
        .select("*")
        .single();
      return (updated ?? existing) as Contact;
    }
    return existing as Contact;
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({ business_id: businessId, whatsapp, name: name ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

/** Get the open conversation for a contact, or start a new one. */
export async function getOrCreateConversation(
  businessId: string,
  contactId: string,
  language = "en"
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ business_id: businessId, contact_id: contactId, language })
    .select("*")
    .single();
  if (error) throw error;
  return data as Conversation;
}

/** Get the active (non-closed) lead for a contact, or create one. */
export async function getOrCreateLead(
  businessId: string,
  contactId: string,
  source = "whatsapp"
): Promise<Lead> {
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
    .insert({ business_id: businessId, contact_id: contactId, source })
    .select("*")
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(
  leadId: string,
  patch: Partial<Lead>
): Promise<void> {
  const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
  if (error) throw error;
}

export async function logMessage(params: {
  businessId: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  sender: MessageSender;
  body: string;
  intent?: string | null;
  language?: string | null;
  providerSid?: string | null;
}): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      business_id: params.businessId,
      conversation_id: params.conversationId,
      contact_id: params.contactId,
      direction: params.direction,
      sender: params.sender,
      body: params.body,
      intent: params.intent ?? null,
      language: params.language ?? null,
      provider_sid: params.providerSid ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  // touch conversation + lead recency
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  return data as Message;
}

export async function getRecentMessages(
  conversationId: string,
  limit = 8
): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Message[]).reverse();
}

/** Dedupe guard: returns true if we've already stored this Twilio MessageSid. */
export async function messageExists(providerSid: string): Promise<boolean> {
  if (!providerSid) return false;
  const { data } = await supabase
    .from("messages")
    .select("id")
    .eq("provider_sid", providerSid)
    .maybeSingle();
  return !!data;
}

export async function logAutomation(
  businessId: string | null,
  event: string,
  detail: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info"
): Promise<void> {
  await supabase
    .from("automation_logs")
    .insert({ business_id: businessId, event, level, detail });
}
