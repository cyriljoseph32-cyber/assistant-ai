// ===========================================================================
// POST   /api/auth  { password }  -> set session cookie
// DELETE /api/auth                -> clear session cookie
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/config";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({ password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || parsed.data.password !== env.dashboardPassword) {
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
