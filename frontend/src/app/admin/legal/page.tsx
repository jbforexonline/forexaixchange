"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";
import {
  listVersions,
  getPreview,
  createDraft,
  activateVersion,
  type LegalVersion,
  type LegalDocument,
} from "@/lib/api/admin-legal";

type DocType = "terms" | "privacy";

export default function AdminLegalPage() {
  const { role } = useLayoutState();
  const [tab, setTab] = useState<DocType>("terms");
  const [terms, setTerms] = useState<LegalVersion[]>([]);
  const [privacy, setPrivacy] = useState<LegalVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LegalDocument | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ version: "", content: "", effectiveAt: "" });

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, p] = await Promise.all([
        listVersions("terms"),
        listVersions("privacy"),
      ]);
      setTerms(t);
      setPrivacy(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) return;
    fetchVersions();
  }, [role, fetchVersions]);

  const handlePreview = async (id: string) => {
    try {
      const doc = await getPreview(id);
      setPreview(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.version.trim() || !form.content.trim() || !form.effectiveAt) {
      setError("Version, content, and effective date are required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createDraft(tab, {
        version: form.version.trim(),
        content: form.content.trim(),
        effectiveAt: new Date(form.effectiveAt).toISOString(),
      });
      setForm({ version: "", content: "", effectiveAt: "" });
      await fetchVersions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id: string) => {
    setError(null);
    try {
      await activateVersion(id);
      await fetchVersions();
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activate failed");
    }
  };

  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only admins can manage legal documents.</p>
      </div>
    );
  }

  const versions = tab === "terms" ? terms : privacy;

  return (
    <div className="admin-legal-page">
      <h1 style={{ marginTop: 0, color: "#fff" }}>Legal (Terms &amp; Privacy)</h1>

      <div className="admin-legal-tabs">
        <button
          type="button"
          className={tab === "terms" ? "active" : ""}
          onClick={() => setTab("terms")}
        >
          Terms &amp; Conditions
        </button>
        <button
          type="button"
          className={tab === "privacy" ? "active" : ""}
          onClick={() => setTab("privacy")}
        >
          Privacy Policy
        </button>
      </div>

      {error && (
        <div className="admin-legal-error">{error}</div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <section className="admin-legal-versions">
            <h2>Versions</h2>
            <table>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Effective</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td>{v.version}</td>
                    <td>{new Date(v.effectiveAt).toLocaleDateString()}</td>
                    <td>{v.isActive ? "Active" : "Draft"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-preview"
                        onClick={() => handlePreview(v.id)}
                      >
                        Preview
                      </button>
                      {!v.isActive && (
                        <button
                          type="button"
                          className="btn-activate"
                          onClick={() => handleActivate(v.id)}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="admin-legal-create">
            <h2>Create new version</h2>
            <form onSubmit={handleCreate}>
              <label>
                Version <input
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                  placeholder="e.g. 1.1"
                />
              </label>
              <label>
                Effective date <input
                  type="datetime-local"
                  value={form.effectiveAt}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveAt: e.target.value }))}
                />
              </label>
              <label>
                Content (markdown) <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={10}
                  placeholder="Markdown content…"
                />
              </label>
              <button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create draft"}
              </button>
            </form>
          </section>
        </>
      )}

      {preview && (
        <div className="admin-legal-preview-overlay">
          <div className="admin-legal-preview">
            <div className="admin-legal-preview-header">
              <h2>{preview.type} v{preview.version}</h2>
              <button type="button" onClick={() => setPreview(null)}>Close</button>
            </div>
            <pre className="admin-legal-preview-content">{preview.content}</pre>
            {!preview.isActive && (
              <button
                type="button"
                className="btn-activate"
                onClick={() => handleActivate(preview.id)}
              >
                Activate this version
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-legal-page {
          padding: 2rem;
          max-width: 900px;
        }
        .admin-legal-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .admin-legal-tabs button {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid #333;
          background: #1a1a2e;
          color: #e0e0e0;
          cursor: pointer;
        }
        .admin-legal-tabs button.active {
          border-color: var(--expert-accent);
          background: rgba(0, 213, 255, 0.1);
        }
        .admin-legal-error {
          background: rgba(248, 113, 113, 0.15);
          border: 1px solid #f87171;
          color: #fca5a5;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .admin-legal-versions table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 2rem;
        }
        .admin-legal-versions th,
        .admin-legal-versions td {
          padding: 0.6rem 0.8rem;
          text-align: left;
          border-bottom: 1px solid #333;
        }
        .admin-legal-versions th {
          color: var(--expert-muted);
          font-size: 0.9rem;
        }
        .btn-preview,
        .btn-activate {
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #444;
          background: #252538;
          color: #e0e0e0;
          cursor: pointer;
          margin-right: 0.5rem;
        }
        .btn-activate {
          border-color: var(--expert-accent);
          background: rgba(0, 213, 255, 0.15);
        }
        .admin-legal-create label {
          display: block;
          margin-bottom: 1rem;
          color: var(--expert-muted);
        }
        .admin-legal-create input,
        .admin-legal-create textarea {
          display: block;
          width: 100%;
          margin-top: 0.35rem;
          padding: 0.6rem;
          border-radius: 8px;
          border: 1px solid #333;
          background: #1a1a2e;
          color: #fff;
        }
        .admin-legal-create button[type="submit"] {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(125deg, var(--expert-accent-2), #ff8bbd);
          color: #0a0a12;
          font-weight: 600;
          cursor: pointer;
        }
        .admin-legal-create button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .admin-legal-preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .admin-legal-preview {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 640px;
          max-height: 85vh;
          overflow: auto;
        }
        .admin-legal-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .admin-legal-preview-header h2 {
          margin: 0;
          font-size: 1.1rem;
          color: #fff;
        }
        .admin-legal-preview-header button {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          border: 1px solid #444;
          background: #252538;
          color: #e0e0e0;
          cursor: pointer;
        }
        .admin-legal-preview-content {
          white-space: pre-wrap;
          font-size: 0.9rem;
          color: #c0c0c0;
          margin: 0 0 1rem;
        }
      `}</style>
    </div>
  );
}
