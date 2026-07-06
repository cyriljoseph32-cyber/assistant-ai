// ===========================================================================
// Dashboard session auth. Login sets an httpOnly cookie whose value is a
// keyed hash of the shared password, so there is no session store and tokens
// invalidate automatically when the password changes. API routes also accept
// the legacy `x-dashboard-password` header (scripts / backwards compat).
// ===========================================================================

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "./config";

export const SESSION_COOKIE = "coco_session";

export function sessionToken(): string {
  return crypto
    .createHash("sha256")
    .update(`coco-session-v1:${env.dashboardPassword}`)
    .digest("hex");
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = sessionToken();
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isAuthed(req: NextRequest): boolean {
  const header = req.headers.get("x-dashboard-password");
  if (header && header === env.dashboardPassword) return true;
  return isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Returns a 401 response if the request isn't authenticated, else null. */
export function requireAuth(req: NextRequest): NextResponse | null {
  if (isAuthed(req)) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
