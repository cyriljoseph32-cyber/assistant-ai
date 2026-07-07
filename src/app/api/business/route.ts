// ===========================================================================
// GET   /api/business   -> the business row + services (what the AI knows).
//                          Returns an empty profile if none exists yet.
// PATCH /api/business   -> create-or-update profile / tone / FAQ / services summary
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
    supabase.from("businesses").select("*").eq("id", env.businessId).maybeSingle(),
    supabase
      .from("services")
      .select("*")
      .eq("business_id", env.businessId)
      .order("created_at", { ascending: true }),
  ]);
  if (business.error) {
    return NextResponse.json({ error: business.error.message }, { status: 500 });
  }
  // No row yet (fresh deployment): hand back an empty profile so the console can
  // render the form and PATCH will create the row on first save.
  const row = business.data ?? {
    id: env.businessId,
    name: "",
    industry: null,
    owner_name: null,
    owner_whatsapp: null,
    timezone: "Asia/Bangkok",
    currency: "THB",
    languages: ["en", "fr", "th"],
    tone: "friendly, warm, professional, concise",
    faq: [],
    services_summary: null,
    review_link: null,
  };
  return NextResponse.json({ business: row, services: services.data ?? [] });
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
  // Upsert so the first save on a fresh deployment CREATES the business row
  // (keyed by the deployment's BUSINESS_ID), and later saves update it.
  const { data, error } = await supabase
    .from("businesses")
    .upsert({ id: env.businessId, ...parsed.data }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}
