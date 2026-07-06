"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/icons";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { t: "What needs my attention?", d: "Escalations, unconfirmed bookings, cooling leads" },
  { t: "Summarize today", d: "New leads, bookings, and how the AI handled them" },
  { t: "Draft a reply to the latest complaint", d: "Ready to send from your Inbox" },
  { t: "Which leads should I follow up first?", d: "Ranked by intent and recency" },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError("");
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages([...history, { role: "assistant", content: snapshot }]);
      }
    } catch (e) {
      setMessages(history);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  const empty = messages.length === 0;

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scrollRef}>
        {empty ? (
          <div className="chat-hero fadeup">
            <h1>Good {timeOfDay()}.</h1>
            <p className="sub">
              Ask about your leads, bookings, and conversations — or have me
              draft the next customer reply. I answer from live data.
            </p>
            <div className="prompt-grid">
              {SUGGESTIONS.map((s) => (
                <button key={s.t} className="prompt-chip" onClick={() => send(s.t)}>
                  <span className="t">{s.t}</span>
                  <span className="d">{s.d}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role} fadeup`}>
              {m.role === "assistant" && <span className="chat-meta">Coco</span>}
              {m.content === "" && busy && i === messages.length - 1 ? (
                <span className="thinking"><span /><span /><span /></span>
              ) : (
                <div className="chat-bubble">{m.content}</div>
              )}
            </div>
          ))
        )}
        {error && <div className="error-note">Couldn&apos;t reach the assistant: {error}</div>}
      </div>

      <div className="composer">
        <div className="composer-box">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            placeholder="Ask about your business…"
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow(e.target);
            }}
            onKeyDown={onKey}
          />
          <button
            className="composer-send"
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label="Send"
          >
            <SendIcon size={16} />
          </button>
        </div>
        <p className="composer-note">
          Answers come from your live workspace data. Nothing is sent to customers from here.
        </p>
      </div>
    </div>
  );
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
