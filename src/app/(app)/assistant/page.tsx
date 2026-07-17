"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/icons";
import { STREAM_ERROR_MARKER } from "@/lib/stream";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "coco-assistant-chat";
const MAX_STORED = 50;
const STREAM_TIMEOUT_MS = 90_000;

function loadStored(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Msg[]) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m?.content) : [];
  } catch {
    return [];
  }
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
  const [lastFailed, setLastFailed] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore after mount (not in the initializer) to avoid a hydration mismatch.
  useEffect(() => {
    setMessages(loadStored());
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      // storage full/unavailable — chat still works, just won't survive refresh
    }
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError("");
    setLastFailed("");
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);

    const ac = new AbortController();
    abortRef.current = ac;
    const timeout = setTimeout(() => ac.abort(), STREAM_TIMEOUT_MS);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20) }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : `request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let failedMidStream = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (acc.includes(STREAM_ERROR_MARKER)) {
          acc = acc.split(STREAM_ERROR_MARKER)[0].trimEnd();
          failedMidStream = true;
          break;
        }
        const snapshot = acc;
        setMessages([...history, { role: "assistant", content: snapshot }]);
      }
      if (failedMidStream || !acc.trim()) {
        if (acc.trim()) {
          // Keep the partial answer, but flag that it was cut short.
          setMessages([...history, { role: "assistant", content: acc }]);
          setError("The answer was cut short.");
        } else {
          setMessages(history);
          setError("Coco couldn't answer just now.");
        }
        setLastFailed(content);
      }
    } catch (e) {
      setMessages(history);
      setInput(content); // don't make the owner retype
      setLastFailed(content);
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "That took too long and was cancelled."
          : e instanceof Error && e.message && !/fetch/i.test(e.message)
            ? e.message
            : "Coco couldn't answer just now — check your connection."
      );
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
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
        {error && (
          <div className="error-note">
            {error}
            {lastFailed && (
              <button
                className="btn btn-sm"
                style={{ marginLeft: 10 }}
                onClick={() => send(lastFailed)}
                disabled={busy}
              >
                Retry
              </button>
            )}
          </div>
        )}
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
