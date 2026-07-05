"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";

interface Hit {
  type: "contact" | "lead" | "booking" | "conversation";
  id: string;
  title: string;
  sub: string;
  href: string;
}

const GROUP_LABEL: Record<Hit["type"], string> = {
  conversation: "Conversations",
  contact: "Contacts",
  lead: "Leads",
  booking: "Bookings",
};

export function CommandK({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open ? onClose() : onOpen();
      }
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setHits([]);
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`).catch(() => null);
      setLoading(false);
      if (res?.ok) {
        const data = await res.json();
        setHits(data.results ?? []);
        setSel(0);
      }
    }, 180);
    return () => clearTimeout(debounce.current);
  }, [q]);

  function go(hit: Hit) {
    onClose();
    router.push(hit.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && hits[sel]) {
      go(hits[sel]);
    }
  }

  if (!open) return null;

  // Render grouped, preserving selection order (hits are flat + indexed).
  const groups: { label: string; items: { hit: Hit; idx: number }[] }[] = [];
  hits.forEach((hit, idx) => {
    const label = GROUP_LABEL[hit.type];
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push({ hit, idx });
    else groups.push({ label, items: [{ hit, idx }] });
  });

  return (
    <div className="cmdk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk fadeup">
        <div className="cmdk-input">
          <SearchIcon size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search contacts, leads, bookings, conversations…"
          />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk-results">
          {q.trim().length < 2 ? (
            <div className="cmdk-empty">Type to search your workspace.</div>
          ) : hits.length === 0 ? (
            <div className="cmdk-empty">{loading ? "Searching…" : "No matches."}</div>
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <div className="cmdk-group">{g.label}</div>
                {g.items.map(({ hit, idx }) => (
                  <button
                    key={hit.type + hit.id}
                    className={`cmdk-item${idx === sel ? " sel" : ""}`}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => go(hit)}
                  >
                    {hit.title}
                    <span className="sub">{hit.sub}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
