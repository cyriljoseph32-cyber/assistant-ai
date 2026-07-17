"use client";

import { useEffect, useState } from "react";
import { EmptyState, useToast } from "@/components/ui";
import { PlusIcon, TrashIcon } from "@/components/icons";

interface Faq { q: string; a: string }

interface BusinessData {
  name: string;
  industry: string | null;
  tone: string | null;
  languages: string[];
  services_summary: string | null;
  review_link: string | null;
  faq: Faq[];
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  duration: string | null;
  active: boolean;
}

export default function KnowledgePage() {
  const [biz, setBiz] = useState<BusinessData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    fetch("/api/business")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setBiz({ ...d.business, faq: d.business.faq ?? [], languages: d.business.languages ?? [] });
        setServices(d.services ?? []);
      })
      .catch(() => setFailed(true));
  }, []);

  function patch(p: Partial<BusinessData>) {
    setBiz((b) => (b ? { ...b, ...p } : b));
    setDirty(true);
  }

  async function save() {
    if (!biz) return;
    setSaving(true);
    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: biz.name,
        industry: biz.industry,
        tone: biz.tone,
        languages: biz.languages,
        services_summary: biz.services_summary,
        review_link: biz.review_link,
        faq: biz.faq.filter((f) => f.q.trim() || f.a.trim()),
      }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) {
      setDirty(false);
      showToast("Saved — the AI uses this immediately");
    } else {
      showToast("Save failed");
    }
  }

  if (failed) {
    return (
      <div className="page">
        <PageHead />
        <div className="card"><EmptyState title="Couldn't load your business profile" hint="Check the database connection and refresh." /></div>
      </div>
    );
  }
  if (!biz) {
    return (
      <div className="page">
        <PageHead />
        <div className="card"><EmptyState title="Loading…" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Knowledge</h1>
          <p className="sub">Everything here grounds the AI&apos;s answers to customers. Edits apply on the next message.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      <div className="card card-pad" style={{ display: "grid", gap: 16 }}>
        <h2>Business profile</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div className="field">
            <label>Business name</label>
            <input className="input" value={biz.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <div className="field">
            <label>Industry</label>
            <input className="input" value={biz.industry ?? ""} onChange={(e) => patch({ industry: e.target.value })} placeholder="e.g. dive center" />
          </div>
          <div className="field">
            <label>Languages</label>
            <input
              className="input"
              value={biz.languages.join(", ")}
              onChange={(e) => patch({ languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="en, fr, de"
            />
            <span className="hint">The AI replies in the customer&apos;s language when it&apos;s listed.</span>
          </div>
          <div className="field">
            <label>Review link</label>
            <input className="input" value={biz.review_link ?? ""} onChange={(e) => patch({ review_link: e.target.value })} placeholder="https://g.page/…" />
          </div>
        </div>
        <div className="field">
          <label>Tone of voice</label>
          <input className="input" value={biz.tone ?? ""} onChange={(e) => patch({ tone: e.target.value })} placeholder="friendly, relaxed, professional" />
          <span className="hint">How the AI sounds in every customer reply.</span>
        </div>
        <div className="field">
          <label>Services summary</label>
          <textarea
            className="textarea"
            rows={4}
            value={biz.services_summary ?? ""}
            onChange={(e) => patch({ services_summary: e.target.value })}
            placeholder="What you offer, prices, schedules — the AI quotes from this."
          />
        </div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="section-title">
          <h2>FAQ</h2>
          <button
            className="btn btn-sm"
            onClick={() => patch({ faq: [...biz.faq, { q: "", a: "" }] })}
          >
            <PlusIcon size={14} /> Add question
          </button>
        </div>
        <div className="card">
          {biz.faq.length === 0 ? (
            <EmptyState title="No FAQ yet" hint="Add the questions customers ask most — the AI answers them verbatim from here." />
          ) : (
            biz.faq.map((f, i) => (
              <div className="faq-item" key={i}>
                <div className="row">
                  <input
                    className="input"
                    value={f.q}
                    placeholder="Question customers ask"
                    onChange={(e) => patch({ faq: biz.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })}
                  />
                  <button
                    className="btn btn-ghost btn-sm btn-danger"
                    aria-label="Remove"
                    onClick={() => patch({ faq: biz.faq.filter((_, j) => j !== i) })}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
                <textarea
                  className="textarea"
                  rows={2}
                  value={f.a}
                  placeholder="The answer the AI should give"
                  onChange={(e) => patch({ faq: biz.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="section-title"><h2>Services</h2></div>
        <div className="card">
          {services.length === 0 ? (
            <EmptyState title="No services in the catalog" hint="The services summary above is what the AI quotes to customers." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Service</th><th>Price</th><th>Duration</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 550 }}>{s.name}</div>
                        {s.description && <div className="faint" style={{ fontSize: 12 }}>{s.description}</div>}
                      </td>
                      <td className="num">{s.price != null ? `${s.price} ${s.currency ?? ""}` : "—"}</td>
                      <td className="muted">{s.duration ?? "—"}</td>
                      <td><span className={`pill ${s.active ? "pill-good" : ""}`}>{s.active ? "active" : "inactive"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      {toast}
    </div>
  );
}

function PageHead() {
  return (
    <div className="page-head">
      <div>
        <h1>Knowledge</h1>
        <p className="sub">Everything here grounds the AI&apos;s answers to customers.</p>
      </div>
    </div>
  );
}
