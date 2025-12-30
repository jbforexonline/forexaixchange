"use client";

import React from 'react';
import { BarChart3, PieChart, TrendingUp, Target } from 'lucide-react';

export default function StatisticsPage() {
  return (
    <div className="coming-soon-page">
        <div className="coming-soon-container">
          <div className="coming-soon-icon">
            <BarChart3 size={80} strokeWidth={1.5} />
          </div>
          
          <h1 className="coming-soon-title">Statistics</h1>
          <p className="coming-soon-subtitle">Coming Soon</p>
          
          <div className="coming-soon-description">
            <p>Detailed analytics and insights about your trading performance.</p>
          </div>
          
          <div className="coming-soon-features">
            <div className="feature-item">
              <PieChart size={24} />
              <span>Win rate breakdown by market</span>
            </div>
            <div className="feature-item">
              <TrendingUp size={24} />
              <span>Profit/Loss over time</span>
            </div>
            <div className="feature-item">
              <Target size={24} />
              <span>Best performing strategies</span>
            </div>
          </div>
          
          <div className="coming-soon-badge">
            <span className="pulse-dot"></span>
            In Development
          </div>
        </div>
        
        <style jsx>{`
          .coming-soon-page {
            min-height: calc(100vh - 80px);
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0a1628 0%, #0f2744 50%, #0a1628 100%);
            padding: 2rem;
          }
          
          .coming-soon-container {
            text-align: center;
            max-width: 500px;
          }
          
          .coming-soon-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 140px;
            height: 140px;
            background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%);
            border: 2px solid rgba(251, 191, 36, 0.3);
            border-radius: 50%;
            margin-bottom: 2rem;
            color: #fbbf24;
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .coming-soon-title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 0.5rem 0;
            letter-spacing: -0.5px;
          }
          
          .coming-soon-subtitle {
            font-size: 1.25rem;
            color: #fbbf24;
            font-weight: 600;
            margin: 0 0 1.5rem 0;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          
          .coming-soon-description {
            color: rgba(165, 213, 255, 0.7);
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          
          .coming-soon-features {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2rem;
          }
          
          .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: rgba(251, 191, 36, 0.08);
            border: 1px solid rgba(251, 191, 36, 0.15);
            border-radius: 10px;
            color: rgba(165, 213, 255, 0.9);
            font-size: 0.95rem;
          }
          
          .feature-item svg {
            color: #fbbf24;
            flex-shrink: 0;
          }
          
          .coming-soon-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 20px;
            color: #22c55e;
            font-size: 0.85rem;
            font-weight: 600;
          }
          
          .pulse-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
          }
        `}</style>
      </div>
  );
}

