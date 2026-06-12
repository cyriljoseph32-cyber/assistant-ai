// ===========================================================================
// GET   /api/leads          -> list leads (optionally ?status=new)
// PATCH /api/leads          -> update a lead { id, status?, interest? }
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { updateLead } from "@/services/crm.service";
import { env } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  let q = supabase
    .from("leads")
    .select("*, contacts(name, whatsapp)")
    .eq("business_id", env.businessId)
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

const Patch = z.object({
  id: z.string().uuid(),
  status: z
    .enum(["new", "contacted", "qualified", "won", "lost", "cold"])
    .optional(),
  interest: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, ...patch } = parsed.data;
  try {
    await updateLead(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
