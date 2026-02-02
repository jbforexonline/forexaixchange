"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageCircle, Trash2, RefreshCw } from "lucide-react";
import { getChatMessages, deleteChatMessage, type ChatMessage } from "@/lib/api/chat";
import { useLayoutState } from "@/hooks/useLayoutState";
import { isAdminRole } from "@/lib/layoutConfig";
import { useToast } from "@/Components/Common/Toast/ToastContext";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminChatPage() {
  const { role } = useLayoutState();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const list = await getChatMessages("PREMIUM");
      setMessages(Array.isArray(list) ? [...list].reverse() : []);
    } catch (e) {
      toast?.error?.(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAdminRole(role)) return;
    setLoading(true);
    fetchMessages();
  }, [role, fetchMessages]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteChatMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast?.success?.("Message deleted");
    } catch (e) {
      toast?.error?.(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAdminRole(role)) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <MessageCircle size={24} />
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Chat Moderation</h1>
      </div>
      <p style={{ color: "#9ca3af", marginBottom: "1rem", fontSize: "0.9rem" }}>
        Members&apos; Room (PREMIUM) — view and moderate messages. Deleted messages are soft-deleted and hidden from users.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchMessages();
          }}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#1f2937",
            color: "#e5e7eb",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading messages...</p>
      ) : messages.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No messages in this room yet.</p>
      ) : (
        <div
          style={{
            border: "1px solid #374151",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#111827",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1f2937", borderBottom: "1px solid #374151" }}>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#9ca3af" }}>User</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#9ca3af" }}>Message</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#9ca3af" }}>Time</th>
                <th style={{ padding: "0.75rem", width: "80px", fontSize: "0.75rem", color: "#9ca3af" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} style={{ borderBottom: "1px solid #374151" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    <span style={{ fontWeight: 600 }}>{msg.user?.username ?? "—"}</span>
                    {msg.user?.verificationBadge && <span style={{ marginLeft: "0.25rem", color: "#f59e0b" }} title="Verified">✓</span>}
                    {msg.user?.premium && <span style={{ marginLeft: "0.25rem", color: "#a78bfa" }} title="Premium">★</span>}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", maxWidth: "400px", wordBreak: "break-word" }}>
                    {msg.content}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.8125rem", color: "#9ca3af" }}>
                    {formatTime(msg.createdAt)}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      disabled={deletingId === msg.id}
                      title="Delete message"
                      style={{
                        padding: "0.375rem",
                        border: "none",
                        borderRadius: "6px",
                        background: "transparent",
                        color: "#f87171",
                        cursor: deletingId === msg.id ? "not-allowed" : "pointer",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
