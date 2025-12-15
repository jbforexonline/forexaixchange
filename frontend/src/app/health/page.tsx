"use client";
import React, { useEffect, useState } from "react";

export default function HealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch health status");
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1>Health Check</h1>
      {loading && <p>Loading health status...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {health && (
        <pre style={{ background: "#f4f4f4", padding: 16, borderRadius: 8 }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      )}
    </div>
  );
}
