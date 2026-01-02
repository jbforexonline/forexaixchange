"use client";
import React, { useState, useEffect } from "react";
import { getReferralData, getReferralLink } from "@/lib/api/referral";
import "./ReferralPage.scss";

export default function ReferralPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await getReferralData();
            const data = result?.data ?? result;
            setStats(data);
        } catch (err) {
            console.error("Failed to load referral data:", err);
            setError("Failed to load referral data");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (!stats) return;

        const link = getReferralLink(stats.affiliateCode);
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="referral-page">
                <div className="loading">Loading referral data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="referral-page">
                <div className="error-message">❌ {error}</div>
            </div>
        );
    }

    const referralLink = stats ? getReferralLink(stats.affiliateCode) : '';

    return (
        <div className="referral-page">
            <div className="referral-header">
                <h1>🎁 Referral Program</h1>
                <p>Earn commissions by inviting friends to join!</p>
            </div>

            <div className="referral-link-card">
                <h3>Your Referral Link</h3>
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
                        {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                </div>
                <p className="link-hint">
                    Share this link with friends. When they sign up and subscribe to premium, you earn commission!
                </p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{stats?.totalReferrals || 0}</div>
                    <div className="stat-label">Total Referrals</div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-icon">💰</div>
                    <div className="stat-value">${(stats?.totalEarnings || 0).toFixed(2)}</div>
                    <div className="stat-label">Total Earnings</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">${(stats?.totalPaid || 0).toFixed(2)}</div>
                    <div className="stat-label">Paid Out</div>
                </div>

                <div className="stat-card pending">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-value">${(stats?.pendingPayout || 0).toFixed(2)}</div>
                    <div className="stat-label">Pending</div>
                </div>
            </div>

            <div className="commission-tiers">
                <h2>Commission Tiers</h2>
                <div className="tiers-grid">
                    <div className="tier-card">
                        <div className="tier-name">Tier 1</div>
                        <div className="tier-amount">$0</div>
                        <div className="tier-condition">$50 subscription</div>
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

            <div className="referrals-list">
                <h2>Referred Users</h2>
                {stats?.referrals && stats.referrals.length > 0 ? (
                    <div className="referrals-table">
                        <div className="table-header">
                            <div>User</div>
                            <div>Joined</div>
                            <div>Total Activity</div>
                            <div>Total Commission</div>
                            <div>Status</div>
                        </div>
                        {stats.referrals.map((ref) => (
                            <div key={ref.id} className="referral-row">
                                <div className="ref-user">
                                    <span className="user-icon">👤</span>
                                    {ref.username}
                                </div>
                                <div className="ref-date">
                                    {new Date(ref.createdAt).toLocaleDateString()}
                                </div>
                                <div className="ref-activity">
                                    ${(ref.totalDeposited || 0).toFixed(2)}
                                </div>
                                <div className="ref-commission">
                                    ${((ref.yourCommission || 0)).toFixed(2)}
                                </div>
                                <div className={`ref-status ${ref.status.toLowerCase()}`}>
                                    {ref.status}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-container">
                        <div className="empty-icon">👥</div>
                        <p>No referrals yet. Share your link above to start earning commissions!</p>
                    </div>
                )}
            </div>

            {stats?.earnings && stats.earnings.length > 0 && (
                <div className="earnings-history">
                    <h2>Recent Earnings</h2>
                    <div className="earnings-table">
                        <div className="table-header">
                            <div>Source</div>
                            <div>Type</div>
                            <div>Amount</div>
                            <div>Status</div>
                        </div>
                        {stats.earnings.slice(0, 10).map((earning) => (
                            <div key={earning.id} className="earning-row">
                                <div className="earning-user">
                                    <span className="user-icon">💰</span>
                                    {earning.description || 'Commission'}
                                </div>
                                <div className="earning-tier">{earning.tier}</div>
                                <div className="earning-amount">${earning.amount.toFixed(2)}</div>
                                <div className={`earning-status ${earning.isPaid ? 'paid' : 'pending'}`}>
                                    {earning.isPaid ? '✓ Paid' : '⏳ Pending'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
