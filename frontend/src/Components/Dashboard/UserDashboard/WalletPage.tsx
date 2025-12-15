'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { getTransactions } from '@/lib/api/wallet'
import { cacheManager, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import type { Transaction } from '@/lib/api/wallet'
import '../Styles/WalletPage.scss'

export default function WalletPage() {
  const { wallet, loading, refresh } = useUserData()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTransactions = useCallback(async (pageNum = 1) => {
    const cached = cacheManager.get(`${CACHE_KEYS.WALLET_BALANCE}:transactions:page${pageNum}`);
    if (cached) {
      setTransactions(cached.data);
      setTotalPages(cached.totalPages);
      return;
    }

    try {
      setTxLoading(true)
      const response = await getTransactions(pageNum, 10)
      setTransactions(response.data)
      setTotalPages(response.meta.totalPages)
      
      cacheManager.set(
        `${CACHE_KEYS.WALLET_BALANCE}:transactions:page${pageNum}`,
        { data: response.data, totalPages: response.meta.totalPages },
        CACHE_TTL.SHORT
      )
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setTxLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions(page)
  }, [page, fetchTransactions])

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      DEPOSIT: '📥',
      WITHDRAWAL: '📤',
      TRANSFER: '↔️',
      BET: '🎡',
      PAYOUT: '✨',
    }
    return icons[type] || '📋'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: '#10b981',
      PENDING: '#f59e0b',
      FAILED: '#ef4444',
      CANCELLED: '#6b7280',
    }
    return colors[status] || '#6b7280'
  }

  return (
    <div className="wallet-page">
      <div className="wallet-header">
        <h1>💰 Wallet Management</h1>
        <button onClick={() => refresh()} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading wallet data...</div>
      ) : (
        <>
          <div className="wallet-stats-grid">
            <div className="stat-card">
              <div className="stat-label">Available Balance</div>
              <div className="stat-value">${(wallet?.available || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">On Hold</div>
              <div className="stat-value">${(wallet?.held || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Deposited</div>
              <div className="stat-value green">${(wallet?.totalDeposited || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Withdrawn</div>
              <div className="stat-value red">${(wallet?.totalWithdrawn || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Won</div>
              <div className="stat-value green">${(wallet?.totalWon || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Lost</div>
              <div className="stat-value red">${(wallet?.totalLost || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="transactions-section">
            <h2>Recent Transactions</h2>
            
            {txLoading ? (
              <div className="loading">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <p>No transactions yet</p>
              </div>
            ) : (
              <>
                <div className="transactions-table">
                  <div className="table-header">
                    <div className="col-type">Type</div>
                    <div className="col-amount">Amount</div>
                    <div className="col-fee">Fee</div>
                    <div className="col-status">Status</div>
                    <div className="col-date">Date</div>
                  </div>
                  {transactions.map((tx) => (
                    <div key={tx.id} className="table-row">
                      <div className="col-type">
                        <span className="icon">{getTransactionIcon(tx.type)}</span>
                        {tx.type}
                      </div>
                      <div className="col-amount">
                        ${tx.amount.toFixed(2)}
                      </div>
                      <div className="col-fee">
                        ${tx.fee.toFixed(2)}
                      </div>
                      <div className="col-status">
                        <span 
                          className="status-badge"
                          style={{ color: getStatusColor(tx.status) }}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <div className="col-date">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Previous
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
