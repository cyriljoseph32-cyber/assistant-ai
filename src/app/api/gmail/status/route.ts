// ===========================================================================
// GET /api/gmail/status?key=<DASHBOARD_PASSWORD>
// Health check for the email channel: confirms the 3 Gmail env vars are set
// and that the refresh token actually opens the mailbox (getProfile).
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config";
import { gmailConfigured, getProfile, listUnread } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? req.headers.get("x-dashboard-password");
  if (!env.dashboardPassword || key !== env.dashboardPassword) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!gmailConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        missing: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"].filter(
          (k) => !process.env[k]
        ),
        hint: "Set GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET, then visit /api/gmail/auth?key=<DASHBOARD_PASSWORD>.",
      },
      { status: 200 }
    );
  }
  try {
    const profile = await getProfile();
    const unread = await listUnread(5);
    return NextResponse.json({
      connected: true,
      email: profile.email,
      messagesTotal: profile.messagesTotal,
      unreadSample: unread.length,
    });
  } catch (e) {
    return NextResponse.json({ connected: false, error: String(e) }, { status: 500 });
  }
}
