import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ maxWidth: 420, textAlign: "center", padding: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Page not found</h1>
        <p className="sub" style={{ marginBottom: 20 }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link className="btn btn-primary" href="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
