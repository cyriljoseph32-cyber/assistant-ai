// ===========================================================================
// GET /api/search?q=... -> ⌘K search across contacts, leads, bookings, and
// conversations. Returns a flat, grouped-orderable result list.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { env } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Hit {
  type: "contact" | "lead" | "booking" | "conversation";
  id: string;
  title: string;
  sub: string;
  href: string;
}

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const bid = env.businessId;
  // Escape PostgREST pattern characters, then wildcard-wrap.
  const pat = `%${q.replace(/[%_,()]/g, " ")}%`;

  const [contacts, leads, bookings] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, whatsapp")
      .eq("business_id", bid)
      .or(`name.ilike.${pat},whatsapp.ilike.${pat}`)
      .limit(5),
    supabase
      .from("leads")
      .select("id, status, interest, contacts!inner(name, whatsapp)")
      .eq("business_id", bid)
      .or(`interest.ilike.${pat}`)
      .limit(5),
    supabase
      .from("bookings")
      .select("id, status, service_name, date, contacts(name)")
      .eq("business_id", bid)
      .ilike("service_name", pat)
      .limit(5),
  ]);

  // Conversations match through their contact.
  const contactIds = (contacts.data ?? []).map((c) => c.id);
  const conversations =
    contactIds.length > 0
      ? await supabase
          .from("conversations")
          .select("id, channel, status, contact_id")
          .eq("business_id", bid)
          .in("contact_id", contactIds)
          .order("last_message_at", { ascending: false })
          .limit(5)
      : { data: [] as any[] };

  const nameOf = (c: any) =>
    (Array.isArray(c) ? c[0]?.name : c?.name) ?? "Unknown";

  const results: Hit[] = [
    ...(conversations.data ?? []).map((c: any): Hit => {
      const contact = (contacts.data ?? []).find((x) => x.id === c.contact_id);
      return {
        type: "conversation",
        id: c.id,
        title: contact?.name ?? contact?.whatsapp ?? "Conversation",
        sub: `${c.channel} · ${c.status}`,
        href: `/inbox?c=${c.id}`,
      };
    }),
    ...(contacts.data ?? []).map(
      (c): Hit => ({
        type: "contact",
        id: c.id,
        title: c.name ?? c.whatsapp,
        sub: c.whatsapp,
        href: `/leads`,
      })
    ),
    ...(leads.data ?? []).map(
      (l: any): Hit => ({
        type: "lead",
        id: l.id,
        title: nameOf(l.contacts),
        sub: `${l.status}${l.interest ? ` · ${l.interest}` : ""}`,
        href: `/leads`,
      })
    ),
    ...(bookings.data ?? []).map(
      (b: any): Hit => ({
        type: "booking",
        id: b.id,
        title: b.service_name ?? "Booking",
        sub: `${nameOf(b.contacts)}${b.date ? ` · ${b.date}` : ""} · ${b.status}`,
        href: `/bookings`,
      })
    ),
  ];

  return NextResponse.json({ results: results.slice(0, 15) });
}
