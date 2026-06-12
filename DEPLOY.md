# Deploy — GitHub → Vercel

Follow these in order. Commands are for **Windows PowerShell**, run from inside
the `samui-ai-assistant` folder.

---

## 0. Remove the leftover `.git` folder (one-time)

A partial `.git` folder was created automatically and is broken. Delete it so we
start clean:

```powershell
Remove-Item -Recurse -Force .git
```

(If Explorer is easier: turn on "Hidden items" in the View menu, delete the
`.git` folder.)

---

## 1. Confirm it builds locally (recommended, 2 min)

```powershell
npm install
npm run build
```

The build should pass even without any env vars set (config is lazy). If it
passes, you're safe to deploy.

---

## 2. Create the GitHub repo + push

```powershell
git init
git add -A
git commit -m "Samui AI Assistant MVP"
git branch -M main
```

Then create an empty repo on GitHub (no README/gitignore) at
https://github.com/new — name it e.g. `samui-ai-assistant` (Private is fine).
Copy the URL it shows you and run:

```powershell
git remote add origin https://github.com/<your-username>/samui-ai-assistant.git
git push -u origin main
```

---

## 3. Import into Vercel

1. Go to https://vercel.com/new and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build settings default.
3. **Before clicking Deploy**, expand **Environment Variables** and add the keys
   below (you can also add them later under Settings → Environment Variables).
4. Deploy. Vercel reads `vercel.json` and registers the two cron jobs.

### Environment variables to set in Vercel

| Key | Status | Where to get it |
|-----|--------|-----------------|
| `ANTHROPIC_API_KEY` | ✅ you have this | console.anthropic.com |
| `ANTHROPIC_MODEL` | optional | leave as `claude-haiku-4-5-20251001` |
| `NEXT_PUBLIC_SUPABASE_URL` | ⛔ still needed | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ⛔ still needed | Supabase → Settings → API (service_role) |
| `TWILIO_ACCOUNT_SID` | ⛔ still needed | Twilio Console |
| `TWILIO_AUTH_TOKEN` | ⛔ still needed | Twilio Console |
| `TWILIO_WHATSAPP_FROM` | ⛔ still needed | sandbox: `whatsapp:+14155238886` |
| `TWILIO_VALIDATE_SIGNATURE` | set `true` | — |
| `BUSINESS_ID` | set | `11111111-1111-1111-1111-111111111111` (matches the seed) |
| `OWNER_WHATSAPP` | set | your number, e.g. `+66633753316` |
| `CRON_SECRET` | set | any long random string |
| `APP_BASE_URL` | set after first deploy | `https://<your-app>.vercel.app` |
| `DASHBOARD_PASSWORD` | set | a strong password |

> The app will **deploy and the dashboard will load** with just the keys you
> have. AI replies need `ANTHROPIC_API_KEY`; saving data needs Supabase; sending
> WhatsApp needs Twilio. Add the missing three when you're ready and redeploy.

---

## 4. Two things still required to go live

You picked "GitHub → Vercel" and have **Anthropic** ready. To make it actually
answer WhatsApp messages, you still need:

### a) Supabase (database) — ~5 min
1. Create a free project at https://supabase.com.
2. SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
3. Copy the project URL + `service_role` key into the Vercel env vars above.

### b) Twilio WhatsApp — ~10 min
1. Create an account at https://twilio.com.
2. Messaging → Try it out → WhatsApp sandbox; join it from your phone.
3. Copy Account SID + Auth Token into Vercel.
4. Set the sandbox **"When a message comes in"** webhook (HTTP POST) to:
   `https://<your-app>.vercel.app/api/webhooks/whatsapp`
5. Update `APP_BASE_URL` to your real Vercel URL and redeploy.

---

## 5. Verify it's live

- Visit `https://<your-app>.vercel.app/dashboard` → log in with
  `DASHBOARD_PASSWORD`.
- WhatsApp the Twilio sandbox number "Hi, do you have a boat trip Saturday for
  2?" → you should get an AI reply and see a lead + booking appear.
- Vercel → your project → **Cron Jobs** tab shows the hourly follow-up and daily
  report runs.

Every later change: `git add -A && git commit -m "..." && git push` →
Vercel auto-deploys.
