// ===========================================================================
// GET /api/gmail/callback?code=...
// OAuth2 redirect target. Exchanges the authorization code for tokens,
// verifies the mailbox (getProfile), and shows the refresh token to copy
// into the GMAIL_REFRESH_TOKEN env var. The token is displayed once and
// never stored server-side.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/lib/config";
import { oauthRedirectUri } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>${title}</title>
<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px">
<h2>${title}</h2>${body}</body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");
  if (err) return page("Gmail: denied", `<p>Google returned: <code>${err}</code></p>`, 400);
  if (!code) return page("Gmail: missing code", "<p>Missing <code>code</code> parameter.</p>", 400);

  try {
    const oauth2 = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret, oauthRedirectUri());
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      return page(
        "Gmail: no refresh token",
        `<p>Google didn't return a refresh token (this account was already
         authorized without <code>prompt=consent</code>). Remove access at
         <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>
         then start <code>/api/gmail/auth</code> again.</p>`,
        400
      );
    }

    // Verify the mailbox is actually usable with these tokens.
    oauth2.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    const profile = await gmail.users.getProfile({ userId: "me" });

    return page(
      "Gmail connected ✔",
      `<p>Authorized mailbox: <b>${profile.data.emailAddress}</b>
       (${profile.data.messagesTotal} messages).</p>
       <p>Add this environment variable (Vercel → Settings → Environment
       Variables, then redeploy):</p>
       <p><code>GMAIL_REFRESH_TOKEN</code></p>
       <textarea rows="4" style="width:100%" readonly onclick="this.select()">${tokens.refresh_token}</textarea>
       <p>Then verify with <code>/api/gmail/status?key=&lt;DASHBOARD_PASSWORD&gt;</code>.</p>`
    );
  } catch (e) {
    return page("Gmail: token exchange failed", `<pre>${String(e)}</pre>`, 500);
  }
}
