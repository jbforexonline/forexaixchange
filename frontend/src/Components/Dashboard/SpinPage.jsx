"use client";
import React, { useState, useEffect, useMemo } from "react";
import "../Styles/SpinPage.scss";
import SpinWheel from "../Spin/SpinWheel";

export default function SpinPage() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [countdownSec, setCountdownSec] = useState(0);
  const [showOverlays, setShowOverlays] = useState(true);

  const handleSpin = () => {
    // Start spin with a 3s countdown
    setIsSpinning(true);
    setSpinResult(null);
    setCountdownSec(3);
  };

  // countdown effect for spin
  useEffect(() => {
    if (!isSpinning) return;
    if (countdownSec <= 0) return;

    const t = setInterval(() => {
      setCountdownSec((s) => {
        if (s <= 1) {
          clearInterval(t);
          // finish spin
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
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [isSpinning, countdownSec]);

  // derive wheel state for SpinWheel component
  const wheelState = useMemo(() => {
    if (isSpinning) return 'open';
    if (spinResult) return 'settled';
    return 'preopen';
  }, [isSpinning, spinResult]);

  // map spinResult to winners flags for the wheel
  const winners = useMemo(() => {
    if (!spinResult) return undefined;
    switch (spinResult.type) {
      case 'Jackpot':
        return { outer: 'BUY', color: 'RED', vol: 'HIGH' };
      case 'Bonus':
        return { outer: 'SELL', color: 'BLUE', vol: 'LOW' };
      case 'Multiplier':
        return { outer: 'BUY', color: 'BLUE', vol: 'HIGH' };
      case 'Energy':
        return { outer: 'SELL', color: 'RED', vol: 'LOW' };
      case 'Coins':
        return { outer: 'BUY', color: 'BLUE', vol: 'LOW' };
      default:
        return { outer: 'BUY', color: 'BLUE', vol: 'HIGH' };
    }
  }, [spinResult]);

  return (
    <div className="neural-interface">
      <div className="interface-container">
        {/* Header */}
        <header className="spin-header">
          <h2>RESULTS</h2>
          <div className="header-controls">
            <button
              className="overlay-toggle"
              onClick={() => setShowOverlays((s) => !s)}
              title="Toggle decorative overlays"
            >
              {showOverlays ? 'Hide Overlays' : 'Show Overlays'}
            </button>
          </div>
        </header>
        {/* Top Left - Vertical Bar Chart */}
        <div className="chart-panel top-left">
          {/* <div className="vertical-bars">
            <div className="bar bar-1" style={{ height: '60%' }}></div>
            <div className="bar bar-2" style={{ height: '40%' }}></div>
            <div className="bar bar-3" style={{ height: '80%' }}></div>
            <div className="bar bar-4" style={{ height: '30%' }}></div>
            <div className="bar bar-5" style={{ height: '70%' }}></div>
          </div> */}
          {/* <div className="scale-labels">
            <span>-100</span>
            <span>-200</span>
            <span>-300</span>
            <span>-400</span>
            <span>-500</span>
          </div> */}
          {/* <div className="horizontal-bars">
            <div className="h-bar h-bar-1"></div>
            <div className="h-bar h-bar-2"></div>
            <div className="h-bar h-bar-3"></div>
            <div className="h-bar h-bar-4"></div>
          </div> */}
        </div>

        {/* Bottom Left - Line Graph */}
        {/* <div className="chart-panel bottom-left">
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
        </div> */}

        {/* Top Right - Vertical Bar Chart */}
        {/* <div className="chart-panel top-right">
          <div className="vertical-bars">
            <div className="bar bar-1" style={{ height: '45%' }}></div>
            <div className="bar bar-2" style={{ height: '65%' }}></div>
            <div className="bar bar-3" style={{ height: '35%' }}></div>
            <div className="bar bar-4" style={{ height: '55%' }}></div>
            <div className="bar bar-5" style={{ height: '75%' }}></div>
          </div>
        </div> */}

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

        {/* Central Brain Interface - replaced with SpinWheel SVG while keeping surrounding layout */}
        <div className="central-brain left-column">
          <div className="brain-container">
            {/* Inserted Spin Wheel SVG (keeps the original design feel) */}
            <div className={`spinwheel-wrapper ${isSpinning ? 'spinning' : ''} ${showOverlays ? '' : 'hide-overlays'}`}>
              {/* background image (place your uploaded image at /public/image/ai-brain.png) */}
              <img
                src="/image/ai-brain.png"
                alt="neural graphic"
                className="spin-bg"
                aria-hidden="true"
                style={{ pointerEvents: 'none' }}
              />
              <SpinWheel state={wheelState} countdownSec={countdownSec} winners={winners} />
            </div>

            {/* Keep the original spin button below the wheel */}
            <button 
              className={`spin-button ${isSpinning ? 'active' : ''}`}
              onClick={handleSpin}
              disabled={isSpinning}
            >
              {isSpinning ? 'SPINNING...' : 'SPIN'}
            </button>
          </div>
        </div>

        {/* Right column - Winners panel and fireworks */}
        {/* <aside className="right-column">
          <div className="indecision-banner">Indecision wins<br/><span className="sub">(Middle tie)</span></div>

          <div className="fireworks">
            <div className="firework fw-1"></div>
            <div className="firework fw-2"></div>
          </div>

        
        </aside> */}
      </div>
    </div>
  );
}
