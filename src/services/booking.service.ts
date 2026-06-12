// ===========================================================================
// Booking service — turn an AI-detected booking_request into a booking record,
// schedule the review request, and notify the owner.
// ===========================================================================

import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { logAutomation } from "./crm.service";
import type { Booking, Business, Contact, IntentResult, Lead } from "@/lib/types";

/**
 * Create a booking from the AI booking details. Status starts at "requested"
 * because a human still confirms real availability for the MVP.
 */
export async function createBookingRequest(params: {
  business: Business;
  contact: Contact;
  lead: Lead;
  booking: NonNullable<IntentResult["booking"]>;
}): Promise<Booking> {
  const { business, contact, lead, booking } = params;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      business_id: business.id,
      contact_id: contact.id,
      lead_id: lead.id,
      service_name: booking.service ?? null,
      date: normaliseDate(booking.date),
      time: booking.time ?? null,
      pax: booking.pax ?? null,
      pickup: booking.pickup ?? null,
      notes: booking.notes ?? null,
      status: "requested",
    })
    .select("*")
    .single();
  if (error) throw error;

  await logAutomation(business.id, "booking_created", { booking_id: data.id });

  // Notify owner so they can confirm availability.
  if (business.owner_whatsapp) {
    const b = data as Booking;
    const who = contact.name ? `${contact.name} (${contact.whatsapp})` : contact.whatsapp;
    const note = `📋 New booking request — ${business.name}\nFrom: ${who}\nService: ${b.service_name ?? "—"}\nDate: ${b.date ?? "—"}  Time: ${b.time ?? "—"}\nPax: ${b.pax ?? "—"}  Pickup: ${b.pickup ?? "—"}\n\nConfirm availability, then reply to the customer.`;
    try {
      await sendWhatsApp(business.owner_whatsapp, note);
    } catch (e) {
      await logAutomation(business.id, "booking_notify_failed", { error: String(e) }, "error");
    }
  }

  return data as Booking;
}

/** True if we have enough to create a meaningful booking record. */
export function bookingHasEssentials(booking?: IntentResult["booking"]): boolean {
  if (!booking) return false;
  // Need at least a service or a date to be worth recording.
  return Boolean(booking.service || booking.date);
}

function normaliseDate(input?: string): string | null {
  if (!input) return null;
  // Accept ISO date directly; otherwise store raw text in notes via caller.
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(input)) return input;
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null; // keep null rather than store a bad date; raw text stays in notes
}

/** Mark a booking confirmed/cancelled/completed (used by API + dashboard). */
export async function setBookingStatus(
  bookingId: string,
  status: Booking["status"]
): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Booking;
}
