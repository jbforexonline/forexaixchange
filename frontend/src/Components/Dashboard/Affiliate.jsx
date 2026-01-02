"use client";
import React, { useState, useEffect, useMemo } from "react";
import { getReferralData, getReferralLink, getReferralsList } from "@/lib/api/referral";
import "./ReferralPage.scss";

export default function ReferralPage() {
    const [stats, setStats] = useState({
        affiliateCode: '',
        totalReferrals: 0,
        totalEarnings: 0,
        totalPaid: 0,
        pendingPayout: 0,
        earnings: [], // Initialize as empty array
        referrals: [] // Initialize as empty array
    });
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await getReferralData();
            
            // Extract data from the nested response structure
            const data = response?.data?.data || response?.data || {};
            
            // Safely set stats with fallbacks
            setStats({
                affiliateCode: data?.affiliateCode || '',
                totalReferrals: data?.totalReferrals || data?.totalReferrals || 0,
                totalEarnings: data?.totalEarnings || 0,
                totalPaid: data?.totalPaid || 0,
                pendingPayout: data?.pendingPayout || 0,
                earnings: Array.isArray(data?.earnings) ? data.earnings : [],
                referrals: Array.isArray(data?.referrals) ? data.referrals : []
            });

            // Load detailed referrals if needed
            try {
                const referralsResponse = await getReferralsList();
                // Check for nested structure here too
                const referralsData = referralsResponse?.data?.data || referralsResponse?.data || referralsResponse;
                setReferrals(Array.isArray(referralsData) ? referralsData : []);
            } catch (err) {
                console.error("Failed to load referrals list:", err);
                // Use referrals from stats if available
                if (Array.isArray(data?.referrals)) {
                    setReferrals(data.referrals);
                }
            }
        } catch (err) {
            console.error("Failed to load referral data:", err);
            setError("Failed to load referral data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        const code = stats.affiliateCode || `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const link = getReferralLink(code);
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        if (!stats.affiliateCode) {
            alert("No affiliate code yet. Copied a temporary link. Your code will be generated when you get your first referral.");
        }
    };

    // Format referral link safely
    const referralLink = useMemo(() => {
        if (!stats.affiliateCode) {
            return "Waiting for affiliate code...";
        }
        return getReferralLink(stats.affiliateCode);
    }, [stats.affiliateCode]);

    // Pagination for referrals table
    const [currentPage, setCurrentPage] = useState(1);
    const referralsPerPage = 10;
    
    // Safe array handling for referrals
    const safeReferrals = Array.isArray(referrals) ? referrals : [];
    const indexOfLastReferral = currentPage * referralsPerPage;
    const indexOfFirstReferral = indexOfLastReferral - referralsPerPage;
    const currentReferrals = safeReferrals.slice(indexOfFirstReferral, indexOfLastReferral);
    const totalPages = Math.ceil(safeReferrals.length / referralsPerPage);

    // Pagination for earnings table
    const [earningsPage, setEarningsPage] = useState(1);
    const earningsPerPage = 10;
    
    // Safe array handling for earnings
    const safeEarnings = Array.isArray(stats.earnings) ? stats.earnings : [];
    const indexOfLastEarning = earningsPage * earningsPerPage;
    const indexOfFirstEarning = indexOfLastEarning - earningsPerPage;
    const currentEarnings = safeEarnings.slice(indexOfFirstEarning, indexOfLastEarning);
    const totalEarningsPages = Math.ceil(safeEarnings.length / earningsPerPage);

    if (loading) {
        return (
            <div className="referral-page">
                <div className="loading">
                    <div className="spinner"></div>
                    Loading referral data...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="referral-page">
                <div className="error-message">❌ {error}</div>
                <button onClick={loadData} className="retry-btn">
                    🔄 Retry
                </button>
            </div>
        );
    }

    return (
        <div className="referral-page">
            <div className="referral-header">
                <h1>🎁 Referral Program</h1>
                <p>Earn commissions by inviting friends to join!</p>
            </div>

            {/* Tabs Navigation */}
            <div className="tabs-navigation">
                <button 
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Overview
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('referrals')}
                >
                    👥 Referrals ({safeReferrals.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'earnings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('earnings')}
                >
                    💰 Earnings ({safeEarnings.length})
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    <div className="referral-link-card">
                        <h3>
                            <span className="icon">🔗</span>
                            Your Referral Link
                            {!stats.affiliateCode && (
                                <span className="code-warning">(Code pending)</span>
                            )}
                        </h3>
                        <div className="link-container">
                            <input
                                type="text"
                                value={referralLink}
                                readOnly
                                className="link-input"
                            />
                            <button
                                onClick={handleCopyLink}
                                className={`copy-btn ${copied ? 'copied' : ''}`}
                            >
                                {copied ? '✓ Copied!' : '📋 Copy Link'}
                            </button>
                        </div>
                        <p className="link-hint">
                            Share this link with friends. When they sign up and subscribe to premium, you earn commission!
                        </p>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">👥</div>
                            <div className="stat-value">{stats.totalReferrals}</div>
                            <div className="stat-label">Total Referrals</div>
                        </div>

                        <div className="stat-card highlight">
                            <div className="stat-icon">💰</div>
                            <div className="stat-value">${stats.totalEarnings.toFixed(2)}</div>
                            <div className="stat-label">Total Earnings</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">${stats.totalPaid.toFixed(2)}</div>
                            <div className="stat-label">Paid Out</div>
                        </div>

                        <div className="stat-card pending">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-value">${stats.pendingPayout.toFixed(2)}</div>
                            <div className="stat-label">Pending</div>
                        </div>
                    </div>

                    <div className="commission-tiers">
                        <h2>Commission Tiers</h2>
                        <div className="tiers-grid">
                            <div className="tier-card">
                                <div className="tier-name">Tier 1</div>
                                <div className="tier-amount">$0</div>
                                <div className="tier-condition">&lt; $50 subscription</div>
                            </div>
                            <div className="tier-card">
                                <div className="tier-name">Tier 2</div>
                                <div className="tier-amount">$1</div>
                                <div className="tier-condition">$50 - $100</div>
                            </div>
                            <div className="tier-card">
                                <div className="tier-name">Tier 3</div>
                                <div className="tier-amount">$2</div>
                                <div className="tier-condition">$100 - $500</div>
                            </div>
                            <div className="tier-card">
                                <div className="tier-name">Tier 4</div>
                                <div className="tier-amount">$5</div>
                                <div className="tier-condition">$500 - $2000</div>
                            </div>
                            <div className="tier-card highlight">
                                <div className="tier-name">Tier 5</div>
                                <div className="tier-amount">$7</div>
                                <div className="tier-condition">$2000+</div>
                            </div>
                        </div>
                    </div>

                    <div className="table-section overview-referrals" style={{ marginTop: '2rem' }}>
                        <div className="section-header">
                            <h2>Your Referrals</h2>
                        </div>
                        
                        {safeReferrals.length > 0 ? (
                            <div className="table-container">
                                <table className="referrals-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Joined Date</th>
                                            <th>Total Deposits</th>
                                            <th>Your Commission</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {safeReferrals.slice(0, 10).map((referral, index) => (
                                            <tr key={referral.id || `referral-${index}`} className="referral-row">
                                                <td className="ref-user-cell" data-label="User">
                                                    <div className="ref-user">
                                                        <div className="user-icon">👤</div>
                                                        <div className="user-info">
                                                            <div className="username">{referral.username || 'Unknown User'}</div>
                                                            <div className="email">{referral.email || 'No email'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="ref-date" data-label="Joined Date">
                                                    {referral.createdAt 
                                                        ? new Date(referral.createdAt).toLocaleDateString() 
                                                        : 'N/A'}
                                                </td>
                                                <td className="amount-cell ref-activity" data-label="Total Deposits">
                                                    ${(referral.totalDeposited || 0).toFixed(2)}
                                                </td>
                                                <td className="amount-cell commission-cell ref-commission" data-label="Your Commission">
                                                    ${(referral.yourCommission || 0).toFixed(2)}
                                                </td>
                                                <td className="ref-status-cell" data-label="Status">
                                                    <span className={`ref-status ${referral.status === 'Active' ? 'active' : 'inactive'}`}>
                                                        {referral.status || 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {safeReferrals.length > 10 && (
                                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                        <button 
                                            onClick={() => setActiveTab('referrals')}
                                            className="view-all-btn"
                                            style={{ 
                                                background: 'transparent', 
                                                color: '#64c8ff', 
                                                border: '1px solid #64c8ff',
                                                padding: '8px 16px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View All Referrals
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">👥</div>
                                <p>No referrals yet. Share your link above to start earning commissions!</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Referrals Tab */}
            {activeTab === 'referrals' && (
                <div className="table-section">
                    <div className="section-header">
                        <h2>Your Referrals</h2>
                        <div className="table-info">
                            Showing {Math.min(indexOfFirstReferral + 1, safeReferrals.length)}-{Math.min(indexOfLastReferral, safeReferrals.length)} of {safeReferrals.length} referrals
                        </div>
                    </div>
                    
                    {safeReferrals.length > 0 ? (
                        <>
                            <div className="table-container">
                                <table className="referrals-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Joined Date</th>
                                            <th>Total Deposits</th>
                                            <th>Your Commission</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentReferrals.map((referral, index) => (
                                            <tr key={referral.id || `referral-${index}`}>
                                                <td data-label="User">
                                                    <div className="user-cell">
                                                        <div className="user-icon">👤</div>
                                                        <div className="user-info">
                                                            <div className="username">{referral.username || 'Unknown User'}</div>
                                                            <div className="email">{referral.email || 'No email'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td data-label="Joined Date">
                                                    {referral.createdAt 
                                                        ? new Date(referral.createdAt).toLocaleDateString() 
                                                        : 'N/A'}
                                                </td>
                                                <td className="amount-cell" data-label="Total Deposits">
                                                    ${(referral.totalDeposited || 0).toFixed(2)}
                                                </td>
                                                <td className="amount-cell commission-cell" data-label="Your Commission">
                                                    ${(referral.yourCommission || 0).toFixed(2)}
                                                </td>
                                                <td data-label="Status">
                                                    <span className={`status-badge ${referral.status === 'Active' ? 'active' : 'inactive'}`}>
                                                        {referral.status || 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button 
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        ← Previous
                                    </button>
                                    
                                    <div className="page-numbers">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            
                                            return (
                                                <button
                                                    key={pageNum}
                                                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <button 
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">👥</div>
                            <h3>No referrals yet</h3>
                            <p>Share your referral link to start earning commissions!</p>
                            <button onClick={() => setActiveTab('overview')} className="back-to-overview">
                                Copy Your Referral Link
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
                <div className="table-section">
                    <div className="section-header">
                        <h2>Earnings History</h2>
                        <div className="table-info">
                            Showing {Math.min(indexOfFirstEarning + 1, safeEarnings.length)}-{Math.min(indexOfLastEarning, safeEarnings.length)} of {safeEarnings.length} earnings
                        </div>
                    </div>
                    
                    {safeEarnings.length > 0 ? (
                        <>
                            <div className="table-container">
                                <table className="earnings-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Tier</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentEarnings.map((earning, index) => (
                                            <tr key={earning.id || `earning-${index}`}>
                                                <td data-label="Date">
                                                    {earning.createdAt 
                                                        ? new Date(earning.createdAt).toLocaleDateString() 
                                                        : 'N/A'}
                                                </td>
                                                <td data-label="Tier">
                                                    <span className="tier-badge">{earning.tier || 'N/A'}</span>
                                                </td>
                                                <td className="amount-cell" data-label="Amount">
                                                    ${(earning.amount || 0).toFixed(2)}
                                                </td>
                                                <td data-label="Status">
                                                    <span className={`status-badge ${earning.isPaid ? 'paid' : 'pending'}`}>
                                                        {earning.isPaid ? '✓ Paid' : '⏳ Pending'}
                                                    </span>
                                                </td>
                                                <td className="description-cell" data-label="Description">
                                                    {earning.description || 'Referral commission'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalEarningsPages > 1 && (
                                <div className="pagination">
                                    <button 
                                        className="pagination-btn"
                                        onClick={() => setEarningsPage(prev => Math.max(prev - 1, 1))}
                                        disabled={earningsPage === 1}
                                    >
                                        ← Previous
                                    </button>
                                    
                                    <div className="page-numbers">
                                        {Array.from({ length: Math.min(5, totalEarningsPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalEarningsPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (earningsPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (earningsPage >= totalEarningsPages - 2) {
                                                pageNum = totalEarningsPages - 4 + i;
                                            } else {
                                                pageNum = earningsPage - 2 + i;
                                            }
                                            
                                            return (
                                                <button
                                                    key={pageNum}
                                                    className={`page-btn ${earningsPage === pageNum ? 'active' : ''}`}
                                                    onClick={() => setEarningsPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <button 
                                        className="pagination-btn"
                                        onClick={() => setEarningsPage(prev => Math.min(prev + 1, totalEarningsPages))}
                                        disabled={earningsPage === totalEarningsPages}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">💰</div>
                            <h3>No earnings yet</h3>
                            <p>Start referring friends to earn commissions!</p>
                            <button onClick={() => setActiveTab('overview')} className="back-to-overview">
                                Get Your Referral Link
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}