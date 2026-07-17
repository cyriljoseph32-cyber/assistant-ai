// ===========================================================================
// POST /api/assistant/chat  { messages: [{ role, content }] }
// The owner's copilot. Builds a live snapshot of the business (leads,
// bookings, escalations, recent conversations, daily stats) and streams a
// Claude reply grounded in it. Response body is plain streamed text.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { streamText } from "@/lib/anthropic";
import { requireAuth } from "@/lib/auth";
import { env } from "@/lib/config";
import { rateLimit } from "@/lib/ratelimit";
import { getBusiness } from "@/services/crm.service";
import { buildDailyReport } from "@/services/report.service";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(30),
});

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  // Single-tenant: one global bucket is enough to cap Claude spend.
  if (!rateLimit("assistant-chat", 30, 60_000)) {
    return NextResponse.json(
      { error: "too many messages — give it a minute" },
      { status: 429 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let system: string;
  try {
    system = await buildSystemPrompt();
  } catch (e) {
    console.error("assistant snapshot failed:", e);
    return NextResponse.json({ error: "assistant unavailable" }, { status: 503 });
  }

  return new Response(streamText({ system, messages: parsed.data.messages }), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

async function buildSystemPrompt(): Promise<string> {
  const bid = env.businessId;
  const [business, report, leads, bookings, escalations, conversations] =
    await Promise.all([
      getBusiness(bid),
      buildDailyReport(bid),
      supabase
        .from("leads")
        .select("status, interest, last_intent, last_message_at, contacts(name, whatsapp)")
        .eq("business_id", bid)
        .order("last_message_at", { ascending: false })
        .limit(20),
      supabase
        .from("bookings")
        .select("status, service_name, date, time, pax, pickup, notes, contacts(name, whatsapp)")
        .eq("business_id", bid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("escalations")
        .select("reason, message, created_at, contacts(name, whatsapp)")
        .eq("business_id", bid)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("conversations")
        .select("status, channel, last_message_at, contacts(name, whatsapp)")
        .eq("business_id", bid)
        .order("last_message_at", { ascending: false })
        .limit(10),
    ]);

  const j = (x: unknown) => JSON.stringify(x ?? []);

  return [
    `You are Coco, the operations copilot for "${business.name}" (${business.industry ?? "service business"}). You are talking to the owner${business.owner_name ? `, ${business.owner_name}` : ""}, inside their private console.`,
    ``,
    `You also run the customer-facing AI front desk on WhatsApp for this business, so you can speak to what "you" said to customers. Complaints, urgent messages, and low-confidence cases are escalated to the owner instead of answered automatically.`,
    ``,
    `Live business snapshot (may be minutes old):`,
    `- Daily stats: ${j(report.stats)}`,
    `- Recent leads (newest first): ${j(leads.data)}`,
    `- Recent bookings: ${j(bookings.data)}`,
    `- Open escalations (waiting for the owner): ${j(escalations.data)}`,
    `- Recent conversations: ${j(conversations.data)}`,
    `- Services: ${business.services_summary ?? "n/a"}`,
    ``,
    `Guidelines:`,
    `- Be direct and concise; this is a busy owner on their phone. Plain text, short paragraphs or dashes — no markdown headings or tables.`,
    `- Ground every claim in the snapshot. If the data doesn't show something, say so plainly rather than guessing.`,
    `- When asked to draft a customer message, write it ready-to-send in the business tone ("${business.tone ?? "friendly, professional"}") and remind them to send it from the Inbox.`,
    `- When something needs action (unconfirmed bookings, open escalations, cooling leads), say what to do, not just what exists.`,
    `- You cannot change data yourself. Point to the right place instead: Inbox (reply/takeover), Leads, Bookings (confirm/cancel), Knowledge (edit what the AI knows), Activity (escalations & log).`,
  ].join("\n");
}
