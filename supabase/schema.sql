-- ===========================================================================
-- Samui AI Assistant — Database schema (Supabase / Postgres)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: uses "if not exists" and idempotent enums.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- Enums -----------------------------------------------------------------
do $$ begin
  create type lead_status as enum ('new','contacted','qualified','won','lost','cold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('requested','pending','confirmed','cancelled','completed','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_direction as enum ('inbound','outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_sender as enum ('customer','ai','human','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_status as enum ('open','escalated','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type followup_status as enum ('scheduled','sent','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status as enum ('pending','requested','left','declined');
exception when duplicate_object then null; end $$;

-- --- 1. businesses ---------------------------------------------------------
create table if not exists businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  industry      text,                          -- dive_center | tour_operator | villa | spa | transport...
  owner_name    text,
  owner_whatsapp text,                          -- E.164, e.g. +66633753316
  timezone      text not null default 'Asia/Bangkok',
  currency      text not null default 'THB',
  languages     text[] not null default '{en,fr,th}',
  tone          text default 'friendly, warm, professional, concise',
  faq           jsonb not null default '[]',    -- [{q,a}]
  services_summary text,                        -- free text the AI can quote from
  review_link   text,
  created_at    timestamptz not null default now()
);

-- --- 2. contacts -----------------------------------------------------------
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text,
  whatsapp    text not null,                    -- E.164
  email       text,
  language    text default 'en',
  notes       text,
  created_at  timestamptz not null default now(),
  unique (business_id, whatsapp)
);

-- --- 3. leads --------------------------------------------------------------
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  contact_id    uuid not null references contacts(id) on delete cascade,
  status        lead_status not null default 'new',
  source        text default 'whatsapp',        -- whatsapp | missed_call | manual
  interest      text,                            -- "boat trip Koh Tao", "PADI Open Water"...
  last_intent   text,
  last_message_at timestamptz default now(),
  created_at    timestamptz not null default now()
);

-- --- 4. conversations ------------------------------------------------------
create table if not exists conversations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  contact_id   uuid not null references contacts(id) on delete cascade,
  channel      text not null default 'whatsapp',
  status       conversation_status not null default 'open',
  language     text default 'en',
  last_message_at timestamptz default now(),
  created_at   timestamptz not null default now()
);

-- --- 5. messages -----------------------------------------------------------
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  contact_id      uuid not null references contacts(id) on delete cascade,
  direction       message_direction not null,
  sender          message_sender not null,
  body            text not null,
  intent          text,
  language        text,
  provider_sid    text,                          -- Twilio MessageSid (dedupe)
  created_at      timestamptz not null default now()
);

-- --- 6. services (what the business sells) ---------------------------------
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric,
  currency    text default 'THB',
  duration    text,                              -- "full day", "2h"
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- --- 7. bookings -----------------------------------------------------------
create table if not exists bookings (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  contact_id    uuid not null references contacts(id) on delete cascade,
  lead_id       uuid references leads(id) on delete set null,
  service_id    uuid references services(id) on delete set null,
  service_name  text,                            -- denormalised for quick display
  status        booking_status not null default 'requested',
  date          date,
  time          text,
  pax           int,                             -- number of people
  pickup        text,
  notes         text,
  review_status review_status not null default 'pending',
  created_at    timestamptz not null default now()
);

-- --- 8. tasks (owner to-dos surfaced by the system) ------------------------
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title       text not null,
  detail      text,
  due_at      timestamptz,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- --- 9. follow_ups ---------------------------------------------------------
create table if not exists follow_ups (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id     uuid not null references leads(id) on delete cascade,
  contact_id  uuid not null references contacts(id) on delete cascade,
  step        int not null default 1,            -- 1 = 24h, 2 = 3d, 3 = 7d
  scheduled_at timestamptz not null,
  status      followup_status not null default 'scheduled',
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- --- 10. reviews -----------------------------------------------------------
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  contact_id  uuid not null references contacts(id) on delete cascade,
  booking_id  uuid references bookings(id) on delete set null,
  status      review_status not null default 'requested',
  sentiment   text,                              -- positive | negative | unknown
  requested_at timestamptz default now(),
  responded_at timestamptz,
  created_at  timestamptz not null default now()
);

-- --- 11. escalations (human handoff) ---------------------------------------
create table if not exists escalations (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  reason          text not null,                 -- complaint | urgent | low_confidence | manual
  message         text,
  resolved        boolean not null default false,
  created_at      timestamptz not null default now()
);

-- --- 12. automation_logs ---------------------------------------------------
create table if not exists automation_logs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  event       text not null,                     -- inbound_message | ai_reply | booking_created ...
  level       text not null default 'info',      -- info | warn | error
  detail      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- --- Indexes ---------------------------------------------------------------
create index if not exists idx_contacts_business      on contacts(business_id);
create index if not exists idx_leads_business_status  on leads(business_id, status);
create index if not exists idx_conv_business_status   on conversations(business_id, status);
create index if not exists idx_messages_conv          on messages(conversation_id, created_at);
create index if not exists idx_messages_sid           on messages(provider_sid);
create index if not exists idx_bookings_business      on bookings(business_id, status, date);
create index if not exists idx_followups_due          on follow_ups(status, scheduled_at);
create index if not exists idx_reviews_business       on reviews(business_id, status);
create index if not exists idx_escalations_open       on escalations(business_id, resolved);
create index if not exists idx_logs_business          on automation_logs(business_id, created_at);

-- ===========================================================================
-- Seed: one demo business so the MVP works out of the box.
-- Replace the UUID below with the value you put in BUSINESS_ID (.env).
-- ===========================================================================
insert into businesses (id, name, industry, owner_name, owner_whatsapp, languages, services_summary, review_link, faq)
values (
  '11111111-1111-1111-1111-111111111111',
  'Discovery Divers Samui',
  'dive_center',
  'Cyril',
  '+66633753316',
  '{en,fr,th}',
  'Daily diving trips to Koh Tao and Sail Rock. Fun dives, PADI courses (Open Water, Advanced, Rescue), and snorkelling. Price includes hotel pickup on Samui, lunch, drinks, equipment, and a certified instructor. Trips run from Samui by boat; most dives are around Koh Tao / Sail Rock.',
  'https://g.page/r/your-google-review-link',
  '[
    {"q":"Where do you dive?","a":"Most trips go to Koh Tao and Sail Rock. We pick you up on Samui and travel by boat."},
    {"q":"Do I need experience?","a":"No. We run Discover Scuba for first-timers and full PADI courses, plus fun dives for certified divers."},
    {"q":"What is included?","a":"Hotel pickup on Samui, lunch, drinks, all equipment, and a certified instructor."}
  ]'
)
on conflict (id) do nothing;

-- A couple of demo services
insert into services (business_id, name, description, price, duration)
values
  ('11111111-1111-1111-1111-111111111111','2 Fun Dives Koh Tao','Two guided dives for certified divers, incl. pickup, lunch, gear',3500,'full day'),
  ('11111111-1111-1111-1111-111111111111','Discover Scuba','First-time diving experience with an instructor',4000,'full day'),
  ('11111111-1111-1111-1111-111111111111','PADI Open Water Course','3-4 day entry-level certification',14500,'3-4 days')
on conflict do nothing;
