// ===========================================================================
// GET /api/setup?key=<DASHBOARD_PASSWORD>[&name=Your%20Business]
// One-time bootstrap: make sure the business row for this deployment's
// BUSINESS_ID exists, so the assistant and the Knowledge page work. Safe to
// call repeatedly — it never overwrites an existing row (insert-if-missing).
// Runs on Vercel, which can reach Supabase, so it works even when the owner
// can't run SQL in the Supabase console.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/config";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== env.dashboardPassword && !isAuthed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const name = req.nextUrl.searchParams.get("name")?.trim() || "Coco Samui";

  // Insert-if-missing: ignoreDuplicates keeps any row you've already set up.
  const { error } = await supabase
    .from("businesses")
    .upsert(
      { id: env.businessId, name, languages: ["en", "fr", "th"], faq: [] },
      { onConflict: "id", ignoreDuplicates: true }
    );
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint:
          /relation .* does not exist/i.test(error.message)
            ? "Tables are missing — run supabase/schema.sql once in the Supabase SQL editor."
            : "Check NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY point at this project.",
      },
      { status: 500 }
    );
  }

  // Confirm the row is really there and report it back.
  const { data, error: readErr } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", env.businessId)
    .maybeSingle();
  if (readErr || !data) {
    return NextResponse.json(
      { ok: false, error: readErr?.message ?? "row not found after upsert" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    business: data,
    next: "Reload the app — the assistant and Knowledge now work. Edit your details on the Knowledge page.",
  });
}
