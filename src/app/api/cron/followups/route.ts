// ===========================================================================
// GET /api/cron/followups
// Hourly Vercel cron. Sends every due lead follow-up and chains the next step.
// Protected by CRON_SECRET (sent by Vercel as an Authorization bearer header).
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { runDueFollowUps } from "@/services/followup.service";
import { env } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  if (!env.cronSecret) return true; // not configured (dev)
  const header = req.headers.get("authorization") ?? "";
  const qsSecret = req.nextUrl.searchParams.get("secret");
  return header === `Bearer ${env.cronSecret}` || qsSecret === env.cronSecret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDueFollowUps();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
