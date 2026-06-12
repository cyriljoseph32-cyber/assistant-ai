// ===========================================================================
// GET  /api/contacts     -> list contacts for the business
// POST /api/contacts     -> create/upsert a contact { whatsapp, name?, email? }
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { upsertContact } from "@/services/crm.service";
import { env } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", env.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data });
}

const Body = z.object({
  whatsapp: z.string().min(6),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const contact = await upsertContact(env.businessId, parsed.data.whatsapp, parsed.data.name);
    if (parsed.data.email) {
      await supabase.from("contacts").update({ email: parsed.data.email }).eq("id", contact.id);
    }
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
