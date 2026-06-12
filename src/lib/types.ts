// ===========================================================================
// Shared domain + database types.
// These mirror supabase/schema.sql. Keep them in sync.
// ===========================================================================

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "won"
  | "lost"
  | "cold";

export type BookingStatus =
  | "requested"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type MessageDirection = "inbound" | "outbound";
export type MessageSender = "customer" | "ai" | "human" | "system";
export type ConversationStatus = "open" | "escalated" | "closed";
export type FollowUpStatus = "scheduled" | "sent" | "cancelled";
export type ReviewStatus = "pending" | "requested" | "left" | "declined";

// The fixed set of intents the AI is allowed to return.
export type Intent =
  | "greeting"
  | "booking_request"
  | "availability_question"
  | "price_question"
  | "general_question"
  | "complaint"
  | "urgent"
  | "review_response"
  | "cancellation"
  | "other";

export interface Business {
  id: string;
  name: string;
  industry: string | null;
  owner_name: string | null;
  owner_whatsapp: string | null;
  timezone: string;
  currency: string;
  languages: string[];
  tone: string | null;
  faq: { q: string; a: string }[];
  services_summary: string | null;
  review_link: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  name: string | null;
  whatsapp: string;
  email: string | null;
  language: string | null;
  notes: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  contact_id: string;
  status: LeadStatus;
  source: string | null;
  interest: string | null;
  last_intent: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  business_id: string;
  contact_id: string;
  channel: string;
  status: ConversationStatus;
  language: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  business_id: string;
  conversation_id: string;
  contact_id: string;
  direction: MessageDirection;
  sender: MessageSender;
  body: string;
  intent: string | null;
  language: string | null;
  provider_sid: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  duration: string | null;
  active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  business_id: string;
  contact_id: string;
  lead_id: string | null;
  service_id: string | null;
  service_name: string | null;
  status: BookingStatus;
  date: string | null;
  time: string | null;
  pax: number | null;
  pickup: string | null;
  notes: string | null;
  review_status: ReviewStatus;
  created_at: string;
}

export interface FollowUp {
  id: string;
  business_id: string;
  lead_id: string;
  contact_id: string;
  step: number;
  scheduled_at: string;
  status: FollowUpStatus;
  sent_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  contact_id: string;
  booking_id: string | null;
  status: ReviewStatus;
  sentiment: string | null;
  requested_at: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface Escalation {
  id: string;
  business_id: string;
  conversation_id: string | null;
  contact_id: string | null;
  reason: string;
  message: string | null;
  resolved: boolean;
  created_at: string;
}

// Structured result returned by the AI intent step.
export interface IntentResult {
  intent: Intent;
  language: string; // ISO code: en, fr, th, de, ru...
  confidence: number; // 0..1
  escalate: boolean; // true => hand to human
  booking?: {
    service?: string;
    date?: string;
    time?: string;
    pax?: number;
    pickup?: string;
    notes?: string;
  };
  summary?: string; // one-line summary of what the customer wants
}
