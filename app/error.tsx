// app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", maxWidth: 800 }}>
      <h2 style={{ marginBottom: 12 }}>Algo quebrou ao carregar</h2>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#f6f5f1",
          border: "1px solid #e2e0d9",
          padding: 16,
          borderRadius: 10,
          fontSize: 13,
        }}
      >
        {error?.message || String(error)}
        {error?.stack ? "\n\n" + error.stack : ""}
      </pre>
      {error?.digest && (
        <p style={{ color: "#888", fontSize: 12 }}>digest: {error.digest}</p>
      )}
      <button
        onClick={() => reset()}
        style={{
          marginTop: 14, padding: "9px 16px", borderRadius: 999, border: 0,
          background: "#16171b", color: "#fff", fontWeight: 600, cursor: "pointer",
        }}
      >
        tentar de novo
      </button>
    </div>
  );
}
