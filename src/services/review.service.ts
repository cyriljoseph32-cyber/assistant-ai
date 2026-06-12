// ===========================================================================
// Review service — after-service review requests.
// A booking marked "completed" becomes eligible. We message the customer once,
// store a review record, and (for positive replies) the AI sends the link.
// runReviewRequests() is called from the daily cron; it batches eligible ones.
// ===========================================================================

import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { reviewRequestMessage } from "@/prompts";
import { getBusiness, logAutomation } from "./crm.service";
import type { Booking, Business, Contact } from "@/lib/types";

/** Send a review request for a single completed booking. */
export async function sendReviewRequest(bookingId: string): Promise<boolean> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (!booking) return false;
  const b = booking as Booking;
  if (b.status !== "completed" || b.review_status !== "pending") return false;

  const business = await getBusiness(b.business_id);
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", b.contact_id)
    .single();
  if (!contact) return false;
  const c = contact as Contact;

  await sendWhatsApp(c.whatsapp, reviewRequestMessage(business, c.name ?? undefined));

  await supabase
    .from("bookings")
    .update({ review_status: "requested" })
    .eq("id", b.id);

  await supabase.from("reviews").insert({
    business_id: business.id,
    contact_id: c.id,
    booking_id: b.id,
    status: "requested",
    requested_at: new Date().toISOString(),
  });

  await logAutomation(business.id, "review_requested", { booking_id: b.id });
  return true;
}

/** Cron batch: send review requests for all newly completed bookings. */
export async function runReviewRequests(): Promise<{ sent: number }> {
  const { data: eligible } = await supabase
    .from("bookings")
    .select("id")
    .eq("status", "completed")
    .eq("review_status", "pending")
    .limit(100);

  let sent = 0;
  for (const row of (eligible ?? []) as { id: string }[]) {
    try {
      if (await sendReviewRequest(row.id)) sent++;
    } catch (e) {
      await logAutomation(null, "review_request_failed", { id: row.id, error: String(e) }, "error");
    }
  }
  return { sent };
}

/**
 * Record the sentiment of a review_response message.
 * Positive => we've already sent the link; mark "left" optimistically is wrong,
 * so we keep "requested" but tag sentiment. Negative => create support ticket.
 */
export async function recordReviewSentiment(params: {
  business: Business;
  contactId: string;
  sentiment: "positive" | "negative" | "unknown";
}): Promise<void> {
  const { business, contactId, sentiment } = params;
  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("business_id", business.id)
    .eq("contact_id", contactId)
    .eq("status", "requested")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (review) {
    await supabase
      .from("reviews")
      .update({ sentiment, responded_at: new Date().toISOString() })
      .eq("id", review.id);
  }
  await logAutomation(business.id, "review_sentiment", { contactId, sentiment });
}
