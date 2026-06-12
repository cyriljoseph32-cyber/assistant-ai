// ===========================================================================
// Follow-up service — automatic lead nurture.
//   Step 1: 24h after last contact
//   Step 2: 3 days
//   Step 3: 7 days  -> then mark lead "cold"
// scheduleFollowUp() is called when we reply to a new/quiet lead.
// runDueFollowUps() is called by the hourly cron.
// cancelFollowUps() is called whenever the customer replies again.
// ===========================================================================

import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { followUpMessage } from "@/prompts";
import { getBusiness, logAutomation } from "./crm.service";
import type { Business, Contact, FollowUp, Lead } from "@/lib/types";

const STEP_DELAYS_MS = [
  24 * 60 * 60 * 1000, // step 1 -> 24h
  3 * 24 * 60 * 60 * 1000, // step 2 -> 3 days
  7 * 24 * 60 * 60 * 1000, // step 3 -> 7 days
];

/** Schedule the next pending follow-up for a lead (step defaults to 1). */
export async function scheduleFollowUp(
  businessId: string,
  lead: Lead,
  contact: Contact,
  step = 1
): Promise<void> {
  if (step > 3) return;

  // Don't double-schedule.
  const { data: existing } = await supabase
    .from("follow_ups")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("status", "scheduled")
    .maybeSingle();
  if (existing) return;

  const scheduledAt = new Date(Date.now() + STEP_DELAYS_MS[step - 1]).toISOString();
  await supabase.from("follow_ups").insert({
    business_id: businessId,
    lead_id: lead.id,
    contact_id: contact.id,
    step,
    scheduled_at: scheduledAt,
    status: "scheduled",
  });
  await logAutomation(businessId, "followup_scheduled", { lead_id: lead.id, step });
}

/** Cancel pending follow-ups — call this when the customer replies. */
export async function cancelFollowUps(leadId: string): Promise<void> {
  await supabase
    .from("follow_ups")
    .update({ status: "cancelled" })
    .eq("lead_id", leadId)
    .eq("status", "scheduled");
}

/** Cron entry point: send every follow-up that is due, then chain the next. */
export async function runDueFollowUps(): Promise<{ sent: number }> {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .limit(100);

  const items = (due ?? []) as FollowUp[];
  let sent = 0;

  // Cache businesses to avoid refetching per item.
  const businessCache = new Map<string, Business>();

  for (const fu of items) {
    try {
      let business = businessCache.get(fu.business_id);
      if (!business) {
        business = await getBusiness(fu.business_id);
        businessCache.set(fu.business_id, business);
      }

      const { data: contact } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", fu.contact_id)
        .single();
      const { data: lead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", fu.lead_id)
        .single();

      if (!contact || !lead) {
        await supabase.from("follow_ups").update({ status: "cancelled" }).eq("id", fu.id);
        continue;
      }

      // If the lead already converted or went cold, skip.
      if (["won", "lost", "cold"].includes((lead as Lead).status)) {
        await supabase.from("follow_ups").update({ status: "cancelled" }).eq("id", fu.id);
        continue;
      }

      const body = followUpMessage(
        business,
        fu.step,
        (lead as Lead).interest ?? undefined,
        (contact as Contact).name ?? undefined
      );
      await sendWhatsApp((contact as Contact).whatsapp, body);

      await supabase
        .from("follow_ups")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", fu.id);

      sent++;

      // Chain the next step, or mark the lead cold after step 3.
      if (fu.step < 3) {
        await scheduleFollowUp(fu.business_id, lead as Lead, contact as Contact, fu.step + 1);
      } else {
        await supabase.from("leads").update({ status: "cold" }).eq("id", fu.lead_id);
      }

      await logAutomation(fu.business_id, "followup_sent", { lead_id: fu.lead_id, step: fu.step });
    } catch (e) {
      await logAutomation(fu.business_id, "followup_failed", { id: fu.id, error: String(e) }, "error");
    }
  }

  return { sent };
}
