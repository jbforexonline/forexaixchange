"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell
} from "recharts";
import React from "react";
import "../Components/Styles/Historigram.scss";
import { getRoundHistory, getCurrentRound, getLiveMarketDistribution, getMarketInstanceHistory } from "../lib/api/spin";
import { getWebSocketClient } from "../lib/websocket";
import { useEffect, useState, useRef } from "react";

const DEFAULT_KEYS = [
  "Buy",
  "Sell",
  "Blue",
  "Red",
  "High Volatile",
  "Low Volatile",
  "Indecision"
];

// Color mapping for each selection (matching statistics page)
const SELECTION_COLORS = {
  BUY: '#22c55e',      // Green
  SELL: '#ef4444',     // Red
  BLUE: '#3b82f6',     // Blue
  RED: '#f97316',      // Orange
  HIGH_VOL: '#8b5cf6', // Purple
  LOW_VOL: '#06b6d4',  // Cyan
  INDECISION: '#fbbf24' // Yellow
};

const SELECTION_LABELS = {
  BUY: 'Buy',
  SELL: 'Sell',
  BLUE: 'Blue',
  RED: 'Red',
  HIGH_VOL: 'High Vol',
  LOW_VOL: 'Low Vol',
  INDECISION: 'Indecision'
};

/* DEFAULT TABLE DATA (VISIBLE IMMEDIATELY) */
const DEFAULT_HISTORY = [
  {
    date: "Current",
    previous: "BUY, BLUE, HIGH_VOL", // Result from previous round
    previousType: "primary",
    forexAI: "AI analysing market",
    suggestion: "Waiting results", // Current round not settled yet
    resultType: "info"
  },
  {
    date: "01/24 14:30",
    previous: "SELL, RED, LOW_VOL", // Result from round before this one
    previousType: "danger",
    forexAI: "Low Volatile",
    suggestion: "BUY, BLUE, HIGH_VOL", // Actual settled result of this round
    resultType: "success"
  },
  {
    date: "01/24 14:00",
    previous: "BUY, BLUE, INDECISION", // Result from round before this one
    previousType: "primary",
    forexAI: "High Volatile",
    suggestion: "SELL, RED, LOW_VOL", // Actual settled result of this round
    resultType: "success"
  },
  {
    date: "01/24 13:30",
    previous: "SELL, RED, LOW_VOL", // Result from round before this one
    previousType: "danger",
    forexAI: "Indecision",
    suggestion: "BUY, BLUE, INDECISION", // Actual settled result of this round
    resultType: "success"
  },
  {
    date: "01/24 13:00",
    previous: "BUY, BLUE, HIGH_VOL", // Result from round before this one
    previousType: "primary",
    forexAI: "Low Volatile", 
    suggestion: "SELL, RED, LOW_VOL", // Actual settled result of this round
    resultType: "success"
  },
  {
    date: "01/24 12:30",
    previous: "INDECISION", // Result from round before this one
    previousType: "warning",
    forexAI: "High Volatile", 
    suggestion: "BUY, BLUE, HIGH_VOL", // Actual settled result of this round
    resultType: "success"
  },
  {
    date: "01/24 12:00",
    previous: "SELL, RED, HIGH_VOL", // Result from round before this one
    previousType: "danger",
    forexAI: "Indecision", 
    suggestion: "INDECISION", // Actual settled result of this round
    resultType: "warning"
  },
  {
    date: "01/24 11:30",
    previous: "BUY, BLUE, LOW_VOL", // Result from round before this one
    previousType: "primary",
    forexAI: "High Volatile", 
    suggestion: "SELL, RED, HIGH_VOL", // Actual settled result of this round
    resultType: "success"
  }
];

// Time period options
const TIME_PERIODS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'all', label: 'All Time' },
];

// Custom tooltip for the bar chart
const CustomChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(15, 39, 68, 0.95)',
        border: '1px solid rgba(100, 200, 255, 0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#fff',
        fontSize: '12px'
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{data.label}</p>
        <p style={{ margin: '4px 0 0', color: data.fill }}>
          {data.percentage?.toFixed(1) || 0}%
        </p>
        <p style={{ margin: '2px 0 0', color: 'rgba(165, 213, 255, 0.7)', fontSize: '11px' }}>
          {data.count || 0} orders
        </p>
      </div>
    );
  }
  return null;
};

