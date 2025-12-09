'use client';
import React, { useState, useEffect } from 'react';
import { getDashboardStats, getRecentActivity, getAllUsers, getSystemConfig } from '@/lib/api/admin';
import { useWallet } from '@/hooks/useWallet';
import '../Styles/DashboardHome.scss';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { wallet } = useWallet();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, activityData, usersData] = await Promise.all([
          getDashboardStats(),
          getRecentActivity(10),
          getAllUsers(1, 10)
        ]);
        setStats(statsData);
        setActivity(activityData);
        setUsers(usersData.data || []);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-topbar">
        <h2>Admin Dashboard</h2>
        <div className="actions">
          {wallet && (
            <div style={{ marginRight: '1rem', color: '#666' }}>
              Balance: ${wallet.available?.toFixed(2) || '0.00'}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <h4>Total Users</h4>
          <h2>{stats?.users?.total || 0}</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Active: {stats?.users?.active || 0} | Premium: {stats?.users?.premium || 0}
          </p>
        </div>
        <div className="stat-card">
          <h4>Total Deposits</h4>
          <h2>${parseFloat(stats?.financial?.totalDeposits || 0).toLocaleString()}</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Withdrawals: ${parseFloat(stats?.financial?.totalWithdrawals || 0).toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <h4>Pending Approvals</h4>
          <h2>{stats?.financial?.pendingWithdrawals || 0}</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Transfers: {stats?.financial?.pendingTransfers || 0}
          </p>
        </div>
        <div className="stat-card">
          <h4>Total Activity</h4>
          <h2>{stats?.activity?.totalSpins || 0}</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Transactions: {stats?.activity?.totalTransactions || 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-content">
        <div className="sales-card">
          <div className="card-header">
            <h4>Quick Actions</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <a href="/users" style={{ padding: '0.75rem', background: '#007bff', color: '#fff', borderRadius: '4px', textDecoration: 'none', textAlign: 'center' }}>
              Manage Users
            </a>
            <a href="/withdraw" style={{ padding: '0.75rem', background: '#28a745', color: '#fff', borderRadius: '4px', textDecoration: 'none', textAlign: 'center' }}>
              Approve Transactions
            </a>
            <a href="/admin/config" style={{ padding: '0.75rem', background: '#6c757d', color: '#fff', borderRadius: '4px', textDecoration: 'none', textAlign: 'center' }}>
              System Settings
            </a>
          </div>
        </div>

        <div className="earning-card">
          <div className="card-header">
            <h4>Financial Summary</h4>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <span>Total Deposits:</span>
              <strong>${parseFloat(stats?.financial?.totalDeposits || 0).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <span>Total Withdrawals:</span>
              <strong>${parseFloat(stats?.financial?.totalWithdrawals || 0).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <span>Net Revenue:</span>
              <strong style={{ color: '#28a745' }}>
                ${(parseFloat(stats?.financial?.totalDeposits || 0) - parseFloat(stats?.financial?.totalWithdrawals || 0)).toLocaleString()}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Pending Withdrawals:</span>
              <strong style={{ color: '#ffc107' }}>{stats?.financial?.pendingWithdrawals || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices & Activity */}
      <div className="bottom-section">
        <div className="invoice-card">
          <h4>New Winner</h4>
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Invoice Name</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>INV-012-3456789</td>
                <td>Mailchimp Support</td>
                <td>28-12-22</td>
                <td>$320.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="activity-card">
          <h4>Recent User</h4>
          <ul>
            <li>
              <img src="https://randomuser.me/api/portraits/men/33.jpg" alt="Uchiha" />
              <div>
                <h5>Uchiha Itachi</h5>
                <p>Just now</p>
              </div>
              <span>INV-054-2856789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Haruno" />
              <div>
                <h5>Haruno Sakura</h5>
                <p>15 minutes ago</p>
              </div>
              <span>INV-024-3426789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
             <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
             <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
             <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/men/33.jpg" alt="Uchiha" />
              <div>
                <h5>Uchiha Itachi</h5>
                <p>Just now</p>
              </div>
              <span>INV-054-2856789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/men/33.jpg" alt="Uchiha" />
              <div>
                <h5>Uchiha Itachi</h5>
                <p>Just now</p>
              </div>
              <span>INV-054-2856789</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
