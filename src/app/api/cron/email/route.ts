// ===========================================================================
// GET /api/cron/email
// Polls Gmail and processes new emails through the AI.
// Auth: either the Vercel cron bearer (CRON_SECRET) OR the dashboard password
// header (so the dashboard "Check email now" button can trigger it on demand).
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { processInbox } from "@/services/email.service";
import { env } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  // Dashboard manual trigger
  if (req.headers.get("x-dashboard-password") === env.dashboardPassword) return true;
  // Vercel cron
  if (!env.cronSecret) return true;
  const header = req.headers.get("authorization") ?? "";
  const qs = req.nextUrl.searchParams.get("secret");
  return header === `Bearer ${env.cronSecret}` || qs === env.cronSecret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await processInbox();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
