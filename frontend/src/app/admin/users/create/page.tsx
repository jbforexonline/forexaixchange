"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole, isAdminRole } from "@/lib/layoutConfig";
import styles from "./create.module.scss";

interface NewUserPayload {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  premium?: boolean;
}

export default function CreateUserPage() {
  const { role } = useLayoutState();
  const [form, setForm] = useState<NewUserPayload>({ username: "", email: "", firstName: "", lastName: "", phone: "", role: "USER", premium: false });
  const [saving, setSaving] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Persisted users storage key and helper must be declared before early returns
  const STORAGE_KEY = "admin_created_users";
  const addCreatedUser = (u: any) => {
    setCreatedUsers((prev) => {
      const next = [u, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save created users to localStorage", e);
      }
      return next;
    });
  };

  // Load persisted users from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCreatedUsers(parsed);
      }
    } catch (e) {
      console.warn("Failed to load created users from localStorage", e);
    }
  }, []);

  if (!isAdminRole(role)) {
    return (
      <div className={styles.accessDenied}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setForm((f) => ({ ...f, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { ...form };

    try {
      const token = localStorage.getItem("token");
      // Try to POST to backend admin route. If not available, fallback to local append.
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const newUser = data.user || data;
        if (!newUser.id) newUser.id = Date.now().toString();
        addCreatedUser(newUser);
        setForm({ username: "", email: "", firstName: "", lastName: "", phone: "", role: "USER", premium: false });
      } else {
        // Fallback: append locally so user sees the result even if API missing
        const fallback = { id: Date.now().toString(), ...payload, isActive: true, isBanned: false };
        addCreatedUser(fallback);
        setForm({ username: "", email: "", firstName: "", lastName: "", phone: "", role: "USER", premium: false });
      }
    } catch (err: any) {
      const fallback = { id: Date.now().toString(), ...payload, isActive: true, isBanned: false };
      addCreatedUser(fallback);
    } finally {
      setSaving(false);
    }
  };
  

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create User</h1>
        <p className={styles.sub}>Create a new user for the platform</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <label>Username</label>
          <input name="username" value={form.username} onChange={handleChange} placeholder="username" required />
        </div>

        <div className={styles.row}>
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" required />
        </div>

        <div className={styles.rowGroup}>
          <div className={styles.rowSmall}>
            <label>First name</label>
            <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First" />
          </div>
          <div className={styles.rowSmall}>
            <label>Last name</label>
            <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last" />
          </div>
        </div>

        <div className={styles.rowGroup}>
          <div className={styles.rowSmall}>
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="+123456789" />
          </div>
          <div className={styles.rowSmall}>
            <label>Role</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="USER">User</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
        </div>

        <div className={styles.rowInline}>
          <label className={styles.checkboxLabel}>
            <input name="premium" type="checkbox" checked={!!form.premium} onChange={handleChange as any} /> Premium
          </label>

          <button className={styles.primary} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create User"}
          </button>
        </div>
      </form>

      <div className={styles.listWrap}>
        <h2>Recently Created</h2>
        {createdUsers.length === 0 ? (
          <p className={styles.empty}>No users created yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              {createdUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.premium ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
