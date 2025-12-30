/**
 * RecentSpinsTable Component
 * Displays the last 5+ settled rounds in a compact, live-updating table
 * Latest result is highlighted and appears at the top (stack style)
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getRecentRounds, type RecentRound } from '@/lib/api/spin';
import { getWebSocketClient } from '@/lib/websocket';
import { TrendingUp, TrendingDown, Zap, Shield, Target, Clock } from 'lucide-react';

interface RecentSpinsTableProps {
  maxResults?: number;
}

// Winner icon/color mapping
const WINNER_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  BUY: { icon: <TrendingUp size={14} />, color: '#22c55e', label: 'BUY' },
  SELL: { icon: <TrendingDown size={14} />, color: '#ef4444', label: 'SELL' },
  BLUE: { icon: <span>●</span>, color: '#3b82f6', label: 'BLUE' },
  RED: { icon: <span>●</span>, color: '#ef4444', label: 'RED' },
  HIGH_VOL: { icon: <Zap size={14} />, color: '#f59e0b', label: 'HIGH' },
  LOW_VOL: { icon: <Shield size={14} />, color: '#06b6d4', label: 'LOW' },
  INDECISION: { icon: <Target size={14} />, color: '#fbbf24', label: 'INDEC' },
};

export default function RecentSpinsTable({ maxResults = 5 }: RecentSpinsTableProps) {
  const [rounds, setRounds] = useState<RecentRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newRoundIds, setNewRoundIds] = useState<Set<string>>(new Set());

  // Fetch recent rounds
  const fetchRounds = useCallback(async () => {
    try {
      const data = await getRecentRounds(maxResults);
      
      // Track new rounds for animation
      const currentIds = new Set(rounds.map(r => r.id));
      const newIds = new Set<string>();
      
      if (data.data) {
        data.data.forEach(round => {
          if (!currentIds.has(round.id)) {
            newIds.add(round.id);
          }
        });
        
        setRounds(data.data);
        setNewRoundIds(newIds);
        setLastUpdate(new Date());
        
        // Clear new round highlight after 3 seconds
        if (newIds.size > 0) {
          setTimeout(() => setNewRoundIds(new Set()), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent rounds:', error);
    } finally {
      setLoading(false);
    }
  }, [maxResults, rounds]);

  // Initial fetch
  useEffect(() => {
    fetchRounds();
    
    // Also poll every 10 seconds to catch any missed updates
    const pollInterval = setInterval(() => {
      fetchRounds();
    }, 10000);
    
    return () => clearInterval(pollInterval);
  }, []);

  // Listen for WebSocket updates
  useEffect(() => {
    const client = getWebSocketClient();
    
    // Refresh when a round is settled
    const unsubscribeSettled = client.on('roundSettled', () => {
      console.log('Round settled - refreshing recent spins');
      setTimeout(fetchRounds, 500); // Small delay to ensure DB is updated
    });

    // Also listen for state changes
    const unsubscribeState = client.on('roundStateChanged', (data) => {
      console.log('Round state changed:', data);
      if (data.state === 'SETTLED') {
        setTimeout(fetchRounds, 500);
      }
    });
    
    // Listen for new round opening too
    const unsubscribeNewRound = client.on('roundOpened', () => {
      console.log('New round opened - refreshing');
      fetchRounds();
    });

    return () => {
      unsubscribeSettled();
      unsubscribeState();
      unsubscribeNewRound();
    };
  }, [fetchRounds]);

  // Format time ago
  const formatTimeAgo = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'just now';
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      
      if (diffSec < 0) return 'just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return 'recently';
    }
  };

  // Render winner badge
  const renderWinner = (winner: string | null, isIndecision: boolean = false) => {
    if (isIndecision) {
      const config = WINNER_CONFIG.INDECISION;
      return (
        <span className="winner-badge indecision" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
          {config.icon}
          <span>{config.label}</span>
        </span>
      );
    }
    
    if (!winner) return <span className="winner-badge empty">—</span>;
    
    const config = WINNER_CONFIG[winner];
    if (!config) return <span className="winner-badge">{winner}</span>;
    
    return (
      <span className="winner-badge" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="recent-spins-table loading">
        <div className="table-header">
          <span className="header-title">Recent Results</span>
        </div>
        <div className="loading-state">
          <div className="spinner-small"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="recent-spins-table empty">
        <div className="table-header">
          <span className="header-title">Recent Results</span>
        </div>
        <div className="empty-state">
          <Clock size={20} />
          <span>No results yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-spins-table">
      <div className="table-header">
        <span className="header-title">🎰 Recent Results</span>
        <span className="header-live">
          <span className="live-dot"></span>
          LIVE
        </span>
      </div>
      
      <div className="table-content">
        {rounds.map((round, index) => {
          const isLatest = index === 0;
          const isNew = newRoundIds.has(round.id);
          
          return (
            <div 
              key={round.id} 
              className={`result-row ${isLatest ? 'latest' : ''} ${isNew ? 'new-entry' : ''}`}
            >
              <div className="row-round">
                <span className="round-number">#{round.roundNumber}</span>
                <span className="round-time">{formatTimeAgo(round.settledAt)}</span>
              </div>
              
              <div className="row-winners">
                {round.indecisionTriggered ? (
                  <div className="winners-indecision">
                    {renderWinner(null, true)}
                  </div>
                ) : (
                  <>
                    <div className="winner-cell" title="Direction (BUY/SELL)">
                      {renderWinner(round.outerWinner)}
                    </div>
                    <div className="winner-cell" title="Color (BLUE/RED)">
                      {renderWinner(round.middleWinner)}
                    </div>
                    <div className="winner-cell" title="Volatility (HIGH/LOW)">
                      {renderWinner(round.innerWinner)}
                    </div>
                  </>
                )}
              </div>
              
              <div className="row-volume">
                ${typeof round.totalVolume === 'number' 
                  ? round.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : Number(round.totalVolume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          );
        })}
      </div>
      
      {lastUpdate && (
        <div className="table-footer">
          <span className="update-time">Updated {formatTimeAgo(lastUpdate.toISOString())}</span>
        </div>
      )}
    </div>
  );
}

