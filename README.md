# Samui AI Assistant — MVP

An AI WhatsApp assistant + lightweight CRM for Koh Samui service businesses
(dive centers, tour operators, villa managers, spas, transport, restaurants).

It answers WhatsApp messages with Claude, detects intent and language, captures
leads, records booking requests, escalates to a human when needed, nurtures
quiet leads with automatic follow-ups, asks happy customers for reviews, and
sends the owner a daily summary — all on a stack you can deploy and sell in days.

## Stack (and why)

| Layer            | Choice                    | Why it's the fastest way to ship |
|------------------|---------------------------|----------------------------------|
| App + API        | **Next.js (TypeScript)**  | One repo for API routes + dashboard, deploys to Vercel in one click. |
| AI               | **Claude API** (Haiku)    | Cheap, fast, multilingual (EN/FR/TH + tourist languages). |
| Database / CRM   | **Supabase (Postgres)**   | Hosted SQL, free tier, instant REST, no infra to run. |
| WhatsApp         | **Twilio WhatsApp**       | Sandbox in minutes; production sender later. |
| Scheduling       | **Vercel Cron**           | Built-in — no separate worker for follow-ups + daily report. |
| Hosting          | **Vercel**                | Free tier, HTTPS webhook URL out of the box. |

One deployment serves **one business** (set by `BUSINESS_ID`). To onboard a
second client, duplicate the deployment with new env vars — no code changes.

## What's included (MVP scope)

1. WhatsApp inbound webhook (`/api/webhooks/whatsapp`)
2. AI intent + language detection (`ai.service.ts`)
3. CRM contact creation (`crm.service.ts`)
4. Lead creation + status flow
5. Booking request flow (`booking.service.ts`)
6. Human escalation + owner WhatsApp alert (`escalation.service.ts`)
7. Follow-up automation — 24h / 3d / 7d (`followup.service.ts` + hourly cron)
8. Review request automation (`review.service.ts` + daily cron)
9. Daily owner report (`report.service.ts` + daily cron)
10. Simple admin dashboard (`/dashboard`)

---

## 1. Setup

