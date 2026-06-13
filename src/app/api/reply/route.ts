// ===========================================================================
// POST /api/reply
// Human takeover: the owner sends a WhatsApp reply to a customer straight from
// the dashboard, logs it, and (optionally) resolves the escalation + reopens
// the conversation. Guarded by the dashboard password header.
//   header: x-dashboard-password: <DASHBOARD_PASSWORD>
//   body:   { contact_id, conversation_id?, body, resolve_escalation_id? }
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { getOrCreateConversation, logMessage, logAutomation } from "@/services/crm.service";
import { env } from "@/lib/config";
import type { Contact } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  contact_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional(),
  body: z.string().min(1),
  resolve_escalation_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  if (req.headers.get("x-dashboard-password") !== env.dashboardPassword) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  // Resolve the conversation to log against.
  let convId = conversation_id;
  if (!convId) {
    const conv = await getOrCreateConversation(env.businessId, c.id);
    convId = conv.id;
  }

  // Send the WhatsApp message.
  try {
    await sendWhatsApp(c.whatsapp, body);
  } catch (e) {
    await logAutomation(env.businessId, "human_reply_failed", { error: String(e), contact: c.whatsapp }, "error");
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

  await logAutomation(env.businessId, "human_reply_sent", { contact: c.whatsapp });
  return NextResponse.json({ ok: true });
}
