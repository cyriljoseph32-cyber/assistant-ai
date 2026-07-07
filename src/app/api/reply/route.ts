// ===========================================================================
// POST /api/reply
// Human takeover: the owner replies to a customer straight from the console.
// The reply goes out on the conversation's channel (WhatsApp via Twilio, or
// email via Gmail), is logged, and (optionally) resolves the escalation +
// reopens the conversation. Guarded by the dashboard session/password.
//   body: { contact_id, conversation_id?, body, resolve_escalation_id? }
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { sendEmail } from "@/lib/gmail";
import { getBusiness, getOrCreateConversation, logMessage, logAutomation } from "@/services/crm.service";
import { env } from "@/lib/config";
import { requireAuth } from "@/lib/auth";
import type { Contact, Conversation } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  contact_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional(),
  body: z.string().min(1),
  resolve_escalation_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { contact_id, conversation_id, body, resolve_escalation_id } = parsed.data;

  // Look up the contact.
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contact_id)
    .single();
  if (!contact) {
    return NextResponse.json({ error: "contact not found" }, { status: 404 });
  }
  const c = contact as Contact;

  // Resolve the conversation to log against (its channel decides how we send).
  let conv: Conversation | null = null;
  if (conversation_id) {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .eq("business_id", env.businessId)
      .maybeSingle();
    conv = data as Conversation | null;
  }
  if (!conv) {
    conv = await getOrCreateConversation(env.businessId, c.id);
  }
  const convId = conv.id;
  const channel = conv.channel === "email" ? "email" : "whatsapp";
  const reach = c.whatsapp ?? c.email ?? "unknown";

  // Send on the conversation's channel.
  try {
    if (channel === "email") {
      if (!c.email) throw new Error("contact has no email address");
      await sendEmail({ to: c.email, subject: await emailSubject(convId), body });
    } else {
      if (!c.whatsapp) throw new Error("contact has no WhatsApp number");
      await sendWhatsApp(c.whatsapp, body);
    }
  } catch (e) {
    await logAutomation(env.businessId, "human_reply_failed", { error: String(e), channel, contact: reach }, "error");
    return NextResponse.json({ error: "send failed: " + String(e) }, { status: 502 });
  }

  // Log it as a human message.
  await logMessage({
    businessId: env.businessId,
    conversationId: convId,
    contactId: c.id,
    direction: "outbound",
    sender: "human",
    body,
  });

  // Reopen the conversation and resolve the escalation if asked.
  await supabase.from("conversations").update({ status: "open" }).eq("id", convId);
  if (resolve_escalation_id) {
    await supabase
      .from("escalations")
      .update({ resolved: true })
      .eq("id", resolve_escalation_id)
      .eq("business_id", env.businessId);
  }

  await logAutomation(env.businessId, "human_reply_sent", { channel, contact: reach });
  return NextResponse.json({ ok: true, channel });
}

/** Subject for a human email reply: reuse the last inbound "[Email] <subject>". */
async function emailSubject(conversationId: string): Promise<string> {
  const { data } = await supabase
    .from("messages")
    .select("body")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const match = data?.body?.match(/^\[Email\] (.+)/);
  if (match) return match[1].trim();
  const business = await getBusiness(env.businessId).catch(() => null);
  return business ? `Your enquiry with ${business.name}` : "Your enquiry";
}
