"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  premium: boolean;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const { user, role } = useLayoutState();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
      return;
    }
    
    fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ban }),
      });

      if (response.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, isBanned: ban } : u)));
      }
    } catch (error) {
      console.error("Failed to ban user:", error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      }
    } catch (error) {
      console.error("Failed to change role:", error);
    }
  };

  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>User Management</h1>
        <p style={{ color: "#d1d5db" }}>
          Manage users, roles, and permissions across the platform.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
            Total Users
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
            {users.length}
          </p>
        </div>

        <div
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#86efac", fontSize: "0.9rem" }}>
            Active Users
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
            {users.filter((u) => u.isActive && !u.isBanned).length}
          </p>
        </div>

        <div
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#93c5fd", fontSize: "0.9rem" }}>
            Premium Users
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
            {users.filter((u) => u.premium).length}
          </p>
        </div>

        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#fca5a5", fontSize: "0.9rem" }}>
            Banned Users
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
            {users.filter((u) => u.isBanned).length}
          </p>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#93c5fd" }}>
          Filters
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Search by username or email:
            </label>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginTop: "0.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Filter by role:
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginTop: "0.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MODERATOR">Moderator</option>
              <option value="USER">User</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading users...</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    color: "#93c5fd",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  Username
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    color: "#93c5fd",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    color: "#93c5fd",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  Role
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "#93c5fd",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  Premium
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "#93c5fd",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "#93c5fd",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    backgroundColor:
                      idx % 2 === 0
                        ? "transparent"
                        : "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <td style={{ padding: "1rem", color: "#fff" }}>{u.username}</td>
                  <td style={{ padding: "1rem", color: "#d1d5db", fontSize: "0.9rem" }}>
                    {u.email}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {role === UserRole.SUPER_ADMIN ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "4px",
                          color: "#fff",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="USER">User</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    ) : (
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "rgba(93, 64, 55, 0.6)",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                          color: "#fca5a5",
                        }}
                      >
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <span style={{ color: u.premium ? "#10b981" : "#ef4444" }}>
                      {u.premium ? "✓" : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: u.isBanned
                          ? "rgba(239, 68, 68, 0.2)"
                          : u.isActive
                          ? "rgba(34, 197, 94, 0.2)"
                          : "rgba(107, 114, 128, 0.2)",
                        color: u.isBanned
                          ? "#fca5a5"
                          : u.isActive
                          ? "#86efac"
                          : "#d1d5db",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {u.isBanned ? "Banned" : u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    {role === UserRole.SUPER_ADMIN && (
                      <button
                        onClick={() =>
                          handleBanUser(u.id, !u.isBanned)
                        }
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: u.isBanned
                            ? "rgba(34, 197, 94, 0.2)"
                            : "rgba(239, 68, 68, 0.2)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          color: u.isBanned ? "#86efac" : "#fca5a5",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#d1d5db",
              }}
            >
              <p>No users found matching your filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
