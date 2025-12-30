'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAffiliateData, getReferrals, getAffiliateLeaderboard, type AffiliateStats, type Referral } from '@/lib/api/affiliate'
import { cacheManager, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import '../Styles/Affiliate.scss'

export default function AffiliatePage() {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    const cachedStats = cacheManager.get(CACHE_KEYS.AFFILIATE_DATA);
    if (cachedStats) {
      setStats(cachedStats);
    } else {
      try {
        const data = await getAffiliateData()
        setStats(data)
        cacheManager.set(CACHE_KEYS.AFFILIATE_DATA, data, CACHE_TTL.MEDIUM)
      } catch (error) {
        console.error('Failed to fetch affiliate data:', error)
      }
    }

    try {
      const referralsData = await getReferrals(page, 10)
      setReferrals(referralsData.data)
    } catch (error) {
      console.error('Failed to fetch referrals:', error)
    }

    try {
      const leaderboardData = await getAffiliateLeaderboard('allTime', 10)
      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }

    setLoading(false)
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode)
      alert('Referral code copied!')
    }
  }

  if (loading) return <div className="loading">Loading affiliate data...</div>

  return (
    <div className="affiliate-page">
      <div className="page-header">
        <h1>🤝 Affiliate Program</h1>
        <p>Earn commissions by referring other traders</p>
      </div>

      {stats && (
        <>
          <div className="referral-code-section">
            <h3>Your Referral Code</h3>
            <div className="code-display">
              <input 
                type="text" 
                value={stats.referralCode} 
                readOnly 
                className="code-input"
              />
              <button onClick={copyReferralCode} className="copy-btn">
                📋 Copy
              </button>
            </div>
            <p className="code-hint">Share this code with your friends to start earning!</p>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">Total Referrals</div>
              <div className="stat-value">{stats.totalReferrals}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Active Referrals</div>
              <div className="stat-value">{stats.activeReferrals}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Deposits</div>
              <div className="stat-value">${stats.totalDepositsFromReferrals.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Commissions</div>
              <div className="stat-value green">${stats.totalCommissionsEarned.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Pending Commission</div>
              <div className="stat-value pending">${stats.pendingCommission.toFixed(2)}</div>
            </div>
          </div>

          {stats.commissionTiers.length > 0 && (
            <div className="tiers-section">
              <h3>Commission Tiers</h3>
              <div className="tiers-grid">
                {stats.commissionTiers.map((tier, idx) => (
                  <div key={idx} className="tier-card">
                    <div className="tier-level">Tier {tier.tier}</div>
                    <div className="tier-info">
                      <p>Min Daily Referrals: ${tier.dailyReferralMinimum}</p>
                      <p className="commission">Commission: {tier.commissionPercentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="referrals-section">
            <h3>Recent Referrals</h3>
            {referrals.length === 0 ? (
              <p className="empty">No referrals yet</p>
            ) : (
              <div className="referrals-list">
                {referrals.map((ref) => (
                  <div key={ref.id} className="referral-item">
                    <div className="ref-info">
                      <p className="ref-username">{ref.referredUsername}</p>
                      <p className="ref-status">{ref.status}</p>
                    </div>
                    <div className="ref-amount">${ref.totalDeposits.toFixed(2)}</div>
                    <div className="ref-commission">${ref.commissionEarned.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {leaderboard.length > 0 && (
            <div className="leaderboard-section">
              <h3>Top Affiliates</h3>
              <div className="leaderboard">
                {leaderboard.map((entry, idx) => (
                  <div key={idx} className="leaderboard-item">
                    <div className="rank">{entry.rank}</div>
                    <div className="name">{entry.username}</div>
                    <div className="earning">${entry.totalCommissionsEarned.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
