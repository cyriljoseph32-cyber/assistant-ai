// ===========================================================================
// AI service — the two AI calls the MVP needs:
//   1) detectIntent: classify the message + extract booking details (JSON).
//   2) generateReply: write the customer-facing WhatsApp reply (text).
// ===========================================================================

import { completeJson, completeText } from "@/lib/anthropic";
import {
  bookingSystemPrompt,
  complaintSystemPrompt,
  conversationToUserTurn,
  intentSystemPrompt,
  receptionistSystemPrompt,
} from "@/prompts";
import type { Business, IntentResult, Message } from "@/lib/types";

const VALID_INTENTS = new Set([
  "greeting",
  "booking_request",
  "availability_question",
  "price_question",
  "general_question",
  "complaint",
  "urgent",
  "review_response",
  "cancellation",
  "other",
]);

/** Classify a message + extract booking info. Defaults to escalation on error. */
export async function detectIntent(
  business: Business,
  history: Message[],
  latest: string
): Promise<IntentResult> {
  try {
    const result = await completeJson<IntentResult>({
      system: intentSystemPrompt(business),
      user: conversationToUserTurn(history, latest),
      maxTokens: 400,
    });

    // Normalise + guardrails
    if (!VALID_INTENTS.has(result.intent)) result.intent = "other";
    result.language = (result.language || "en").toLowerCase().slice(0, 2);
    result.confidence = typeof result.confidence === "number" ? result.confidence : 0.4;
    if (result.intent === "complaint" || result.intent === "urgent") {
      result.escalate = true;
    }
    if (result.confidence < 0.5) result.escalate = true;
    return result;
  } catch (e) {
    // If the model returns malformed JSON, fail safe → human handles it.
    return {
      intent: "other",
      language: "en",
      confidence: 0,
      escalate: true,
      summary: "Could not auto-classify message.",
    };
  }
}

/** Generate the reply text for a given intent. */
export async function generateReply(
  business: Business,
  intent: IntentResult,
  history: Message[],
  latest: string
): Promise<string> {
  const userTurn = conversationToUserTurn(history, latest);

  let system: string;
  if (intent.intent === "complaint" || intent.intent === "urgent") {
    system = complaintSystemPrompt(business);
  } else if (intent.intent === "booking_request") {
    system = bookingSystemPrompt(business, intent.booking ?? {});
  } else {
    system = receptionistSystemPrompt(business);
  }

  const reply = await completeText({
    system,
    user: userTurn,
    maxTokens: 350,
    temperature: 0.4,
  });

  return reply || "Thanks for your message! Our team will get back to you shortly. 🙂";
}
