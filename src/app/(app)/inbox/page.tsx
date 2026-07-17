"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusPill, EmptyState, useToast, timeAgo } from "@/components/ui";
import { BackIcon, InboxIcon, SendIcon } from "@/components/icons";

interface Conv {
  id: string;
  status: string;
  channel: string;
  last_message_at: string | null;
  contact_id: string;
  contacts: { name: string | null; whatsapp: string } | null;
  preview: { body: string; sender: string } | null;
}

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  intent: string | null;
  created_at: string;
}

export default function InboxPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("c");

  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [toast, showToast] = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = convs?.find((c) => c.id === selectedId) ?? null;

  const loadConvs = useCallback(() => {
    return fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => setConvs(d.conversations ?? []))
      .catch(() => setConvs([]));
  }, []);

  useEffect(() => {
    loadConvs();
  }, [loadConvs]);

  // Poll Gmail now instead of waiting for the 15-min cron.
  async function checkEmail() {
    setChecking(true);
    const res = await fetch("/api/cron/email").catch(() => null);
    const d = await res?.json().catch(() => null);
    setChecking(false);
    if (res?.ok) {
      showToast(
        `Email check: ${d.processed ?? 0} read, ${d.replied ?? 0} replied, ${d.escalated ?? 0} escalated`
      );
      await loadConvs();
    } else {
      showToast(d?.error ? String(d.error) : "Couldn't check email — verify the Gmail connection");
    }
  }

  const loadThread = useCallback((id: string) => {
    setMsgs(null);
    fetch(`/api/conversations?id=${id}`)
      .then((r) => r.json())
      .then((d) => setMsgs(d.messages ?? []))
      .catch(() => setMsgs([]));
  }, []);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  async function sendReply() {
    if (!draft.trim() || !selected) return;
    setSending(true);
    const res = await fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_id: selected.contact_id,
        conversation_id: selected.id,
        body: draft.trim(),
      }),
    }).catch(() => null);
    setSending(false);
    if (res?.ok) {
      setDraft("");
      showToast("Sent on WhatsApp");
      loadThread(selected.id);
    } else {
      const d = await res?.json().catch(() => null);
      showToast(d?.error ?? "Couldn't send — check Twilio config");
    }
  }

  return (
    <div className="page" style={{ minHeight: 0 }}>
      <div className="page-head">
        <div>
          <h1>Inbox</h1>
          <p className="sub">Every customer conversation, with the AI&apos;s replies attributed. Jump in any time.</p>
        </div>
        <button className="btn btn-primary" onClick={checkEmail} disabled={checking}>
          <InboxIcon size={14} /> {checking ? "Checking…" : "Check email"}
        </button>
      </div>

      <div className={`inbox${selectedId ? " show-thread" : ""}`}>
        <div className="conv-list">
          {convs === null ? (
            <EmptyState title="Loading conversations…" />
          ) : convs.length === 0 ? (
            <EmptyState
              icon={<InboxIcon size={28} />}
              title="No conversations yet"
              hint="They'll appear as soon as a customer messages your WhatsApp number."
            />
          ) : (
            convs.map((c) => (
              <button
                key={c.id}
                className={`conv-item${c.id === selectedId ? " active" : ""}`}
                onClick={() => router.replace(`/inbox?c=${c.id}`, { scroll: false })}
              >
                <span className="row">
                  <span className="name">{c.contacts?.name ?? c.contacts?.whatsapp ?? "Unknown"}</span>
                  <span className="when">{timeAgo(c.last_message_at) || "—"}</span>
                </span>
                <span className="row">
                  <span className="preview">
                    {c.preview ? `${c.preview.sender === "customer" ? "" : "↩ "}${c.preview.body}` : "—"}
                  </span>
                  {c.status !== "open" && <StatusPill value={c.status} />}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="thread">
          {!selected ? (
            <EmptyState
              icon={<InboxIcon size={28} />}
              title="Select a conversation"
              hint="You'll see exactly what the AI said, and can take over anytime."
            />
          ) : (
            <>
              <div className="thread-head">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => router.replace("/inbox", { scroll: false })}
                  aria-label="Back to list"
                >
                  <BackIcon size={15} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <h3>{selected.contacts?.name ?? "Unknown"}</h3>
                  <span className="faint" style={{ fontSize: 12 }}>
                    {selected.contacts?.whatsapp} · {selected.channel}
                  </span>
                </div>
                <span style={{ marginLeft: "auto" }}>
                  <StatusPill value={selected.status} />
                </span>
              </div>

              <div className="thread-scroll" ref={scrollRef}>
                {msgs === null ? (
                  <EmptyState title="Loading…" />
                ) : msgs.length === 0 ? (
                  <EmptyState title="No messages in this conversation." />
                ) : (
                  msgs.map((m) => (
                    <div key={m.id} className={`tmsg ${m.direction}`}>
                      <div className="bubble">{m.body}</div>
                      <div className="meta">
                        <StatusPill value={m.sender === "customer" ? null : m.sender} />
                        {m.intent && m.sender === "customer" && (
                          <span>{m.intent.replace(/_/g, " ")}</span>
                        )}
                        <span>{timeAgo(m.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="thread-composer">
                <input
                  className="input"
                  value={draft}
                  placeholder="Reply as a human — sends from your WhatsApp number"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendReply}
                  disabled={sending || !draft.trim()}
                >
                  <SendIcon size={14} /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {toast}
    </div>
  );
}
