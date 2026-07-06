"use client";

import { useEffect, useState } from "react";
import { StatusPill, EmptyState, useToast } from "@/components/ui";
import { CalendarIcon } from "@/components/icons";
import type { BookingStatus } from "@/lib/types";

interface BookingRow {
  id: string;
  status: BookingStatus;
  service_name: string | null;
  date: string | null;
  time: string | null;
  pax: number | null;
  pickup: string | null;
  notes: string | null;
  contacts: { name: string | null; whatsapp: string } | null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [toast, showToast] = useToast();

  function load() {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => setBookings([]));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: BookingStatus) {
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    if (res?.ok) {
      setBookings((bs) => bs?.map((b) => (b.id === id ? { ...b, status } : b)) ?? null);
      showToast(
        status === "confirmed"
          ? "Confirmed — the customer gets a WhatsApp confirmation"
          : status === "completed"
          ? "Completed — review request queued"
          : "Booking updated"
      );
    } else {
      showToast("Update failed");
    }
  }

  const pending = bookings?.filter((b) => b.status === "requested" || b.status === "pending") ?? [];
  const rest = bookings?.filter((b) => b.status !== "requested" && b.status !== "pending") ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p className="sub">Requests the AI captured from chat. Confirming notifies the customer automatically.</p>
        </div>
      </div>

      {bookings === null ? (
        <div className="card"><EmptyState title="Loading bookings…" /></div>
      ) : bookings.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CalendarIcon size={28} />}
            title="No bookings yet"
            hint="When a customer asks to book, the AI collects the details and it lands here."
          />
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="section-title">
                <h2>Needs confirmation</h2>
                <span className="pill pill-warn num">{pending.length}</span>
              </div>
              <div className="card">
                <BookingTable rows={pending} onStatus={setStatus} primaryAction />
              </div>
            </section>
          )}
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="section-title"><h2>All bookings</h2></div>
            <div className="card">
              {rest.length === 0 ? (
                <EmptyState title="Nothing here yet." />
              ) : (
                <BookingTable rows={rest} onStatus={setStatus} />
              )}
            </div>
          </section>
        </>
      )}
      {toast}
    </div>
  );
}

function BookingTable({
  rows,
  onStatus,
  primaryAction,
}: {
  rows: BookingRow[];
  onStatus: (id: string, s: BookingStatus) => void;
  primaryAction?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Customer</th>
            <th>When</th>
            <th>Pax</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td>
                <div style={{ fontWeight: 550 }}>{b.service_name ?? "Booking"}</div>
                {b.pickup && <div className="faint" style={{ fontSize: 12 }}>pickup: {b.pickup}</div>}
              </td>
              <td>
                <div>{b.contacts?.name ?? "Unknown"}</div>
                <div className="faint mono" style={{ fontSize: 12 }}>{b.contacts?.whatsapp}</div>
              </td>
              <td className="muted num">
                {b.date ?? "—"}{b.time ? ` · ${b.time}` : ""}
              </td>
              <td className="num">{b.pax ?? "—"}</td>
              <td><StatusPill value={b.status} /></td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                {primaryAction ? (
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => onStatus(b.id, "confirmed")}>
                      Confirm
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => onStatus(b.id, "cancelled")}>
                      Decline
                    </button>
                  </span>
                ) : (
                  <select
                    className="select"
                    style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}
                    value={b.status}
                    onChange={(e) => onStatus(b.id, e.target.value as BookingStatus)}
                  >
                    {(["requested", "pending", "confirmed", "cancelled", "completed", "no_show"] as const).map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
