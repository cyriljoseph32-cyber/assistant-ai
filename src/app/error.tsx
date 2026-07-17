"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ maxWidth: 420, textAlign: "center", padding: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Something went wrong</h1>
        <p className="sub" style={{ marginBottom: 20 }}>
          An unexpected error occurred. Your data is safe — try again.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
