"use client";
import React, { useState, useEffect } from "react";
import "../Styles/SpinPage.scss";

export default function SpinPage() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);

  const handleSpin = () => {
    setIsSpinning(true);
    setSpinResult(null);
    
    // Simulate spin duration
    setTimeout(() => {
      setIsSpinning(false);
      const results = [
        { type: "Bonus", amount: 500, color: "#00ff88" },
        { type: "Jackpot", amount: 2000, color: "#ff6b6b" },
        { type: "Multiplier", amount: 100, color: "#4ecdc4" },
        { type: "Energy", amount: 50, color: "#45b7d1" },
        { type: "Coins", amount: 300, color: "#f9ca24" }
      ];
      const randomResult = results[Math.floor(Math.random() * results.length)];
      setSpinResult(randomResult);
    }, 3000);
  };

  return (
    <div className="neural-interface">
      <div className="interface-container">
        {/* Top Left - Vertical Bar Chart */}
        <div className="chart-panel top-left">
          <div className="vertical-bars">
            <div className="bar bar-1" style={{ height: '60%' }}></div>
            <div className="bar bar-2" style={{ height: '40%' }}></div>
            <div className="bar bar-3" style={{ height: '80%' }}></div>
            <div className="bar bar-4" style={{ height: '30%' }}></div>
            <div className="bar bar-5" style={{ height: '70%' }}></div>
          </div>
          <div className="scale-labels">
            <span>-100</span>
            <span>-200</span>
            <span>-300</span>
            <span>-400</span>
            <span>-500</span>
          </div>
          <div className="horizontal-bars">
            <div className="h-bar h-bar-1"></div>
            <div className="h-bar h-bar-2"></div>
            <div className="h-bar h-bar-3"></div>
            <div className="h-bar h-bar-4"></div>
          </div>
        </div>

        {/* Bottom Left - Line Graph */}
        <div className="chart-panel bottom-left">
          <div className="line-graph">
            <svg className="graph-svg" viewBox="0 0 200 100">
              <polyline
                points="10,80 30,60 50,40 70,20 90,30 110,25 130,15 150,10 170,5 190,8"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                className="graph-line"
              />
              <circle cx="10" cy="80" r="2" fill="#ffffff" className="data-point" />
              <circle cx="30" cy="60" r="2" fill="#ffffff" className="data-point" />
              <circle cx="50" cy="40" r="2" fill="#ffffff" className="data-point" />
              <circle cx="70" cy="20" r="2" fill="#ffffff" className="data-point" />
              <circle cx="90" cy="30" r="2" fill="#ffffff" className="data-point" />
              <circle cx="110" cy="25" r="2" fill="#ffffff" className="data-point" />
              <circle cx="130" cy="15" r="2" fill="#ffffff" className="data-point" />
              <circle cx="150" cy="10" r="2" fill="#ffffff" className="data-point" />
              <circle cx="170" cy="5" r="2" fill="#ffffff" className="data-point" />
              <circle cx="190" cy="8" r="2" fill="#ffffff" className="data-point" />
            </svg>
          </div>
        </div>

        {/* Top Right - Vertical Bar Chart */}
        <div className="chart-panel top-right">
          <div className="vertical-bars">
            <div className="bar bar-1" style={{ height: '45%' }}></div>
            <div className="bar bar-2" style={{ height: '65%' }}></div>
            <div className="bar bar-3" style={{ height: '35%' }}></div>
            <div className="bar bar-4" style={{ height: '55%' }}></div>
            <div className="bar bar-5" style={{ height: '75%' }}></div>
          </div>
        </div>

        {/* Bottom Right - Dual Line Graph */}
        <div className="chart-panel bottom-right">
          <div className="dual-line-graph">
            <svg className="graph-svg" viewBox="0 0 200 100">
              {/* First Line - Solid Blue */}
              <polyline
                points="10,70 30,50 50,60 70,40 90,30 110,45 130,35 150,25 170,20 190,15"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                className="graph-line-1"
              />
              {/* Second Line - Dashed White */}
              <polyline
                points="10,50 30,40 50,30 70,50 90,60 110,40 130,50 150,60 170,55 190,50"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="5,5"
                className="graph-line-2"
              />
              {/* Data Points */}
              <circle cx="10" cy="70" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="30" cy="50" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="50" cy="60" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="70" cy="40" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="90" cy="30" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="110" cy="45" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="130" cy="35" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="150" cy="25" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="170" cy="20" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="190" cy="15" r="1.5" fill="#3b82f6" className="data-point" />
              
              <circle cx="10" cy="50" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="30" cy="40" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="50" cy="30" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="70" cy="50" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="90" cy="60" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="110" cy="40" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="130" cy="50" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="150" cy="60" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="170" cy="55" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="190" cy="50" r="1.5" fill="#ffffff" className="data-point" />
            </svg>
          </div>
          <div className="waveform">
            <div className="wave-bar wave-1"></div>
            <div className="wave-bar wave-2"></div>
            <div className="wave-bar wave-3"></div>
            <div className="wave-bar wave-4"></div>
            <div className="wave-bar wave-5"></div>
            <div className="wave-bar wave-6"></div>
            <div className="wave-bar wave-7"></div>
            <div className="wave-bar wave-8"></div>
          </div>
        </div>

        {/* Central Brain Interface */}
        <div className="central-brain">
          <div className="brain-container">
            {/* Outer Circular UI */}
            <div className="circular-ui">
              <div className="ui-ring ring-1"></div>
              <div className="ui-ring ring-2"></div>
              <div className="ui-ring ring-3"></div>
              <div className="ui-arc arc-1"></div>
              <div className="ui-arc arc-2"></div>
              <div className="ui-arc arc-3"></div>
              <div className="ui-marker marker-1"></div>
              <div className="ui-marker marker-2"></div>
              <div className="ui-marker marker-3"></div>
              <div className="ui-marker marker-4"></div>
            </div>

            {/* Central Brain */}
            <div className={`brain-core ${isSpinning ? 'spinning' : ''}`}>
              <div className="neural-network">
                <div className="neural-line line-1"></div>
                <div className="neural-line line-2"></div>
                <div className="neural-line line-3"></div>
                <div className="neural-line line-4"></div>
                <div className="neural-line line-5"></div>
                <div className="neural-line line-6"></div>
                <div className="neural-node node-1"></div>
                <div className="neural-node node-2"></div>
                <div className="neural-node node-3"></div>
                <div className="neural-node node-4"></div>
                <div className="neural-node node-5"></div>
                <div className="neural-node node-6"></div>
                <div className="neural-node node-7"></div>
                <div className="neural-node node-8"></div>
              </div>
              <div className="brain-center-glow"></div>
            </div>

            {/* Spin Button */}
            <button 
              className={`spin-button ${isSpinning ? 'active' : ''}`}
              onClick={handleSpin}
              disabled={isSpinning}
            >
              {isSpinning ? 'SPINNING...' : 'SPIN'}
            </button>
          </div>
        </div>

        {/* Result Display */}
        {spinResult && (
          <div className="result-overlay">
            <div className="result-popup">
              <h2 style={{ color: spinResult.color }}>{spinResult.type}</h2>
              <p>+{spinResult.amount}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
