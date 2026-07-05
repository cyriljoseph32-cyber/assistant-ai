"use client";

import { useCallback, useState } from "react";

// --- status pill -----------------------------------------------------------

const PILL_VARIANT: Record<string, string> = {
  // leads
  new: "pill-info",
  contacted: "pill-accent",
  qualified: "pill-good",
  won: "pill-good",
  lost: "pill-bad",
  cold: "",
  // bookings
  requested: "pill-warn",
  pending: "pill-warn",
  confirmed: "pill-good",
  cancelled: "pill-bad",
  completed: "pill-good",
  no_show: "pill-bad",
  // conversations
  open: "pill-good",
  escalated: "pill-bad",
  closed: "",
  // escalation reasons
  complaint: "pill-bad",
  urgent: "pill-bad",
  low_confidence: "pill-warn",
  manual: "pill-info",
  // senders
  ai: "pill-accent",
  human: "pill-info",
  customer: "",
  system: "",
};

export function StatusPill({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return (
    <span className={`pill ${PILL_VARIANT[value] ?? ""}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

// --- empty state -------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="empty">
      {icon}
      <span className="t">{title}</span>
      {hint && <span>{hint}</span>}
    </div>
  );
}

// --- toast --------------------------------------------------------------------

export function useToast(): [React.ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState("");
  const show = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2600);
  }, []);
  const node = msg ? <div className="toast fadeup">{msg}</div> : null;
  return [node, show];
}

// --- time formatting -------------------------------------------------------------

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
