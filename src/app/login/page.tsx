"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monogram } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.replace("/assistant");
      router.refresh();
    } else {
      setError("That password didn't work. Try again.");
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card fadeup" onSubmit={submit}>
        <div className="login-brand">
          <Monogram size={28} /> <span className="wordmark">Coco</span>
        </div>
        <p className="login-tag">
          Your AI front desk. It answers customers, captures bookings, and flags
          what needs you — this console is where you work with it.
        </p>
        {error && <div className="error-note">{error}</div>}
        <div className="field">
          <label htmlFor="pw">Workspace password</label>
          <input
            id="pw"
            className="input"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button className="btn btn-primary" disabled={busy || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="login-foot">
        Answers run on Claude, grounded in your business profile. Complaints and
        urgent messages are always escalated to a human.
      </p>
    </div>
  );
}
