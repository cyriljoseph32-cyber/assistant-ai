// ===========================================================================
// GET /api/cron/daily-report
// Daily Vercel cron (12:00 UTC = 19:00 Asia/Bangkok).
//   1) sends review requests for newly completed bookings
//   2) sends the owner the daily summary
// Protected by CRON_SECRET.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { sendDailyReport } from "@/services/report.service";
import { runReviewRequests } from "@/services/review.service";
import { env } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  if (!env.cronSecret) return true;
  const header = req.headers.get("authorization") ?? "";
  const qsSecret = req.nextUrl.searchParams.get("secret");
  return header === `Bearer ${env.cronSecret}` || qsSecret === env.cronSecret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const reviews = await runReviewRequests();
    const report = await sendDailyReport(env.businessId);
    return NextResponse.json({ ok: true, reviewsSent: reviews.sent, stats: report.stats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
