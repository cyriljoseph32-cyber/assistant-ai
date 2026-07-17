// ===========================================================================
// GET /api/gmail/auth?key=<DASHBOARD_PASSWORD>
// Starts the Gmail OAuth2 consent flow. Redirects the owner to Google; on
// approval Google redirects back to /api/gmail/callback which shows the
// refresh token to put in GMAIL_REFRESH_TOKEN.
// Needs GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET already set.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/lib/config";
import { GMAIL_SCOPES, oauthRedirectUri } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!env.dashboardPassword || req.nextUrl.searchParams.get("key") !== env.dashboardPassword) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!env.gmailClientId || !env.gmailClientSecret) {
    return NextResponse.json(
      { error: "Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first (see DEPLOY.md → Gmail)." },
      { status: 400 }
    );
  }

  const oauth2 = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret, oauthRedirectUri());
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on re-consent
    scope: GMAIL_SCOPES,
    login_hint: env.ownerEmail,
  });
  return NextResponse.redirect(url);
}