export default function Histogram({
  title,
  data = [],
  historyRows = DEFAULT_HISTORY,
  showChartOnly = false,
  showHistoryOnly = false
}) {
  const [realHistory, setRealHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('all');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  // Fetch live market distribution for chart
  const fetchChartData = async () => {
    try {
      const liveData = await getLiveMarketDistribution();
      if (liveData?.distribution) {
        const formattedData = liveData.distribution.map(item => ({
          ...item,
          label: SELECTION_LABELS[item.selection] || item.selection,
          fill: SELECTION_COLORS[item.selection] || '#3b82f6'
        }));
        setChartData(formattedData);
      } else {
        // Fallback to default display
        setChartData(DEFAULT_KEYS.map(key => ({
          selection: key.toUpperCase().replace(' ', '_'),
          label: key,
          percentage: 0,
          count: 0,
          fill: SELECTION_COLORS[key.toUpperCase().replace(' ', '_')] || '#3b82f6'
        })));
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      // Set empty data on error
      setChartData(DEFAULT_KEYS.map(key => ({
        selection: key.toUpperCase().replace(' ', '_'),
        label: key,
        percentage: 0,
        count: 0,
        fill: SELECTION_COLORS[key.toUpperCase().replace(' ', '_')] || '#3b82f6'
      })));
    } finally {
      setChartLoading(false);
    }
  };

  // Fetch chart data on mount and set up refresh
  useEffect(() => {
    fetchChartData();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchChartData, 10000);
    
    // Listen for WebSocket updates
    const ws = getWebSocketClient();
    const handleUpdate = () => fetchChartData();
    
    ws.on('betPlaced', handleUpdate);
    ws.on('totalsUpdated', handleUpdate);
    ws.on('roundSettled', handleUpdate);
    ws.on('roundOpened', handleUpdate);
    
    return () => {
      clearInterval(interval);
      ws.off('betPlaced', handleUpdate);
      ws.off('totalsUpdated', handleUpdate);
      ws.off('roundSettled', handleUpdate);
      ws.off('roundOpened', handleUpdate);
    };
  }, []);

  // Calculate limit based on time period
  const getLimit = () => {
    switch(timePeriod) {
      case 'hourly': return 20;
      case 'daily': return 50;
      case 'weekly': return 100;
      default: return 100;
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        
        const limit = getLimit();
        
        // Use getRoundHistory for ACTUAL round results from database
        // This is the authoritative source and consistent with all other tables
        const response = await getRoundHistory(1, limit).catch(() => ({ data: [] }));
        
        // getRoundHistory returns { data: roundsArray, meta }
        const rounds = Array.isArray(response?.data) ? response.data : [];
        
        console.log('Round history (authoritative):', rounds);
        
        // Filter by time period if specified
        if (timePeriod !== 'all' && rounds.length > 0) {
          const now = new Date();
          let startDate;
          switch(timePeriod) {
            case 'hourly': startDate = new Date(now.getTime() - 60 * 60 * 1000); break;
            case 'daily': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case 'weekly': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case 'monthly': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case 'quarterly': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
            case 'annually': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
            default: startDate = new Date(0);
          }
          rounds = rounds.filter(r => new Date(r.settledAt || r.openedAt) >= startDate);
        }
        
        // If we have no data, use default display
        if (rounds.length === 0) {
          setRealHistory(DEFAULT_HISTORY.slice(0, 5));
          setIsLoading(false);
          return;
        }
        
        // Helper to format round result
        const formatRoundResult = (round) => {
          if (!round) return 'N/A';
          if (round.indecisionTriggered) return 'INDECISION';
          
          const parts = [];
          if (round.outerWinner) parts.push(round.outerWinner);
          if (round.middleWinner) parts.push(round.middleWinner);
          if (round.innerWinner) parts.push(round.innerWinner);
          
          return parts.length > 0 ? parts.join(', ') : 'N/A';
        };
        
        // Build display rows from ACTUAL round data
        const formatted = [];
        
        // Add "Current" placeholder row
        formatted.push({
          date: "Current",
          previous: formatRoundResult(rounds[0]),
          previousType: getBadgeType(formatRoundResult(rounds[0])),
          forexAI: "AI analysing market",
          suggestion: "Waiting results",
          resultType: "info"
        });
        
        // Add historical rows from ACTUAL settled rounds
        for (let i = 0; i < rounds.length - 1; i++) {
          const current = rounds[i];
          const previous = rounds[i + 1];
          
          // Get AI suggestion based on previous result
          const prevResult = formatRoundResult(previous);
          let aiSuggestion = "AI analysing market";
          if (prevResult) {
            const prevUpper = prevResult.toUpperCase();
            if (prevUpper.includes('HIGH')) aiSuggestion = "Low Volatile";
            else if (prevUpper.includes('LOW')) aiSuggestion = "High Volatile";
            else if (prevUpper.includes('INDECISION')) aiSuggestion = "High Volatile";
          }
          
          formatted.push({
            date: new Date(current.settledAt || current.openedAt).toLocaleString([], {
              month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }),
            previous: formatRoundResult(previous),
            previousType: getBadgeType(formatRoundResult(previous)),
            forexAI: aiSuggestion,
            suggestion: formatRoundResult(current),
            resultType: current.indecisionTriggered ? "warning" : "success"
          });
        }
        
        setRealHistory(formatted);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setRealHistory(DEFAULT_HISTORY.slice(0, 5));
        setIsLoading(false);
      }
    };
    
    // Helper function for badge type
    const getBadgeType = (result) => {
      if (!result || result === 'N/A') return 'info';
      const upper = result.toUpperCase();
      if (upper.includes('INDECISION')) return 'warning';
      if (upper.includes('BUY') || upper.includes('BLUE') || upper.includes('LOW')) return 'primary';
      if (upper.includes('SELL') || upper.includes('RED') || upper.includes('HIGH')) return 'danger';
      return 'info';
    };

    fetchHistory();
    
    // Connect to WebSocket for real-time updates
    const socket = getWebSocketClient();
    if (socket.getState() === 'CLOSED') {
      socket.connect();
    }

    const unsubscribeSettled = socket.on('roundSettled', () => {
      console.log('Round settled, refreshing history');
      fetchHistory();
    });

    const unsubscribeOpened = socket.on('roundOpened', () => {
      console.log('New round opened, refreshing history');
      fetchHistory();
    });
    
    const unsubscribeInstanceSettled = socket.on('marketInstanceSettled', () => {
      // Refresh on any settlement since we show master round data
      console.log('Market instance settled, refreshing history');
      fetchHistory();
    });

    return () => {
      unsubscribeSettled();
      unsubscribeOpened();
      unsubscribeInstanceSettled();
    };
  }, [timePeriod]);

  // Use real history if available, else show loading or fallback to default
  const displayHistory = realHistory.length > 0 ? realHistory : (isLoading ? [] : DEFAULT_HISTORY);

  // Use real chart data or fallback to static display
  const displayChartData = chartData.length > 0 ? chartData : DEFAULT_KEYS.map((key) => {
    const found = data.find(
      (d) => d.name?.toLowerCase() === key.toLowerCase()
    );

    const selection = key.toUpperCase().replace(' ', '_');
    return {
      label: key,
      selection: selection,
      percentage: found ? Math.max(found.value, 2) : 0,
      count: 0,
      fill: SELECTION_COLORS[selection] || '#3b82f6'
    };
  });

  return (
    <div className={`histogram-box ${showChartOnly ? 'chart-only' : ''} ${showHistoryOnly ? 'history-only' : ''}`}>
      {!showHistoryOnly && (
        <>
          <h3>{title}</h3>
          {/* ================= CHART ================= */}
          <ResponsiveContainer width="100%" height={showChartOnly ? 140 : 200}>
            <BarChart
              data={displayChartData}
              barSize={showChartOnly ? 14 : 20}
              margin={{ top: 10, right: 10, left: -10, bottom: showChartOnly ? 40 : 50 }}
            >
              <CartesianGrid
                stroke="rgba(59,130,246,0.15)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis 
                dataKey="label" 
                stroke="#9ccfff" 
                tick={{ fontSize: showChartOnly ? 9 : 11, fill: '#a5d5ff' }}
                angle={-45}
                textAnchor="end"
                height={showChartOnly ? 50 : 60}
                interval={0}
              />
              <YAxis 
                stroke="#9ccfff" 
                tick={{ fontSize: showChartOnly ? 9 : 11, fill: '#a5d5ff' }} 
                width={showChartOnly ? 30 : 35}
                domain={[0, 'auto']}
                tickFormatter={(value) => `${value}%`}
              />
              <ReferenceLine y={0} stroke="rgba(59,130,246,0.4)" />

              <Tooltip content={<CustomChartTooltip />} />

              <Bar
                dataKey="percentage"
                radius={[4, 4, 0, 0]}
                animationDuration={900}
              >
                {displayChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* ================= HISTORY TABLE ================= */}
      {!showChartOnly && (
        <div className="history-wrapper">
          <div className="history-header-row">
            {showHistoryOnly && <h3>{title}</h3>}
            
            {/* Time filter */}
            <div className="time-filter">
              <select 
                value={timePeriod} 
                onChange={(e) => setTimePeriod(e.target.value)}
                className="period-select"
              >
                {TIME_PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="table-scroll-container">
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
                {isLoading ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.6)' }}>
                      Loading live data...
                    </td>
                  </tr>
                ) : displayHistory.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.6)' }}>
                      No trading history available
                    </td>
                  </tr>
                ) : (
                  displayHistory.map((row, index) => (
                    <tr key={index} className={row.date === "Current" ? "current-round" : ""}>
                      <td className="date">{row.date}</td>

                      <td>
                        <span className={`badge ${row.previousType}`}>
                          {row.previous}
                        </span>
                      </td>

                      <td>
                        <span className="badge info">
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
      )}
    </div>
  );
}
