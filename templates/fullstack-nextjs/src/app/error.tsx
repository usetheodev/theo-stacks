"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Something went wrong</h1>
      <p>{error?.message || "An unexpected error occurred."}</p>
      <button
        onClick={() => reset()}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          cursor: "pointer",
          border: "1px solid #333",
          borderRadius: "4px",
          background: "#fff",
        }}
      >
        Try again
      </button>
    </main>
  );
}
