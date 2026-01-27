"use client";
import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  ShieldCheck, 
  Ban, 
  Edit2, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  UserX,
  Award,
  Crown,
  CheckCircle2,
  X,
  RefreshCw
} from "lucide-react";
import "./UserManagement.scss";
import { getAllUsers, updateUser, User, UsersResponse } from "@/lib/api/admin-users";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";
import { useToast } from "@/Components/Common/Toast/ToastContext";

export default function UserManagementPage() {
  const { role } = useLayoutState();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<UsersResponse['meta']>({ 
    total: 0, 
    page: 1, 
    limit: 10, 
    totalPages: 1, 
    stats: { active: 0, premium: 0, banned: 0 } 
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Core fetch function
  const fetchUsers = async (page: number) => {
    try {
      setLoading(true);
      const res = await getAllUsers(page, 10, searchQuery);
      
      // Safety: Ensure we always have an array for users
      const userData = Array.isArray(res.data) ? res.data : [];
      setUsers(userData);
      
      // Safety: Ensure meta is valid and handle missing stats defaults
      if (res.meta) {
        setMeta({
          ...res.meta,
          stats: res.meta.stats || { active: 0, premium: 0, banned: 0 }
        });
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync effects
  useEffect(() => {
    fetchUsers(1);
  }, [searchQuery, filterRole]);

  const handlePageChange = (newPage: number) => {
     fetchUsers(newPage);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsProcessing(true);
    try {
      await updateUser(selectedUser.id, {
        role: selectedUser.role,
        isBanned: selectedUser.isBanned,
        premium: selectedUser.premium,
        verificationBadge: selectedUser.verificationBadge,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
      });
      setIsEditModalOpen(false);
      toast.success(`User ${selectedUser.username} updated successfully`);
      fetchUsers(meta?.page || 1);
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleBanStatus = async (user: User) => {
    if (!window.confirm(`Are you sure you want to ${user.isBanned ? 'unban' : 'ban'} ${user.username}?`)) return;
    
    try {
      await updateUser(user.id, { isBanned: !user.isBanned });
      toast.success(`${user.username} has been ${user.isBanned ? 'unbanned' : 'banned'}`);
      fetchUsers(meta?.page || 1);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
    return (
      <div className="access-denied">
        <ShieldCheck size={48} />
        <h1>Access Denied</h1>
        <p>You don't have the necessary permissions to view this page.</p>
      </div>
    );
  }

  // Safe variables for stats
  const totalRegistered = meta?.total || 0;
  const activeCount = meta?.stats?.active || 0;
  const premiumCount = meta?.stats?.premium || 0;
  const bannedCount = meta?.stats?.banned || 0;

  return (
    <div className="user-management">
      {loading && users.length === 0 && (
        <div className="loading-overlay">
          <div className="loader-content">
            <RefreshCw className="spinner" size={40} />
            <p>Fetching Global Users...</p>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="header-info">
          <h1>User Management</h1>
          <p>Search, manage permissions, and monitor user activity</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="icon-wrapper total"><Users size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalRegistered}</span>
            <span className="stat-label">Total Registered</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-wrapper active"><UserCheck size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{activeCount}</span>
            <span className="stat-label">Active Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-wrapper premium"><Crown size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{premiumCount}</span>
            <span className="stat-label">Premium Members</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-wrapper banned"><Ban size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{bannedCount}</span>
            <span className="stat-label">Suspended</span>
          </div>
        </div>
      </div>

      <div className="controls-bar">
        <form className="search-wrapper" onSubmit={handleSearchSubmit}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by username, email, or name..." 
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </form>
        <select 
          className="filter-select" 
          value={filterRole} 
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="ALL">All Roles</option>
          <option value="USER">User</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      <div className="users-table-container">
        <table>
          <thead>
            <tr>
              <th>User Information</th>
              <th>Status</th>
              <th>Badges</th>
              <th>Activity</th>
              <th>Wallet</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(loading) ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan={7} style={{ padding: '1.25rem', textAlign: 'center', opacity: 0.5 }}>
                    <RefreshCw className="spinner" size={16} style={{ display: 'inline', marginRight: '8px' }} />
                    Updating view...
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No users found matching your criteria
                </td>
              </tr>
            ) : Array.isArray(users) && users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="user-info-cell">
                    <div className="avatar">{u.username ? u.username.substring(0, 2).toUpperCase() : '??'}</div>
                    <div className="name-email">
                      <span className="username">{u.username}</span>
                      <span className="email">{u.email}</span>
                      {u.referrer && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                           Ref by: {u.referrer.username}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status-pill ${u.isBanned ? 'banned' : 'active'}`}>
                    {u.isBanned ? 'Suspended' : u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="badge-cell">
                    {u.role !== 'USER' && (
                       <span className={`badge ${u.role ? u.role.toLowerCase() : ''}`}>{u.role ? u.role.replace('_', ' ') : ''}</span>
                    )}
                    {u.premium && <span className="badge premium">Premium</span>}
                    {u.verificationBadge && <span className="badge verified">Verified</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                    <span style={{ color: '#cbd5e1' }}>🎰 Spins: <b>{u._count?.spins || 0}</b></span>
                    <span style={{ color: '#cbd5e1' }}>💸 Trans: <b>{u._count?.transactions || 0}</b></span>
                    <span style={{ color: '#cbd5e1' }}>👥 Refs: <b>{u._count?.referrals || 0}</b></span>
                  </div>
                </td>
                <td>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
                        ${Number(u.wallet?.available || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Held: ${Number(u.wallet?.held || 0).toFixed(2)}
                    </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button className="edit" title="Edit User" onClick={() => handleEditUser(u)}>
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="block" 
                      title={u.isBanned ? "Unblock" : "Block User"}
                      onClick={() => toggleBanStatus(u)}
                    >
                      {u.isBanned ? <UserCheck size={16} /> : <UserX size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button 
          className="page-btn" 
          disabled={!meta || meta.page <= 1}
          onClick={() => handlePageChange(meta.page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        {[...Array(meta?.totalPages || 1)].map((_, i) => (
          <button 
            key={i} 
            className={`page-btn ${meta?.page === i + 1 ? 'active' : ''}`}
            onClick={() => handlePageChange(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button 
          className="page-btn" 
          disabled={!meta || meta.page >= meta.totalPages}
          onClick={() => handlePageChange(meta.page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {isEditModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="user-modal">
            <div className="modal-header">
              <h2>Edit Profile: {selectedUser.username}</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>First Name</label>
                      <input 
                        type="text" 
                        value={selectedUser.firstName || ''} 
                        onChange={e => setSelectedUser({...selectedUser, firstName: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input 
                        type="text" 
                        value={selectedUser.lastName || ''} 
                        onChange={e => setSelectedUser({...selectedUser, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Permissions & Role</h3>
                  <div className="form-group">
                    <label>System Role</label>
                    <select 
                      value={selectedUser.role} 
                      onChange={e => setSelectedUser({...selectedUser, role: e.target.value})}
                      disabled={role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN}
                    >
                      <option value="USER">Regular User</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Administrator</option>
                      <option value="SUPER_ADMIN">Super Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Badges & Status</h3>
                  <div className="toggle-group">
                    <div className="toggle-item">
                      <span>Premium Status</span>
                      <input 
                        type="checkbox" 
                        checked={selectedUser.premium} 
                        onChange={e => setSelectedUser({...selectedUser, premium: e.target.checked})}
                      />
                    </div>
                    <div className="toggle-item">
                      <span>Verification Badge</span>
                      <input 
                        type="checkbox" 
                        checked={selectedUser.verificationBadge} 
                        onChange={e => setSelectedUser({...selectedUser, verificationBadge: e.target.checked})}
                      />
                    </div>
                    <div className="toggle-item">
                      <span>Account Suspended</span>
                      <input 
                        type="checkbox" 
                        checked={selectedUser.isBanned} 
                        onChange={e => setSelectedUser({...selectedUser, isBanned: e.target.checked})}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="save" disabled={isProcessing}>
                  {isProcessing ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
