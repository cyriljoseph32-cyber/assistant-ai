// ===========================================================================
// GET /api/conversations          -> conversation list with contact + preview
// GET /api/conversations?id=<id>  -> one conversation's messages
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { env } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, direction, sender, body, intent, created_at")
      .eq("business_id", env.businessId)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  }

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, status, channel, language, last_message_at, contact_id, contacts(name, whatsapp, email)")
    .eq("business_id", env.businessId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach a last-message preview per conversation (one batched query).
  const ids = (conversations ?? []).map((c) => c.id);
  let previews: Record<string, { body: string; sender: string }> = {};
  if (ids.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, sender, created_at")
      .eq("business_id", env.businessId)
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(300);
    for (const m of msgs ?? []) {
      if (!previews[m.conversation_id]) {
        previews[m.conversation_id] = { body: m.body, sender: m.sender };
      }
    }
  }

  return NextResponse.json({
    conversations: (conversations ?? []).map((c) => ({
      ...c,
      preview: previews[c.id] ?? null,
    })),
  });
}
