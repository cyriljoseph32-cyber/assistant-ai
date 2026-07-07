// ===========================================================================
// GET  /api/contacts     -> list contacts for the business
// POST /api/contacts     -> create/upsert a contact { whatsapp?, name?, email? }
//                           (at least one of whatsapp / email is required)
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { upsertContact, upsertContactByEmail } from "@/services/crm.service";
import { env } from "@/lib/config";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", env.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data });
}

const Body = z
  .object({
    whatsapp: z.string().min(6).optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((b) => b.whatsapp || b.email, {
    message: "whatsapp or email is required",
  });

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const { whatsapp, email, name } = parsed.data;
    const contact = whatsapp
      ? await upsertContact(env.businessId, whatsapp, name)
      : await upsertContactByEmail(env.businessId, email!, name);
    if (email && contact.email !== email) {
      await supabase.from("contacts").update({ email }).eq("id", contact.id);
    }
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
