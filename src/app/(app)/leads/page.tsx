"use client";

import { useEffect, useState } from "react";
import { StatusPill, EmptyState, useToast, timeAgo } from "@/components/ui";
import { UsersIcon } from "@/components/icons";
import type { LeadStatus } from "@/lib/types";

interface LeadRow {
  id: string;
  status: LeadStatus;
  source: string | null;
  interest: string | null;
  last_intent: string | null;
  last_message_at: string | null;
  contacts: { name: string | null; whatsapp: string } | null;
}

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost", "cold"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [toast, showToast] = useToast();

  function load() {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => setLeads([]));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    if (res?.ok) {
      setLeads((ls) => ls?.map((l) => (l.id === id ? { ...l, status: status as LeadStatus } : l)) ?? null);
      showToast("Lead updated");
    } else {
      showToast("Update failed");
    }
  }

  const visible = leads?.filter((l) => filter === "all" || l.status === filter);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p className="sub">Captured automatically from every conversation, with the customer&apos;s last intent.</p>
        </div>
        <div className="page-actions">
          <select className="select" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {visible === undefined || leads === null ? (
          <EmptyState title="Loading leads…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={28} />}
            title={filter === "all" ? "No leads yet" : `No ${filter} leads`}
            hint="New WhatsApp enquiries become leads automatically."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Interest</th>
                  <th>Last intent</th>
                  <th>Last activity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 550 }}>{l.contacts?.name ?? "Unknown"}</div>
                      <div className="faint mono" style={{ fontSize: 12 }}>{l.contacts?.whatsapp}</div>
                    </td>
                    <td className="muted">{l.interest ?? "—"}</td>
                    <td>{l.last_intent ? <StatusPill value={l.last_intent} /> : <span className="faint">—</span>}</td>
                    <td className="muted num">{timeAgo(l.last_message_at) || "—"}</td>
                    <td>
                      <select
                        className="select btn-sm"
                        style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}
                        value={l.status}
                        onChange={(e) => setStatus(l.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {toast}
    </div>
  );
}
