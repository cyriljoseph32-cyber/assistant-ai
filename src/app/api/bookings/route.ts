// ===========================================================================
// GET   /api/bookings        -> list bookings (optionally ?status=requested)
// POST  /api/bookings        -> manually create a booking
// PATCH /api/bookings        -> update status { id, status }
//                              (setting status="completed" triggers review req)
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { setBookingStatus } from "@/services/booking.service";
import { sendReviewRequest } from "@/services/review.service";
import { env } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  let q = supabase
    .from("bookings")
    .select("*, contacts(name, whatsapp)")
    .eq("business_id", env.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data });
}

const CreateBody = z.object({
  contact_id: z.string().uuid(),
  service_name: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  pax: z.number().int().positive().optional(),
  pickup: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("bookings")
    .insert({ business_id: env.businessId, status: "requested", ...parsed.data })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "requested",
    "pending",
    "confirmed",
    "cancelled",
    "completed",
    "no_show",
  ]),
});

export async function PATCH(req: NextRequest) {
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const booking = await setBookingStatus(parsed.data.id, parsed.data.status);
    // Completing a booking kicks off the after-service review request.
    if (parsed.data.status === "completed") {
      await sendReviewRequest(booking.id).catch(() => {});
    }
    return NextResponse.json({ booking });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
