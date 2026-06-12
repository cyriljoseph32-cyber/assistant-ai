// ===========================================================================
// Daily report service — Workflow F.
// Summarises the last 24h for the owner and sends it on WhatsApp:
//   new leads, confirmed/requested bookings, escalations, reviews,
//   tomorrow's bookings, and recommended actions.
// Called by the daily cron.
// ===========================================================================

import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { getBusiness, logAutomation } from "./crm.service";
import type { Booking, Business } from "@/lib/types";

export interface DailyReport {
  businessId: string;
  text: string;
  stats: Record<string, number>;
}

export async function buildDailyReport(businessId: string): Promise<DailyReport> {
  const business = await getBusiness(businessId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    newLeads,
    requestedBookings,
    confirmedBookings,
    openEscalations,
    reviewsRequested,
    tomorrowBookings,
    coldLeads,
  ] = await Promise.all([
    count("leads", businessId, (q) => q.gte("created_at", since)),
    count("bookings", businessId, (q) => q.gte("created_at", since).eq("status", "requested")),
    count("bookings", businessId, (q) => q.gte("created_at", since).eq("status", "confirmed")),
    count("escalations", businessId, (q) => q.eq("resolved", false)),
    count("reviews", businessId, (q) => q.gte("created_at", since).eq("status", "requested")),
    listBookings(businessId, tomorrow),
    count("leads", businessId, (q) => q.gte("created_at", since).eq("status", "cold")),
  ]);

  const stats = {
    newLeads,
    requestedBookings,
    confirmedBookings,
    openEscalations,
    reviewsRequested,
    tomorrowBookings: tomorrowBookings.length,
    coldLeads,
  };

  const actions: string[] = [];
  if (requestedBookings > 0) actions.push(`Confirm ${requestedBookings} pending booking request(s).`);
  if (openEscalations > 0) actions.push(`Reply to ${openEscalations} customer(s) waiting for a human.`);
  if (tomorrowBookings.length > 0) actions.push(`Prep for ${tomorrowBookings.length} trip(s) tomorrow.`);
  if (actions.length === 0) actions.push("All clear — nothing urgent. 🌴");

  const tmwLines =
    tomorrowBookings.length > 0
      ? tomorrowBookings
          .map((b) => `  • ${b.service_name ?? "Booking"} ${b.time ?? ""} (${b.pax ?? "?"} pax)`)
          .join("\n")
      : "  • none";

  const text = [
    `🌅 ${business.name} — Daily summary`,
    ``,
    `New leads (24h): ${newLeads}`,
    `Booking requests: ${requestedBookings}`,
    `Confirmed bookings: ${confirmedBookings}`,
    `Waiting for you (escalations): ${openEscalations}`,
    `Review requests sent: ${reviewsRequested}`,
    `Leads gone cold: ${coldLeads}`,
    ``,
    `Tomorrow's bookings:`,
    tmwLines,
    ``,
    `👉 Recommended actions:`,
    ...actions.map((a) => `  • ${a}`),
  ].join("\n");

  return { businessId, text, stats };
}

export async function sendDailyReport(businessId: string): Promise<DailyReport> {
  const report = await buildDailyReport(businessId);
  const business = await getBusiness(businessId);
  if (business.owner_whatsapp) {
    await sendWhatsApp(business.owner_whatsapp, report.text);
  }
  await logAutomation(businessId, "daily_report_sent", report.stats);
  return report;
}

// --- helpers ---------------------------------------------------------------

type Filter = (q: any) => any;

async function count(table: string, businessId: string, filter: Filter): Promise<number> {
  let q = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

async function listBookings(businessId: string, date: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", businessId)
    .eq("date", date)
    .in("status", ["requested", "confirmed"]);
  return (data ?? []) as Booking[];
}
