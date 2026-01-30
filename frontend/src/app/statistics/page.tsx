"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Activity,
  Clock,
  RefreshCw,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import {
  getMarketDistribution,
  getLiveMarketDistribution,
  getRoundStats,
  type MarketDistribution,
  type TimeFilter
} from '@/lib/api/spin';
import { getWebSocketClient } from '@/lib/websocket';

// Color mapping for each selection
const SELECTION_COLORS: Record<string, string> = {
  BUY: '#22c55e',      // Green
  SELL: '#ef4444',     // Red
  BLUE: '#3b82f6',     // Blue
  RED: '#f97316',      // Orange
  HIGH_VOL: '#8b5cf6', // Purple
  LOW_VOL: '#06b6d4',  // Cyan
  INDECISION: '#fbbf24' // Yellow
};

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, subtitle, color = '#64c8ff' }) => (
  <div className="stats-card">
    <div className="stats-card-icon" style={{ color }}>
      {icon}
    </div>
    <div className="stats-card-content">
      <span className="stats-card-label">{label}</span>
      <span className="stats-card-value">{value}</span>
      {subtitle && <span className="stats-card-subtitle">{subtitle}</span>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{data.label}</p>
        <p className="tooltip-value">
          <span style={{ color: SELECTION_COLORS[data.selection] }}>
            {data.percentage.toFixed(1)}%
          </span>
        </p>
        <p className="tooltip-count">{data.count} orders</p>
        {data.amount !== undefined && (
          <p className="tooltip-amount">${data.amount.toLocaleString()}</p>
        )}
      </div>
    );
  }
  return null;
};

