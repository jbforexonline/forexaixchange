/**
 * TradingHistoryTable Component
 * v3.0: Displays trading history in the same format as the landing page
 * with duration filtering (5m, 10m, 20m) and time period filtering
 * v3.1: Added props to control filter visibility and scrollable unlimited data
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getMarketInstanceHistory, getRoundHistory, type MarketInstanceHistory } from '@/lib/api/spin';
import { getWebSocketClient } from '@/lib/websocket';
import './TradingHistoryTable.scss';

interface TradingHistoryTableProps {
  selectedDuration?: 5 | 10 | 20;
  maxResults?: number;
  showDurationFilter?: boolean; // Show 5m/10m/20m filter (premium only)
  showTimeFilter?: boolean; // Show hourly/daily/weekly etc filter
  scrollable?: boolean; // Make table scrollable with unlimited data
  title?: string;
}

type TimePeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'all';

interface HistoryRow {
  id: string;
  date: string;
  previous: string;
  previousType: 'primary' | 'danger' | 'warning' | 'info';
  forexAI: string;
  suggestion: string;
  resultType: 'success' | 'danger' | 'warning' | 'info';
  durationMinutes?: string;
  roundNumber?: number;
}

// Duration label mapping
const DURATION_LABELS: Record<string, string> = {
  'FIVE': '5m',
  'TEN': '10m',
  'TWENTY': '20m',
};

export default function TradingHistoryTable({ 
  selectedDuration = 20, 
  maxResults = 50,
  showDurationFilter = true, // Now only controls whether to show duration badge, not filter buttons
  showTimeFilter = true,
  scrollable = true,
  title = "Trading History",
}: TradingHistoryTableProps) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  // v3.2: Removed durationFilter state - now uses selectedDuration from sidebar directly

  // Determine badge type based on result
  const getBadgeType = (result: string): 'primary' | 'danger' | 'warning' | 'info' => {
    if (!result || result === 'N/A') return 'info';
    const upper = result.toUpperCase();
    if (upper.includes('INDECISION')) return 'warning';
    if (upper.includes('BUY') || upper.includes('BLUE') || upper.includes('LOW')) return 'primary';
    if (upper.includes('SELL') || upper.includes('RED') || upper.includes('HIGH')) return 'danger';
    return 'info';
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'N/A';
    }
  };

  // Generate AI suggestion (simulated based on previous result)
  const generateAISuggestion = (prevResult: string): string => {
    if (!prevResult || prevResult === 'N/A') return 'AI ANALYSING MARKET';
    
    // Simple AI logic: suggest based on patterns
    const upper = prevResult.toUpperCase();
    if (upper.includes('HIGH')) return 'LOW VOLATILE';
    if (upper.includes('LOW')) return 'HIGH VOLATILE';
    if (upper.includes('INDECISION')) return 'HIGH VOLATILE';
    return 'AI ANALYSING MARKET';
  };

  // Fetch history data
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      const period = timePeriod === 'all' ? undefined : timePeriod;
      const limit = scrollable ? 100 : maxResults;
      
      // v3.2: Simplified logic - uses selectedDuration from sidebar
      // - Normal user (showDurationFilter=false): Use getRoundHistory (20m master rounds only)
      // - Premium user (showDurationFilter=true): Use selectedDuration from sidebar (5, 10, or 20)
      
      if (!showDurationFilter) {
        // Normal users: Use master round history (20m only)
        const roundResponse = await getRoundHistory(1, limit);
        let rounds = Array.isArray(roundResponse?.data) ? roundResponse.data : [];
        
        // Filter by time period if specified
        if (period && rounds.length > 0) {
          const now = new Date();
          let startDate: Date;
          switch(period) {
            case 'hourly': startDate = new Date(now.getTime() - 60 * 60 * 1000); break;
            case 'daily': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case 'weekly': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case 'monthly': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case 'quarterly': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
            case 'annually': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
            default: startDate = new Date(0);
          }
          rounds = rounds.filter((r: any) => new Date(r.settledAt || r.openedAt) >= startDate);
        }
        
        if (rounds.length > 0) {
          const rows: HistoryRow[] = [];
          
          // Current placeholder
          rows.push({
            id: 'current',
            date: 'Current',
            previous: formatRoundResult(rounds[0]),
            previousType: getBadgeType(formatRoundResult(rounds[0])),
            forexAI: 'AI ANALYSING MARKET',
            suggestion: 'WAITING RESULTS',
            resultType: 'info',
          });
          
          // Add all historical rows from ACTUAL round results
          for (let i = 0; i < rounds.length - 1; i++) {
            const current = rounds[i];
            const previous = rounds[i + 1];
            
            rows.push({
              id: current.id,
              date: formatDate(current.settledAt || current.openedAt),
              previous: formatRoundResult(previous),
              previousType: getBadgeType(formatRoundResult(previous)),
              forexAI: generateAISuggestion(formatRoundResult(previous)),
              suggestion: formatRoundResult(current),
              resultType: current.indecisionTriggered ? 'warning' : 'success',
              roundNumber: current.roundNumber,
            });
          }
          
          setHistory(rows);
        } else {
          setHistory([]);
        }
      } else {
        // Premium users: Use getMarketInstanceHistory with selectedDuration from sidebar
        // selectedDuration comes from the ROUND DURATION controls on the right sidebar
        // Use same high limit as normal users so premium sees full history and can scroll
        const response = await getMarketInstanceHistory(selectedDuration, 1, limit, period);
        
        if (response.data && response.data.length > 0) {
          const rows: HistoryRow[] = [];
          
          // Current placeholder
          rows.push({
            id: 'current',
            date: 'Current',
            previous: response.data[0]?.resultText || 'N/A',
            previousType: getBadgeType(response.data[0]?.resultText || ''),
            forexAI: 'AI ANALYSING MARKET',
            suggestion: 'WAITING RESULTS',
            resultType: 'info',
            durationMinutes: DURATION_LABELS[response.data[0]?.durationMinutes] || `${selectedDuration}m`,
          });
          
          // Add historical rows from market instances
          for (let i = 0; i < response.data.length - 1; i++) {
            const current = response.data[i];
            const previous = response.data[i + 1];
            
            rows.push({
              id: current.id,
              date: formatDate(current.settledAt),
              previous: previous?.resultText || 'N/A',
              previousType: getBadgeType(previous?.resultText || ''),
              forexAI: generateAISuggestion(previous?.resultText || ''),
              suggestion: current.resultText,
              resultType: current.indecisionTriggered ? 'warning' : 'success',
              durationMinutes: DURATION_LABELS[current.durationMinutes],
              roundNumber: current.roundNumber,
            });
          }
          
          setHistory(rows);
        } else {
          setHistory([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trading history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDuration, timePeriod, maxResults, showDurationFilter, scrollable]);

  // Format round result from Round table data
  const formatRoundResult = (round: any): string => {
    if (!round) return 'N/A';
    if (round.indecisionTriggered) return 'INDECISION';
    
    const parts = [];
    if (round.outerWinner) parts.push(round.outerWinner);
    if (round.middleWinner) parts.push(round.middleWinner);
    if (round.innerWinner) parts.push(round.innerWinner);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Listen for settlement events
  useEffect(() => {
    const wsClient = getWebSocketClient();
    
    const handleSettlement = () => {
      console.log('📊 Settlement detected - refreshing trading history');
      setTimeout(fetchHistory, 500);
    };
    
    const unsub1 = wsClient.on('roundSettled', handleSettlement);
    const unsub2 = wsClient.on('marketInstanceSettled', handleSettlement);
    
    return () => {
      unsub1();
      unsub2();
    };
  }, [fetchHistory]);

  // Time period options - KEEPING THESE
  const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' },
    { value: 'all', label: 'All Time' },
  ];

  // v3.2: Removed duration filter buttons - now controlled by sidebar only

  return (
    <div className={`trading-history-table ${scrollable ? 'scrollable' : ''}`}>
      {/* Header with current duration indicator and time filter */}
      <div className="history-header">
        <h3>
          {title}
          {/* Show current duration indicator for premium users */}
          {showDurationFilter && (
            <span className="duration-indicator">{selectedDuration}m</span>
          )}
        </h3>
        
        {/* Time period filter only */}
        {showTimeFilter && (
          <div className="history-filters">
            <div className="filter-group period-filter">
              <select 
                value={timePeriod} 
                onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                className="period-select"
              >
                {TIME_PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table - scrollable container */}
      <div className={`history-wrapper ${scrollable ? 'scrollable-container' : ''}`}>
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Previous Result</th>
              <th>AI Suggestion</th>
              <th>Recent Result</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="loading-cell">
                  <div className="loading-spinner"></div>
                  Loading live data...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-cell">
                  No trading history available for this selection
                </td>
              </tr>
            ) : (
              history.map((row) => (
                <tr 
                  key={row.id} 
                  className={row.date === "Current" ? "current-round" : ""}
                >
                  <td className="date-cell">
                    {row.date}
                    {row.durationMinutes && row.date !== 'Current' && (
                      <span className="duration-badge">{row.durationMinutes}</span>
                    )}
                  </td>

                  <td>
                    <span className={`badge ${row.previousType}`}>
                      {row.previous}
                    </span>
                  </td>

                  <td>
                    <span className="badge info ai-badge">
                      {row.forexAI}
                    </span>
                  </td>

                  <td>
                    <span className={`badge ${row.resultType}`}>
                      {row.suggestion}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
