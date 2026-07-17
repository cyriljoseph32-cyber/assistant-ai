// ===========================================================================
// POST   /api/auth  { password }  -> set session cookie
// DELETE /api/auth                -> clear session cookie
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/config";
import { SESSION_COOKIE, sessionToken, safeEqual } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({ password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`auth:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "too many attempts — try again in a minute" },
      { status: 429 }
    );
  }
  if (!env.dashboardPassword) {
    return NextResponse.json(
      { error: "dashboard password is not configured" },
      { status: 503 }
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || !safeEqual(parsed.data.password, env.dashboardPassword)) {
    return NextResponse.json({ error: "invalid password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
