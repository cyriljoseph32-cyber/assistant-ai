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

/** Constant-time string comparison (length leak only). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function sessionToken(): string {
  return crypto
    .createHash("sha256")
    .update(`coco-session-v1:${env.dashboardPassword}`)
    .digest("hex");
}

export function isValidSession(cookieValue: string | undefined): boolean {
  // No password configured -> nothing can authenticate (fail closed).
  if (!env.dashboardPassword) return false;
  if (!cookieValue) return false;
  return safeEqual(cookieValue, sessionToken());
}

export function isAuthed(req: NextRequest): boolean {
  if (!env.dashboardPassword) return false;
  const header = req.headers.get("x-dashboard-password");
  if (header && safeEqual(header, env.dashboardPassword)) return true;
  return isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Returns a 401 response if the request isn't authenticated, else null. */
export function requireAuth(req: NextRequest): NextResponse | null {
  if (isAuthed(req)) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
