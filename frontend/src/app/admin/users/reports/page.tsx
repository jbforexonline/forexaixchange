"use client";
import React from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";
import "./UserReports.scss";

type Report = {
  id: string;
  username: string;
  email: string;
  role: string;
  premium: boolean;
  status: 'ACTIVE' | 'BANNED' | 'PENDING';
};

export default function UserReportsPage() {
  const { role } = useLayoutState();

  const STORAGE_KEY = 'USER_REPORTS_V1';

  const sampleReports: Report[] = [
    { id: '1', username: 'john_doe', email: 'john@example.com', role: 'USER', premium: false, status: 'ACTIVE' },
    { id: '2', username: 'admin_user', email: 'admin@example.com', role: 'ADMIN', premium: true, status: 'ACTIVE' },
    { id: '3', username: 'banned_user', email: 'bad@example.com', role: 'USER', premium: false, status: 'BANNED' },
  ];

  const [reports, setReports] = React.useState<Report[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Report[]) : sampleReports;
    } catch (e) {
      return sampleReports;
    }
  });

  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'ALL' | 'ACTIVE' | 'PREMIUM' | 'BANNED'>('ALL');
  const [sortBy, setSortBy] = React.useState<{ column: string; dir: 'asc' | 'desc' } | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editedReport, setEditedReport] = React.useState<Partial<Report>>({});

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      // ignore
    }
  }, [reports]);

  const counts = React.useMemo(() => {
    return {
      total: reports.length,
      active: reports.filter((r) => r.status === 'ACTIVE').length,
      premium: reports.filter((r) => r.premium).length,
      banned: reports.filter((r) => r.status === 'BANNED').length,
    };
  }, [reports]);

  const filtered = React.useMemo(() => {
    let data = reports;
    if (query) {
      const q = query.toLowerCase();
      data = data.filter((r) => r.username.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'ACTIVE') data = data.filter((r) => r.status === 'ACTIVE');
      if (roleFilter === 'PREMIUM') data = data.filter((r) => r.premium);
      if (roleFilter === 'BANNED') data = data.filter((r) => r.status === 'BANNED');
    }

    if (sortBy) {
      data = [...data].sort((a, b) => {
        const aVal = (a as any)[sortBy.column];
        const bVal = (b as any)[sortBy.column];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortBy.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          return sortBy.dir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
        }
        return 0;
      });
    }

    return data;
  }, [reports, query, roleFilter, sortBy]);

  function toggleSort(column: string) {
    setSortBy((prev) => {
      if (!prev || prev.column !== column) return { column, dir: 'asc' };
      return { column, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this report?')) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  function startEdit(r: Report) {
    setEditingId(r.id);
    setEditedReport(r);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditedReport({});
  }

  function saveEdit() {
    if (!editingId) return;
    setReports((prev) => prev.map((r) => (r.id === editingId ? ({ ...(r as Report), ...(editedReport as Report) } as Report) : r)));
    cancelEdit();
  }

  function downloadReports() {
    try {
      const headers = ['id', 'username', 'email', 'role', 'premium', 'status'];
      const rows = filtered.map((r) => [r.id, r.username, r.email, r.role, r.premium ? 'Yes' : 'No', r.status]);
      const csv = [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_reports_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  }

  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
    return (
      <div className="accessDenied">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="userReportsPage">
      <h1>User Reports</h1>

      {/* ===== Stats ===== */}
      <div className="statsGrid">
        <div className="statCard">
          <p>Total Reports</p>
          <h2>{counts.total}</h2>
        </div>

        <div className="statCard active">
          <p>Active Reports</p>
          <h2>{counts.active}</h2>
        </div>

        <div className="statCard premium">
          <p>Premium Reports</p>
          <h2>{counts.premium}</h2>
        </div>

        <div className="statCard banned">
          <p>Banned Reports</p>
          <h2>{counts.banned}</h2>
        </div>
      </div>

      {/* ===== Filters ===== */}
      <div className="filtersCard">
        <h3>Filters</h3>

        <div className="filtersRow">
          <div className="filterGroup">
            <label>Search by username or email</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search..." />
          </div>

          <div className="filterGroup">
            <label>Filter by status</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
              <option value="ALL">All Reports</option>
              <option value="ACTIVE">Active</option>
              <option value="PREMIUM">Premium</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button className="primary" onClick={downloadReports} style={{ padding: '0.5rem 0.8rem' }}>
              Download CSV
            </button>
            <button onClick={() => { setQuery(''); setRoleFilter('ALL'); setSortBy(null); }} style={{ padding: '0.5rem 0.8rem' }}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="tableCard">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('username')} style={{ cursor: 'pointer' }}>
                Username {sortBy?.column === 'username' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => toggleSort('email')} style={{ cursor: 'pointer' }}>
                Email {sortBy?.column === 'email' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => toggleSort('role')} style={{ cursor: 'pointer' }}>
                Role {sortBy?.column === 'role' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => toggleSort('premium')} style={{ cursor: 'pointer' }}>
                Premium {sortBy?.column === 'premium' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                Status {sortBy?.column === 'status' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="emptyState">
                  No users found matching your filters.
                </td>
              </tr>
            )}

            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  {editingId === r.id ? (
                    <input value={(editedReport.username as string) || r.username} onChange={(e) => setEditedReport((s) => ({ ...s, username: e.target.value }))} />
                  ) : (
                    r.username
                  )}
                </td>
                <td>
                  {editingId === r.id ? (
                    <input value={(editedReport.email as string) || r.email} onChange={(e) => setEditedReport((s) => ({ ...s, email: e.target.value }))} />
                  ) : (
                    r.email
                  )}
                </td>
                <td>
                  {editingId === r.id ? (
                    <select value={(editedReport.role as string) || r.role} onChange={(e) => setEditedReport((s) => ({ ...s, role: e.target.value }))}>
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  ) : (
                    r.role
                  )}
                </td>
                <td>
                  {editingId === r.id ? (
                    <input type="checkbox" checked={(editedReport.premium as boolean) ?? r.premium} onChange={(e) => setEditedReport((s) => ({ ...s, premium: e.target.checked }))} />
                  ) : (
                    r.premium ? 'Yes' : 'No'
                  )}
                </td>
                <td>
                  {editingId === r.id ? (
                    <select value={(editedReport.status as any) || r.status} onChange={(e) => setEditedReport((s) => ({ ...s, status: e.target.value as any }))}>
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING">Pending</option>
                      <option value="BANNED">Banned</option>
                    </select>
                  ) : (
                    r.status
                  )}
                </td>
                <td>
                  {editingId === r.id ? (
                    <>
                      <button onClick={saveEdit} style={{ marginRight: 8 }}>Save</button>
                      <button onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(r)} style={{ marginRight: 8 }}>Edit</button>
                      <button onClick={() => handleDelete(r.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