### Prerequisites
- Node.js 18.18+
- A [Supabase](https://supabase.com) project (free)
- An [Anthropic API key](https://console.anthropic.com)
- A [Twilio](https://console.twilio.com) account with WhatsApp (sandbox is fine)

### Install
```bash
cd samui-ai-assistant
npm install
cp .env.example .env.local
# then fill in .env.local (see comments in the file)
```

### Database
1. Open Supabase → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/schema.sql` and **Run**.
3. The seed creates a demo business with id
   `11111111-1111-1111-1111-111111111111`. Put that same id in `BUSINESS_ID`,
   or change both to your own UUID.
4. Edit the seeded business row (name, `owner_whatsapp`, `review_link`,
   `services_summary`, `faq`) to match your real client.

### Run locally
```bash
npm run dev          # http://localhost:3000  -> redirects to /dashboard
npm run typecheck    # verify types compile
```

---

## 2. Connect WhatsApp (Twilio sandbox — fastest path)

1. Twilio Console → **Messaging → Try it out → Send a WhatsApp message**.
2. Join the sandbox from your phone (send the `join <code>` message).
3. Expose your local server so Twilio can reach it:
   ```bash
   npx localtunnel --port 3000        # or: ngrok http 3000
   ```
4. Set `APP_BASE_URL` in `.env.local` to that public URL, restart `npm run dev`.
5. In the sandbox settings, set **"When a message comes in"** to:
   ```
   https://<your-public-url>/api/webhooks/whatsapp   (HTTP POST)
   ```
6. For local testing you can set `TWILIO_VALIDATE_SIGNATURE=false`. **Set it
   back to `true` in production.**

Now WhatsApp the sandbox number — the assistant replies, and a lead + contact
appear in the dashboard.

---

## 3. Testing

### A. Smoke test the AI + DB without WhatsApp
Simulate an inbound message by POSTing the same form fields Twilio sends
(works with signature validation off):

```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+66811112222" \
  --data-urlencode "Body=Hi! Do you have a boat trip to Koh Tao this Saturday for 2 people?" \
  --data-urlencode "ProfileName=Test Tourist" \
  --data-urlencode "MessageSid=SMtest0001"
```
Expected: a `booking_request` is detected, a contact + lead + booking row are
created, and (if Twilio creds are real) a WhatsApp reply is sent.

### B. Read data via the API
```bash
curl "http://localhost:3000/api/leads"
curl "http://localhost:3000/api/bookings?status=requested"
curl "http://localhost:3000/api/escalate"
curl -H "x-dashboard-password: change-me" http://localhost:3000/api/dashboard/data
```

### C. Trigger a complaint → escalation
```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+66811113333" \
  --data-urlencode "Body=This is terrible, nobody picked us up and I want a refund!" \
  --data-urlencode "MessageSid=SMtest0002"
```
Expected: `intent=complaint`, escalation row created, owner gets a WhatsApp alert.

### D. Run the cron jobs manually
```bash
curl "http://localhost:3000/api/cron/followups?secret=$CRON_SECRET"
curl "http://localhost:3000/api/cron/daily-report?secret=$CRON_SECRET"
```

### Testing checklist
- [ ] Inbound greeting → friendly reply in the customer's language
- [ ] Booking message → booking row in `requested`, owner notified
- [ ] Complaint → escalation row + owner alert + calming reply
- [ ] Confirm a booking in the dashboard → status flips to `confirmed`
- [ ] Mark a booking `completed` → review request sent + review row created
- [ ] Follow-up cron sends a nudge for a quiet lead, then chains step 2/3
- [ ] Daily-report cron sends the owner a summary
- [ ] Re-sending the same `MessageSid` is ignored (dedupe)
- [ ] `npm run typecheck` passes

---

## 4. Deployment (Vercel)

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Add every variable from `.env.example` under **Settings → Environment
   Variables** (Production). Set `TWILIO_VALIDATE_SIGNATURE=true` and
   `APP_BASE_URL=https://<your-app>.vercel.app`.
4. Deploy. Vercel reads `vercel.json` and registers the two crons:
   - `/api/cron/followups` — hourly
   - `/api/cron/daily-report` — daily at 12:00 UTC (**19:00 Asia/Bangkok**)
   Vercel automatically sends the `CRON_SECRET` as a bearer token.
5. Point the Twilio webhook (sandbox or production sender) at
   `https://<your-app>.vercel.app/api/webhooks/whatsapp`.
6. Protect the dashboard: set a strong `DASHBOARD_PASSWORD`, and optionally turn
   on **Vercel → Settings → Deployment Protection** for defence in depth.

### Going from sandbox to a real WhatsApp number
Apply for a Twilio WhatsApp sender (or use a Twilio Messaging Service). Once
approved, set `TWILIO_WHATSAPP_FROM` to your business number and re-point the
webhook. No code changes needed.

---

## 5. Project structure

```
src/
  lib/         clients + config (supabase, anthropic, twilio, env, types)
  prompts/     all Claude prompts (intent, receptionist, booking, review, follow-up)
  services/    business logic (ai, crm, message, booking, escalation, followup, review, report)
  app/api/     HTTP routes (webhook, contacts, leads, bookings, escalate, cron, dashboard)
  app/dashboard  the admin UI
supabase/schema.sql   the full database
vercel.json           cron schedules
```

## 6. Notes, limits & scaling

- **One business per deployment** keeps the MVP simple. The schema is already
  multi-tenant (`business_id` everywhere), so multi-tenant routing is a small
  later step.
- **Bookings are "requested", not auto-confirmed.** A human confirms real
  availability from the dashboard — safest behaviour for a first client.
- **Higher volume:** the webhook currently processes synchronously. If a client
  gets very high traffic, enqueue the message (e.g. Supabase queue / Upstash)
  in the webhook and process in a worker so Twilio always gets a fast 200.
- **Cost control:** uses Claude Haiku by default. Switch `ANTHROPIC_MODEL` to a
  larger model only if reply quality needs it.
- **Compliance:** WhatsApp requires opt-in and has a 24h customer-service
  window. For proactive follow-ups outside 24h you'll need approved message
  templates — see Twilio's WhatsApp template docs before going live at scale.
```
