"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import BackToLanding from "@/Components/Common/BackToLanding";
import { getActiveLegal } from "@/lib/api/legal";

function SimpleMarkdown({ text }: { text?: string | null }) {
  const lines = (text ?? "").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.startsWith("# ")) {
      out.push(<h1 key={key++}>{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      out.push(<h2 key={key++}>{line.slice(3)}</h2>);
    } else if (line.startsWith("- ")) {
      const list: React.ReactNode[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("- ")) {
        list.push(<li key={key++}>{(lines[i] ?? "").slice(2)}</li>);
        i++;
      }
      out.push(<ul key={key++}>{list}</ul>);
      i--;
    } else if (line.trim()) {
      out.push(<p key={key++}>{line}</p>);
    } else {
      out.push(<br key={key++} />);
    }
    i++;
  }
  return <div className="legal-content">{out}</div>;
}

export default function TermsPage() {
  const [doc, setDoc] = useState<{ id: string; version: string; content: string; effectiveAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActiveLegal("terms")
      .then((d) => (d ? setDoc(d) : setError("No terms available")))
      .catch(() => setError("Failed to load terms"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-inner">
        <BackToLanding />
        <h1>Terms &amp; Conditions</h1>
        {loading && <p>Loading…</p>}
        {error && <p>{error}</p>}
        {doc && (
          <>
            <p className="legal-meta">Version {doc.version} · Effective {new Date(doc.effectiveAt).toLocaleDateString()}</p>
            <SimpleMarkdown text={doc.content ?? ""} />
          </>
        )}
      </div>
      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          padding: 2rem;
          max-width: 720px;
          margin: 0 auto;
        }
        .legal-inner nav {
          margin-bottom: 1.5rem;
        }
        .legal-inner nav a {
          color: var(--expert-accent);
        }
        .legal-meta {
          color: var(--expert-muted);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .legal-content :global(h1) {
          font-size: 1.5rem;
          margin: 1.5rem 0 0.5rem;
        }
        .legal-content :global(h2) {
          font-size: 1.2rem;
          margin: 1rem 0 0.5rem;
        }
        .legal-content :global(p) {
          margin: 0.5rem 0;
        }
        .legal-content :global(ul) {
          margin: 0.5rem 0 1rem 1.5rem;
        }
      `}</style>
    </div>
  );
}