export default function StatisticsPage() {
  const [liveData, setLiveData] = useState<{
    roundId: string | null;
    roundNumber: number | null;
    distribution: MarketDistribution[];
    totalBets: number;
    totalParticipants: number;
    totalVolume: number;
  } | null>(null);
  
  const [historicalData, setHistoricalData] = useState<{
    distribution: MarketDistribution[];
    totalBets: number;
    totalParticipants: number;
    timeFilter: string;
    fromDate: string | null;
    toDate: string;
  } | null>(null);
  
  const [roundStats, setRoundStats] = useState<{
    totalRounds: number;
    averageVolume: number;
    totalBets: number;
  } | null>(null);

  const [timeFilter, setTimeFilter] = useState<TimeFilter | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'live' | 'historical'>('live');

  const fetchLiveData = useCallback(async () => {
    try {
      const data = await getLiveMarketDistribution();
      setLiveData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching live distribution:', error);
    }
  }, []);

  const fetchHistoricalData = useCallback(async () => {
    try {
      const data = await getMarketDistribution(timeFilter);
      setHistoricalData(data);
    } catch (error) {
      console.error('Error fetching historical distribution:', error);
    }
  }, [timeFilter]);

  const fetchRoundStats = useCallback(async () => {
    try {
      const stats = await getRoundStats();
      setRoundStats(stats);
    } catch (error) {
      console.error('Error fetching round stats:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLiveData(), fetchHistoricalData(), fetchRoundStats()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchLiveData, fetchHistoricalData, fetchRoundStats]);

  // Refetch historical data when filter changes
  useEffect(() => {
    fetchHistoricalData();
  }, [timeFilter, fetchHistoricalData]);

  // WebSocket subscription for live updates
  useEffect(() => {
    const ws = getWebSocketClient();
    
    const handleBetPlaced = () => {
      fetchLiveData();
    };

    const handleTotalsUpdated = () => {
      fetchLiveData();
    };

    const handleRoundSettled = () => {
      fetchLiveData();
      fetchHistoricalData();
      fetchRoundStats();
    };

    ws.on('betPlaced', handleBetPlaced);
    ws.on('totalsUpdated', handleTotalsUpdated);
    ws.on('roundSettled', handleRoundSettled);

    return () => {
      ws.off('betPlaced', handleBetPlaced);
      ws.off('totalsUpdated', handleTotalsUpdated);
      ws.off('roundSettled', handleRoundSettled);
    };
  }, [fetchLiveData, fetchHistoricalData, fetchRoundStats]);

  // Auto-refresh live data every 10 seconds
  useEffect(() => {
    if (activeTab === 'live') {
      const interval = setInterval(fetchLiveData, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchLiveData]);

  const currentData = activeTab === 'live' ? liveData?.distribution : historicalData?.distribution;
  const chartData = currentData?.map(item => ({
    ...item,
    fill: SELECTION_COLORS[item.selection]
  })) || [];

  const timeFilterOptions: { value: TimeFilter | undefined; label: string }[] = [
    { value: undefined, label: 'All Time' },
    { value: 'hourly', label: 'Last Hour' },
    { value: 'daily', label: 'Last 24h' },
    { value: 'monthly', label: 'Last 30 Days' },
    { value: 'quarterly', label: 'Last 90 Days' },
    { value: 'yearly', label: 'Last Year' },
  ];

  return (
    <div className="statistics-page">
      <div className="statistics-container">
        {/* Header */}
        <div className="statistics-header">
          <div className="header-left">
            <BarChart3 size={32} className="header-icon" />
            <div>
              <h1>Market Statistics</h1>
              <p>Real-time insights into market activity</p>
            </div>
          </div>
          <div className="header-right">
            <button className="refresh-btn" onClick={() => activeTab === 'live' ? fetchLiveData() : fetchHistoricalData()}>
              <RefreshCw size={18} />
              Refresh
            </button>
            <span className="last-updated">
              <Clock size={14} />
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <StatsCard 
            icon={<Activity size={24} />}
            label="Total Orders"
            value={roundStats?.totalBets?.toLocaleString() || '0'}
            subtitle="All time"
            color="#22c55e"
          />
          <StatsCard 
            icon={<PieChart size={24} />}
            label="Total Rounds"
            value={roundStats?.totalRounds?.toLocaleString() || '0'}
            subtitle="Completed"
            color="#3b82f6"
          />
          <StatsCard 
            icon={<TrendingUp size={24} />}
            label="Avg Volume"
            value={`$${(roundStats?.averageVolume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subtitle="Per round"
            color="#fbbf24"
          />
          <StatsCard 
            icon={<Users size={24} />}
            label="Participants"
            value={activeTab === 'live' ? (liveData?.totalParticipants || 0) : (historicalData?.totalParticipants || 0)}
            subtitle={activeTab === 'live' ? 'Current round' : timeFilter || 'All time'}
            color="#8b5cf6"
          />
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Activity size={18} />
            Live Distribution
            {liveData?.roundNumber && (
              <span className="round-badge">Round #{liveData.roundNumber}</span>
            )}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'historical' ? 'active' : ''}`}
            onClick={() => setActiveTab('historical')}
          >
            <Clock size={18} />
            Historical Data
          </button>
        </div>

        {/* Time Filter (only for historical) */}
        {activeTab === 'historical' && (
          <div className="time-filter-section">
            <div className="filter-label">
              <Filter size={16} />
              Filter by Time Period:
            </div>
            <div className="filter-buttons">
              {timeFilterOptions.map(option => (
                <button
                  key={option.label}
                  className={`filter-btn ${timeFilter === option.value ? 'active' : ''}`}
                  onClick={() => setTimeFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Chart Section */}
        <div className="chart-section">
          <div className="chart-header">
            <h2>Market Distribution</h2>
            <p>
              {activeTab === 'live' 
                ? 'Live percentage of orders placed in each market' 
                : `Order distribution ${timeFilter ? `for the ${timeFilter === 'hourly' ? 'last hour' : timeFilter === 'daily' ? 'last 24 hours' : timeFilter === 'monthly' ? 'last 30 days' : timeFilter === 'quarterly' ? 'last 90 days' : 'last year'}` : 'of all time'}`
              }
            </p>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <RefreshCw size={40} className="spinning" />
              <p>Loading statistics...</p>
            </div>
          ) : chartData.length === 0 || chartData.every(d => d.count === 0) ? (
            <div className="empty-state">
              <BarChart3 size={60} />
              <h3>No Data Available</h3>
              <p>
                {activeTab === 'live' 
                  ? 'No orders have been placed in the current round yet.' 
                  : 'No orders found for the selected time period.'}
              </p>
            </div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#a5d5ff', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(100, 200, 255, 0.2)' }}
                    tickLine={{ stroke: 'rgba(100, 200, 255, 0.2)' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: '#a5d5ff', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(100, 200, 255, 0.2)' }}
                    tickLine={{ stroke: 'rgba(100, 200, 255, 0.2)' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="percentage" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={80}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribution Details */}
          {chartData.length > 0 && !chartData.every(d => d.count === 0) && (
            <div className="distribution-details">
              <div className="details-grid">
                {chartData.map(item => (
                  <div key={item.selection} className="detail-item">
                    <div className="detail-color" style={{ backgroundColor: SELECTION_COLORS[item.selection] }} />
                    <div className="detail-info">
                      <span className="detail-label">{item.label}</span>
                      <span className="detail-value">{item.percentage.toFixed(1)}%</span>
                      <span className="detail-count">{item.count} orders</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="total-summary">
                <span>Total Orders: <strong>{activeTab === 'live' ? liveData?.totalBets : historicalData?.totalBets}</strong></span>
                {activeTab === 'live' && liveData?.totalVolume !== undefined && (
                  <span>Total Volume: <strong>${liveData.totalVolume.toLocaleString()}</strong></span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .statistics-page {
          min-height: calc(100vh - 80px);
          background: linear-gradient(135deg, #0a1628 0%, #0f2744 50%, #0a1628 100%);
          padding: 2rem;
        }

        .statistics-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .statistics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          color: #fbbf24;
        }

        .header-left h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .header-left p {
          color: rgba(165, 213, 255, 0.7);
          margin: 0.25rem 0 0 0;
          font-size: 0.9rem;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 8px;
          color: #64c8ff;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: rgba(100, 200, 255, 0.2);
        }

        .last-updated {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(165, 213, 255, 0.6);
          font-size: 0.8rem;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stats-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(15, 39, 68, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .stats-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: rgba(100, 200, 255, 0.1);
          border-radius: 10px;
        }

        .stats-card-content {
          display: flex;
          flex-direction: column;
        }

        .stats-card-label {
          color: rgba(165, 213, 255, 0.7);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stats-card-value {
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .stats-card-subtitle {
          color: rgba(165, 213, 255, 0.5);
          font-size: 0.75rem;
        }

        .tab-switcher {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: rgba(15, 39, 68, 0.4);
          padding: 0.5rem;
          border-radius: 10px;
          width: fit-content;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(165, 213, 255, 0.7);
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: rgba(100, 200, 255, 0.1);
        }

        .tab-btn.active {
          background: rgba(100, 200, 255, 0.2);
          color: #64c8ff;
        }

        .round-badge {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .time-filter-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(15, 39, 68, 0.4);
          border-radius: 10px;
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(165, 213, 255, 0.8);
          font-size: 0.9rem;
        }

        .filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .filter-btn {
          padding: 0.5rem 1rem;
          background: rgba(100, 200, 255, 0.05);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: rgba(165, 213, 255, 0.7);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: rgba(100, 200, 255, 0.1);
          border-color: rgba(100, 200, 255, 0.3);
        }

        .filter-btn.active {
          background: rgba(100, 200, 255, 0.2);
          border-color: #64c8ff;
          color: #64c8ff;
        }

        .chart-section {
          background: rgba(15, 39, 68, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .chart-header {
          margin-bottom: 1.5rem;
        }

        .chart-header h2 {
          color: #ffffff;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .chart-header p {
          color: rgba(165, 213, 255, 0.6);
          font-size: 0.85rem;
          margin: 0;
        }

        .chart-container {
          margin-bottom: 1.5rem;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: rgba(165, 213, 255, 0.6);
          text-align: center;
        }

        .loading-state p,
        .empty-state p {
          margin: 1rem 0 0 0;
        }

        .empty-state h3 {
          color: #ffffff;
          margin: 1rem 0 0.5rem 0;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .custom-tooltip {
          background: rgba(15, 39, 68, 0.95);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }

        .tooltip-label {
          color: #ffffff;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .tooltip-value {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .tooltip-count,
        .tooltip-amount {
          color: rgba(165, 213, 255, 0.7);
          font-size: 0.85rem;
          margin: 0.25rem 0 0 0;
        }

        .distribution-details {
          border-top: 1px solid rgba(100, 200, 255, 0.15);
          padding-top: 1.5rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(100, 200, 255, 0.05);
          border-radius: 8px;
        }

        .detail-color {
          width: 12px;
          height: 40px;
          border-radius: 4px;
        }

        .detail-info {
          display: flex;
          flex-direction: column;
        }

        .detail-label {
          color: rgba(165, 213, 255, 0.8);
          font-size: 0.85rem;
        }

        .detail-value {
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .detail-count {
          color: rgba(165, 213, 255, 0.5);
          font-size: 0.75rem;
        }

        .total-summary {
          display: flex;
          justify-content: center;
          gap: 2rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
          color: rgba(165, 213, 255, 0.7);
          font-size: 0.9rem;
        }

        .total-summary strong {
          color: #64c8ff;
        }

        @media (max-width: 768px) {
          .statistics-page {
            padding: 1rem;
          }

          .statistics-header {
            flex-direction: column;
          }

          .header-left h1 {
            font-size: 1.5rem;
          }

          .stats-overview {
            grid-template-columns: 1fr 1fr;
          }

          .tab-switcher {
            width: 100%;
          }

          .tab-btn {
            flex: 1;
            justify-content: center;
          }

          .filter-buttons {
            justify-content: flex-start;
          }

          .details-grid {
            grid-template-columns: 1fr 1fr;
          }

          .total-summary {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
