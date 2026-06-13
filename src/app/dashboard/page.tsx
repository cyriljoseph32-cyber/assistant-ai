"use client";

// ===========================================================================
// Admin dashboard (MVP) with human take-over.
// Password-gated. Shows the daily summary, open escalations ("need a human"),
// bookings and leads — and lets the owner REPLY to any customer on WhatsApp
// straight from here, then resolve.
// ===========================================================================

import { useState } from "react";

type Row = Record<string, any>;

interface DashData {
  leads: Row[];
  bookings: Row[];
  escalations: Row[];
  report: { text: string; stats: Record<string, number> };
}

interface Composer {
  contactId: string;
  conversationId?: string;
  escalationId?: string;
  name: string;
}

export default function Dashboard() {
  const [pw, setPw] = useState("");
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Human take-over composer
  const [composer, setComposer] = useState<Composer | null>(null);
  const [composerText, setComposerText] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [toast, setToast] = useState("");

  async function load(password = pw) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/data", {
        headers: { "x-dashboard-password": password },
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Wrong password.");
        setData(null);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  async function patch(url: string, body: Row) {
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function checkEmail() {
    setEmailBusy(true);
    try {
      const res = await fetch("/api/cron/email", {
        headers: { "x-dashboard-password": pw },
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast("❌ " + (j.error?.toString?.() || "Email check failed"));
      } else {
        setToast(`✅ Emails: ${j.processed ?? 0} read, ${j.replied ?? 0} replied, ${j.escalated ?? 0} escalated`);
        await load();
      }
    } catch {
      setToast("❌ Email check failed");
    } finally {
      setEmailBusy(false);
      setTimeout(() => setToast(""), 5000);
    }
  }

  function openComposer(c: Composer) {
    setComposer(c);
    setComposerText("");
  }

  async function sendReply() {
    if (!composer || !composerText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dashboard-password": pw },
        body: JSON.stringify({
          contact_id: composer.contactId,
          conversation_id: composer.conversationId,
          body: composerText.trim(),
          resolve_escalation_id: composer.escalationId,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast("❌ " + (j.error?.toString?.() || "Send failed"));
      } else {
        setToast("✅ Reply sent to " + composer.name);
        setComposer(null);
        setComposerText("");
        await load();
      }
    } catch {
      setToast("❌ Send failed");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 4000);
    }
  }

  // ---- Login ----
  if (!data) {
    return (
      <div className="wrap login">
        <h1>Coco AI</h1>
        <p className="sub">Enter the dashboard password.</p>
        <input
          type="password"
          value={pw}
          placeholder="Password"
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={() => load()} disabled={loading}>
          {loading ? "Loading…" : "Open dashboard"}
        </button>
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
      </div>
    );
  }

  const s = data.report.stats;

  return (
    <div className="wrap">
      <h1>Coco AI</h1>
      <p className="sub">
        Live overview ·{" "}
        <a onClick={() => load()} style={{ cursor: "pointer" }}>
          refresh
        </a>
        {"  ·  "}
        <button
          className="ghost"
          onClick={checkEmail}
          disabled={emailBusy}
          style={{ marginLeft: 6 }}
        >
          {emailBusy ? "Checking…" : "✉️ Check email"}
        </button>
      </p>

      <div className="cards">
        <Stat n={s.newLeads} l="New leads (24h)" />
        <Stat n={s.requestedBookings} l="Booking requests" />
        <Stat n={s.openEscalations} l="Need a human" />
        <Stat n={s.tomorrowBookings} l="Trips tomorrow" />
        <Stat n={s.reviewsRequested} l="Reviews asked" />
        <Stat n={s.coldLeads} l="Cold leads" />
      </div>

      <h2>Owner summary</h2>
      <pre className="report">{data.report.text}</pre>

      <h2>⚠️ Need a human ({data.escalations.length})</h2>
      <div className="card">
        {data.escalations.length === 0 ? (
          <div className="empty">Nothing waiting. 🌴</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Reason</th>
                <th>Message</th>
                <th style={{ width: 180 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.escalations.map((e) => (
                <tr key={e.id}>
                  <td>{e.contacts?.name ?? e.contacts?.whatsapp}</td>
                  <td>
                    <span className={`pill ${e.reason}`}>{e.reason}</span>
                  </td>
                  <td>{e.message}</td>
                  <td>
                    <button
                      onClick={() =>
                        openComposer({
                          contactId: e.contact_id,
                          conversationId: e.conversation_id,
                          escalationId: e.id,
                          name: e.contacts?.name ?? e.contacts?.whatsapp,
                        })
                      }
                    >
                      Reply & resolve
                    </button>{" "}
                    <button
                      className="ghost"
                      onClick={() => patch("/api/escalate", { id: e.id, resolved: true })}
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>📋 Bookings</h2>
      <div className="card">
        {data.bookings.length === 0 ? (
          <div className="empty">No bookings yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Date</th>
                <th>Pax</th>
                <th>Status</th>
                <th style={{ width: 200 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.contacts?.name ?? b.contacts?.whatsapp}</td>
                  <td>{b.service_name ?? "—"}</td>
                  <td>
                    {b.date ?? "—"} {b.time ?? ""}
                  </td>
                  <td>{b.pax ?? "—"}</td>
                  <td>
                    <span className={`pill ${b.status}`}>{b.status}</span>
                  </td>
                  <td>
                    {b.status === "requested" && (
                      <button onClick={() => patch("/api/bookings", { id: b.id, status: "confirmed" })}>
                        Confirm
                      </button>
                    )}
                    {b.status === "confirmed" && (
                      <button
                        className="ghost"
                        onClick={() => patch("/api/bookings", { id: b.id, status: "completed" })}
                      >
                        Mark done
                      </button>
                    )}{" "}
                    <button
                      className="ghost"
                      onClick={() =>
                        openComposer({
                          contactId: b.contact_id,
                          name: b.contacts?.name ?? b.contacts?.whatsapp,
                        })
                      }
                    >
                      Message
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>👥 Leads</h2>
      <div className="card">
        {data.leads.length === 0 ? (
          <div className="empty">No leads yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Interest</th>
                <th>Last intent</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map((l) => (
                <tr key={l.id}>
                  <td>{l.contacts?.name ?? l.contacts?.whatsapp}</td>
                  <td>{l.interest ?? "—"}</td>
                  <td>{l.last_intent ?? "—"}</td>
                  <td>
                    <span className={`pill ${l.status}`}>{l.status}</span>
                  </td>
                  <td>
                    <button
                      className="ghost"
                      onClick={() =>
                        openComposer({
                          contactId: l.contact_id,
                          name: l.contacts?.name ?? l.contacts?.whatsapp,
                        })
                      }
                    >
                      Message
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Human take-over composer */}
      {composer && (
        <div className="overlay" onClick={() => !busy && setComposer(null)}>
          <div className="composer" onClick={(ev) => ev.stopPropagation()}>
            <h3>Reply to {composer.name}</h3>
            <p className="sub">Sends a WhatsApp message from your business number.</p>
            <textarea
              value={composerText}
              autoFocus
              placeholder="Type your reply…"
              onChange={(ev) => setComposerText(ev.target.value)}
            />
            <div className="composer-actions">
              <button className="ghost" onClick={() => setComposer(null)} disabled={busy}>
                Cancel
              </button>
              <button onClick={sendReply} disabled={busy || !composerText.trim()}>
                {busy ? "Sending…" : composer.escalationId ? "Send & resolve" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="stat">
      <div className="n">{n ?? 0}</div>
      <div className="l">{l}</div>
    </div>
  );
}
