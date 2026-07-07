// ===========================================================================
// GET /api/activity -> the trust layer: escalations, automation log, and
// 7-day AI-vs-human handling stats.
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

  const bid = env.businessId;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [escalations, logs, aiMsgs, humanMsgs, inbound, openEsc] =
    await Promise.all([
      supabase
        .from("escalations")
        .select("*, contacts(name, whatsapp, email)")
        .eq("business_id", bid)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("automation_logs")
        .select("id, event, detail, level, created_at")
        .eq("business_id", bid)
        .order("created_at", { ascending: false })
        .limit(100),
      count("messages", bid, (q) => q.eq("sender", "ai").gte("created_at", since)),
      count("messages", bid, (q) => q.eq("sender", "human").gte("created_at", since)),
      count("messages", bid, (q) => q.eq("direction", "inbound").gte("created_at", since)),
      count("escalations", bid, (q) => q.eq("resolved", false)),
    ]);

  return NextResponse.json({
    escalations: escalations.data ?? [],
    logs: logs.data ?? [],
    stats: {
      aiReplies7d: aiMsgs,
      humanReplies7d: humanMsgs,
      inbound7d: inbound,
      openEscalations: openEsc,
    },
  });
}

async function count(
  table: string,
  businessId: string,
  filter: (q: any) => any
): Promise<number> {
  let q = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}
