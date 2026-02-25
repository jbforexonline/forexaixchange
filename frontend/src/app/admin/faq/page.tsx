"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { isAdminRole } from "@/lib/layoutConfig";
import {
  listFaq,
  createFaq,
  updateFaq,
  deleteFaq,
  type FaqItem,
} from "@/lib/api/admin-faq";

const DEFAULT_CATEGORIES = [
  "General Information",
  "Accounts & Verification",
  "Deposits & Withdrawals",
  "Spin Game / Gameplay",
  "Affiliate Program",
  "Premium Features",
  "Security & Trust",
  "Support & Maintenance",
];

export default function AdminFaqPage() {
  const { role, isLoading } = useLayoutState();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: DEFAULT_CATEGORIES[0],
    question: "",
    answer: "",
    sortOrder: 0,
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFaq();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load FAQ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminRole(role) || isLoading) return;
    fetchItems();
  }, [role, isLoading, fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      category: DEFAULT_CATEGORIES[0],
      question: "",
      answer: "",
      sortOrder: items.length,
    });
    setModal("add");
    setError(null);
  };

  const openEdit = (item: FaqItem) => {
    setEditing(item);
    setForm({
      category: item.category,
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder ?? 0,
    });
    setModal("edit");
    setError(null);
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      setError("Question and answer are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateFaq(editing.id, {
          category: form.category,
          question: form.question.trim(),
          answer: form.answer.trim(),
          sortOrder: form.sortOrder,
        });
      } else {
        await createFaq({
          category: form.category,
          question: form.question.trim(),
          answer: form.answer.trim(),
          sortOrder: form.sortOrder,
        });
      }
      closeModal();
      await fetchItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this FAQ item?")) return;
    setError(null);
    try {
      await deleteFaq(id);
      await fetchItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (isLoading) return null;
  if (!isAdminRole(role)) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only admins can manage FAQ.</p>
      </div>
    );
  }

  const byCategory = items.reduce<Record<string, FaqItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1200px" }}>
      <h1 style={{ marginTop: 0, color: "#fff" }}>FAQ Management</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        Add, edit, or remove FAQ items. Changes appear on the public <a href="/faq" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8" }}>/faq</a> page.
      </p>

      {error && (
        <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.2)", borderRadius: "8px", marginBottom: "1rem", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={openAdd}
          style={{
            padding: "0.5rem 1rem",
            background: "linear-gradient(90deg, #00c6ff, #0066ff)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add FAQ Item
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No FAQ items. Run database seed to load initial FAQ, or add one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Object.entries(byCategory).map(([category, list]) => (
            <section key={category}>
              <h2 style={{ fontSize: "1.1rem", color: "#e2e8f0", marginBottom: "0.5rem" }}>
                {category}
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(15,23,42,0.6)", borderRadius: "8px", overflow: "hidden" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(56,189,248,0.2)" }}>
                    <th style={{ textAlign: "left", padding: "0.75rem", color: "#94a3b8" }}>Question</th>
                    <th style={{ textAlign: "left", padding: "0.75rem", color: "#94a3b8", width: "120px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "0.75rem", color: "#e2e8f0" }}>{item.question}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          style={{ marginRight: "0.5rem", padding: "0.25rem 0.5rem", background: "rgba(56,189,248,0.2)", border: "none", borderRadius: "4px", color: "#7dd3fc", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          style={{ padding: "0.25rem 0.5rem", background: "rgba(239,68,68,0.2)", border: "none", borderRadius: "4px", color: "#fca5a5", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            style={{
              background: "#0f172a",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "560px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, color: "#fff" }}>
              {editing ? "Edit FAQ Item" : "Add FAQ Item"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", color: "#94a3b8" }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.3)",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                  }}
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {!DEFAULT_CATEGORIES.includes(form.category) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                </select>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", color: "#94a3b8" }}>Question</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                  required
                  placeholder="e.g. What is ForexAiXchange?"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.3)",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                  }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", color: "#94a3b8" }}>Answer</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  required
                  rows={6}
                  placeholder="Answer text..."
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.3)",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", color: "#94a3b8" }}>Sort order (within category)</label>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.3)",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(148,163,184,0.4)",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "linear-gradient(90deg, #00c6ff, #0066ff)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
