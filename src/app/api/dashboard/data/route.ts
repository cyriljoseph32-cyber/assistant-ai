// ===========================================================================
// GET /api/dashboard/data
// One call that powers the admin dashboard: leads, bookings, open escalations,
// and today's report stats. Guarded by a shared password header.
//   header: x-dashboard-password: <DASHBOARD_PASSWORD>
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildDailyReport } from "@/services/report.service";
import { env } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pw = req.headers.get("x-dashboard-password");
  if (pw !== env.dashboardPassword) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bid = env.businessId;
  const [leads, bookings, escalations, report] = await Promise.all([
    supabase
      .from("leads")
      .select("*, contacts(name, whatsapp)")
      .eq("business_id", bid)
      .order("last_message_at", { ascending: false })
      .limit(50),
    supabase
      .from("bookings")
      .select("*, contacts(name, whatsapp)")
      .eq("business_id", bid)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("escalations")
      .select("*, contacts(name, whatsapp)")
      .eq("business_id", bid)
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(50),
    buildDailyReport(bid),
  ]);

  return NextResponse.json({
    leads: leads.data ?? [],
    bookings: bookings.data ?? [],
    escalations: escalations.data ?? [],
    report,
  });
}
