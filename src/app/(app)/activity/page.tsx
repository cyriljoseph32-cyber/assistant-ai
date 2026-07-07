"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusPill, EmptyState, useToast, fmtDateTime, timeAgo } from "@/components/ui";
import { AlertIcon, PulseIcon, CheckIcon } from "@/components/icons";

interface Esc {
  id: string;
  reason: string;
  message: string | null;
  resolved: boolean;
  created_at: string;
  conversation_id: string | null;
  contacts: { name: string | null; whatsapp: string | null; email: string | null } | null;
}

interface Log {
  id: string;
  event: string;
  detail: Record<string, unknown> | null;
  level: string | null;
  created_at: string;
}

interface Stats {
  aiReplies7d: number;
  humanReplies7d: number;
  inbound7d: number;
  openEscalations: number;
}

export default function ActivityPage() {
  const [escalations, setEscalations] = useState<Esc[] | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [toast, showToast] = useToast();

  function load() {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => {
        setEscalations(d.escalations ?? []);
        setLogs(d.logs ?? []);
        setStats(d.stats ?? null);
      })
      .catch(() => setEscalations([]));
  }
  useEffect(load, []);

  async function resolve(id: string) {
    const res = await fetch("/api/escalate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved: true }),
    }).catch(() => null);
    if (res?.ok) {
      setEscalations((es) => es?.map((e) => (e.id === id ? { ...e, resolved: true } : e)) ?? null);
      showToast("Marked resolved");
    } else {
      showToast("Update failed");
    }
  }

  const open = escalations?.filter((e) => !e.resolved) ?? [];
  const recentResolved = escalations?.filter((e) => e.resolved).slice(0, 10) ?? [];
  const total = stats ? stats.aiReplies7d + stats.humanReplies7d : 0;
  const aiShare = stats && total > 0 ? Math.round((stats.aiReplies7d / total) * 100) : null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Activity</h1>
          <p className="sub">What the AI did on your behalf, and where it deliberately stepped aside.</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <span className="label">AI replies · 7 days</span>
          <span className="value">{stats?.aiReplies7d ?? "—"}</span>
        </div>
        <div className="card stat">
          <span className="label">Handled by AI</span>
          <span className="value">{aiShare != null ? `${aiShare}%` : "—"}</span>
        </div>
        <div className="card stat">
          <span className="label">Human replies · 7 days</span>
          <span className="value">{stats?.humanReplies7d ?? "—"}</span>
        </div>
        <div className="card stat">
          <span className="label">Waiting for you</span>
          <span className="value" style={open.length > 0 ? { color: "var(--bad)" } : undefined}>
            {stats?.openEscalations ?? "—"}
          </span>
        </div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="section-title">
          <h2>Escalations</h2>
          <span className="faint" style={{ fontSize: 12.5 }}>
            Complaints, urgent messages, and low-confidence answers are never auto-replied.
          </span>
        </div>
        <div className="card">
          {escalations === null ? (
            <EmptyState title="Loading…" />
          ) : open.length === 0 ? (
            <EmptyState icon={<CheckIcon size={26} />} title="Nothing waiting on you" hint="The AI escalates here whenever it isn't sure." />
          ) : (
            open.map((e) => (
              <div className="faq-item" key={e.id}>
                <div className="row" style={{ alignItems: "center" }}>
                  <AlertIcon size={15} />
                  <span style={{ fontWeight: 550 }}>{e.contacts?.name ?? e.contacts?.whatsapp ?? e.contacts?.email ?? "Unknown"}</span>
                  <StatusPill value={e.reason} />
                  <span className="faint" style={{ fontSize: 12 }}>{timeAgo(e.created_at)}</span>
                  <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
                    {e.conversation_id && (
                      <Link href={`/inbox?c=${e.conversation_id}`} className="btn btn-primary btn-sm">
                        Reply in Inbox
                      </Link>
                    )}
                    <button className="btn btn-sm" onClick={() => resolve(e.id)}>Resolve</button>
                  </span>
                </div>
                {e.message && <p className="muted" style={{ fontSize: 13 }}>&ldquo;{e.message}&rdquo;</p>}
              </div>
            ))
          )}
        </div>
        {recentResolved.length > 0 && (
          <div className="card">
            {recentResolved.map((e) => (
              <div className="log-item" key={e.id}>
                <span className="when">{fmtDateTime(e.created_at)}</span>
                <span className="what">{e.contacts?.name ?? "Unknown"}</span>
                <StatusPill value={e.reason} />
                <span className="detail">resolved</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="section-title"><h2>Automation log</h2></div>
        <div className="card">
          {logs.length === 0 ? (
            <EmptyState icon={<PulseIcon size={26} />} title="No automation events yet" />
          ) : (
            logs.map((l) => (
              <div className="log-item" key={l.id}>
                <span className="when">{fmtDateTime(l.created_at)}</span>
                <span className="what">{l.event.replace(/_/g, " ")}</span>
                {l.level === "error" && <span className="pill pill-bad">error</span>}
                <span className="detail">{l.detail ? summarize(l.detail) : ""}</span>
              </div>
            ))
          )}
        </div>
      </section>
      {toast}
    </div>
  );
}

function summarize(detail: Record<string, unknown>): string {
  return Object.entries(detail)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ")
    .slice(0, 120);
}
