// ===========================================================================
// GET   /api/escalate   -> list open escalations
// POST  /api/escalate   -> manually escalate { conversation_id, contact_id, reason, message }
// PATCH /api/escalate   -> resolve an escalation { id, resolved }
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { escalate } from "@/services/escalation.service";
import { getBusiness } from "@/services/crm.service";
import { env } from "@/lib/config";
import type { Contact } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabase
    .from("escalations")
    .select("*, contacts(name, whatsapp)")
    .eq("business_id", env.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ escalations: data });
}

const Body = z.object({
  conversation_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  reason: z.string().default("manual"),
  message: z.string().default(""),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const business = await getBusiness();
    const { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", parsed.data.contact_id)
      .single();
    if (!contact) return NextResponse.json({ error: "contact not found" }, { status: 404 });

    await escalate({
      business,
      conversationId: parsed.data.conversation_id,
      contact: contact as Contact,
      reason: parsed.data.reason,
      message: parsed.data.message,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

const Patch = z.object({ id: z.string().uuid(), resolved: z.boolean() });

export async function PATCH(req: NextRequest) {
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { error } = await supabase
    .from("escalations")
    .update({ resolved: parsed.data.resolved })
    .eq("id", parsed.data.id)
    .eq("business_id", env.businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
