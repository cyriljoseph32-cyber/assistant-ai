# Coco — AI front desk for service businesses

Next.js 14 (App Router) + TypeScript app: an AI receptionist that answers customers on WhatsApp/email via Claude, plus the owner's web console (assistant chat, inbox, CRM, knowledge, activity).

## Commands

- `npm run dev` — dev server (localhost:3000)
- `npm run build` — production build (must pass before pushing)
- `npm run typecheck` — `tsc --noEmit` (must pass before pushing)
- `npm run lint` — next lint

Env vars: see `.env.example`. `src/lib/config.ts` reads them lazily, so build/typecheck work without any env set. Never read `process.env` directly — always go through `env` in `config.ts`.

## Architecture

Three layers; respect the direction of dependencies (app → services → lib):

- `src/lib/` — clients + config. `supabase.ts` (service-role client, server-only), `anthropic.ts` (completeText / completeJson / streamText), `twilio.ts`, `gmail.ts`, `auth.ts` (dashboard session), `config.ts`, `types.ts` (mirrors `supabase/schema.sql` — keep in sync).
- `src/services/` — business logic, no HTTP concerns. `message.service` handles inbound customer messages (called by the WhatsApp webhook + email cron); `ai.service` is the two-step pipeline (detectIntent → generateReply, guardrails escalate on complaint/urgent/low confidence); `crm.service` is the data layer everything builds on; `report.service` builds the daily summary.
- `src/app/api/` — thin route handlers: parse (zod) → auth → call a service. Owner-facing routes are guarded by `requireAuth()` from `lib/auth.ts` (session cookie, with legacy `x-dashboard-password` header fallback). Cron routes use `CRON_SECRET`; the Twilio webhook validates signatures.
- `src/app/page.tsx` — the **public** marketing/sales landing at `/` (no auth). The console lives behind login.
- `src/app/(app)/` — the authenticated console (assistant chat home `/assistant`, plus `/inbox`, `/leads`, `/bookings`, `/knowledge`, `/activity`). The route-group layout checks the session server-side and redirects to `/login`; login lands on `/assistant`.
- `src/prompts/index.ts` — all customer-facing system prompts, built from the live `businesses` row (FAQ, services, tone). The owner edits this data on `/knowledge`.

Single-tenant per deployment: every query is scoped to `env.businessId`.

## Design system

No Tailwind, no UI library. All styling lives in `src/app/globals.css` as a token-based system (CSS custom properties + component classes: `.btn`, `.card`, `.pill`, `.input`, `.table-wrap`, …). Rules:

- Use the existing tokens/classes; add new tokens to `:root` (+ dark equivalents under the `dark` blocks) rather than hardcoding colors.
- Light-first with automatic dark mode; neutral warm palette, single green accent (`--accent`). No gradients, no decorative blobs.
- Fonts: Inter via `next/font` (`--font-sans`) for UI, Fraunces (`--font-display`) for the "Coco" wordmark + hero headings only; both exposed on `<html>` in `layout.tsx`. `--premium` is a warm brass accent used sparingly (never as body text).
- Brand: the "Coco" wordmark uses the `Monogram` from `src/components/icons.tsx` + `.wordmark` — reuse it, don't re-draw the mark.
- Owner/business email is `env.ownerEmail` (`OWNER_EMAIL`, default `cyril.joseph@coco-samui-ai.com`): it's the Gmail `login_hint` and the landing's contact/demo address.
- Icons: inline SVG (1.5px stroke) in `src/components/icons.tsx` — no icon library.
- Mobile: sidebar collapses to a bottom tab bar under 900px; every page must work at 390px wide.

## Conventions

- Route handlers export `runtime = "nodejs"`; data routes that must not cache export `dynamic = "force-dynamic"`.
- Validate all request bodies with zod `safeParse` → 400 with `error.flatten()`.
- Client pages fetch same-origin APIs (session cookie is sent automatically) — no auth headers in browser code.
- Customer-facing AI messages are logged via `crm.service.logMessage` with `sender: "ai" | "human"`; automation events via `logAutomation` — keep this so `/activity` stays truthful.
