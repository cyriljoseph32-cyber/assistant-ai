// ===========================================================================
// GET   /api/business   -> the business row + services (what the AI knows)
// PATCH /api/business   -> update profile / tone / FAQ / services summary
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { env } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const [business, services] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", env.businessId).single(),
    supabase
      .from("services")
      .select("*")
      .eq("business_id", env.businessId)
      .order("created_at", { ascending: true }),
  ]);
  if (business.error) {
    return NextResponse.json({ error: business.error.message }, { status: 500 });
  }
  return NextResponse.json({ business: business.data, services: services.data ?? [] });
}

const Patch = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().nullable().optional(),
  tone: z.string().nullable().optional(),
  languages: z.array(z.string()).optional(),
  services_summary: z.string().nullable().optional(),
  review_link: z.string().nullable().optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
});

export async function PATCH(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("businesses")
    .update(parsed.data)
    .eq("id", env.businessId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}
