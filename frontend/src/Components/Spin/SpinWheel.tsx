"use client";
import React, { useMemo, useState, useEffect } from 'react';

type WheelState = "preopen" | "open" | "frozen" | "settled";

type WinnerFlags = {
  outer?: "BUY" | "SELL";
  color?: "BLUE" | "RED";
  vol?: "HIGH" | "LOW";
  indecision?: boolean;
};

type Props = {
  state: WheelState;
  countdownSec: number;
  winners?: WinnerFlags;
  roundDurationMin?: number; // Round duration in minutes (5, 10, 15, 20)
};

const cx = 300, cy = 300;
const R = {
  core: [0, 60],
  vol: [75, 125],
  color: [140, 190],
  curr: [205, 235],
  dir: [250, 300],
};

// Currency pairs and trading instruments
const CURRENCIES = [
  "AUDUSD", "AUDJPY", "AUDCAD", "AUDCHF", "AUDNZD",
  "CADCHF", "CADJPY", "CHFJPY",
  "EURAUD", "EURCAD", "EURCHF", "EURJPY", "EURNZD", "EURUSD", "EURGBP",
  "GBPUSD", "GBPAUD", "GBPJPY", "GBPCAD", "GBPNZD", "GBPCHF",
  "NZDCAD", "NZDCHF", "NZDJPY", "NZDUSD",
  "USDCAD", "USDJPY", "USDCHF", "USDZAR",
  "XAUUSD", "Nasdaq"
];

const PI = Math.PI;
const deg2rad = (d: number) => (d - 90) * (PI / 180);

function arcPath(rInner: number, rOuter: number, startDeg: number, endDeg: number) {
  const s = deg2rad(startDeg), e = deg2rad(endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;

  const x0 = cx + rOuter * Math.cos(s), y0 = cy + rOuter * Math.sin(s);
  const x1 = cx + rOuter * Math.cos(e), y1 = cy + rOuter * Math.sin(e);
  const x2 = cx + rInner * Math.cos(e), y2 = cy + rInner * Math.sin(e);
  const x3 = cx + rInner * Math.cos(s), y3 = cy + rInner * Math.sin(s);

  return [
    `M ${x0} ${y0}`,
    `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${rInner} ${rInner} 0 ${large} ${sweep ^ 1} ${x3} ${y3}`,
    "Z"
  ].join(" ");
}

// Helper to create curved text path
function createCurvedTextPath(id: string, radius: number, startAngle: number, endAngle: number) {
  const start = deg2rad(startAngle);
  const end = deg2rad(endAngle);
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function SpinWheel({ state, countdownSec, winners, roundDurationMin = 20 }: Props) {
  const showWinners = state === "settled" && winners;
  
  // Text position state - changes every 3 seconds to create dynamic effect
  const [textRotation, setTextRotation] = useState(0);
  
  // Calculate progress percentage for visual indicator
  const totalSeconds = roundDurationMin * 60;
  const progressPercent = totalSeconds > 0 ? Math.max(0, Math.min(100, ((totalSeconds - countdownSec) / totalSeconds) * 100)) : 0;
  
  // Effect to change text positions every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTextRotation(prev => (prev + 45) % 360); // Rotate by 45 degrees every 3 seconds
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Two vertical needles: one pointing up (90°), one pointing down (270°)
  const indecisionNeedles = useMemo(() => {
    const width = 15; // Needle width in degrees
    
    // Top needle (pointing up - 90° in standard coords, which is 0° in our system)
    const topAngle = 0;
    const topA0 = topAngle - width / 2;
    const topA1 = topAngle + width / 2;
    
    // Bottom needle (pointing down - 270° in standard coords, which is 180° in our system)
    const bottomAngle = 180;
    const bottomA0 = bottomAngle - width / 2;
    const bottomA1 = bottomAngle + width / 2;
    
    // Create continuous needle from innermost to outermost ring
    return {
      top: arcPath(R.vol[0], R.dir[1], topA0, topA1),
      bottom: arcPath(R.vol[0], R.dir[1], bottomA0, bottomA1),
    };
  }, []);

  const win = {
    volLeft: winners?.vol === "LOW",
    volRight: winners?.vol === "HIGH",
    colorLeft: winners?.color === "RED",
    colorRight: winners?.color === "BLUE",
    dirLeft: winners?.outer === "SELL",
    dirRight: winners?.outer === "BUY",
    indecision: !!winners?.indecision,
  };

  return (
    <div className="wheel-container">
      <svg viewBox="0 0 600 600" className="spin-wheel-svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(100, 200, 255, 0.8)" />
            <stop offset="100%" stopColor="rgba(50, 150, 220, 0.4)" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 215, 0, 1)" />
            <stop offset="50%" stopColor="rgba(255, 200, 0, 0.95)" />
            <stop offset="100%" stopColor="rgba(218, 165, 32, 0.9)" />
          </linearGradient>

          {/* Curved text paths for labels */}
          <path id="sellPath" d={createCurvedTextPath('sell', (R.dir[0] + R.dir[1]) / 2, -170, -10)} fill="none" />
          <path id="buyPath" d={createCurvedTextPath('buy', (R.dir[0] + R.dir[1]) / 2, 10, 170)} fill="none" />
          
          <path id="redPath" d={createCurvedTextPath('red', (R.color[0] + R.color[1]) / 2, -170, -10)} fill="none" />
          <path id="bluePath" d={createCurvedTextPath('blue', (R.color[0] + R.color[1]) / 2, 10, 170)} fill="none" />
          
          <path id="lowPath" d={createCurvedTextPath('low', (R.vol[0] + R.vol[1]) / 2, -170, -10)} fill="none" />
          <path id="highPath" d={createCurvedTextPath('high', (R.vol[0] + R.vol[1]) / 2, 10, 170)} fill="none" />
        </defs>

        {/* Ring separators - Fixed, don't spin */}
        <g className="ring-separators">
          <circle cx={cx} cy={cy} r={R.dir[1]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={R.dir[0]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={R.curr[1]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={R.curr[0]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={R.color[1]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={R.color[0]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={R.vol[1]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={R.vol[0]} fill="none" stroke="rgba(100, 200, 255, 0.15)" strokeWidth={2} />
        </g>

        {/* OUTERMOST: Direction Ring (BUY/SELL) - 1st Circle: Clockwise */}
        <g className="ring-direction spin-cw">
          <path d={arcPath(R.dir[0], R.dir[1], -180, 0)} fill="url(#ringGrad)" opacity={win.dirLeft ? 1 : 0.5} />
          <path d={arcPath(R.dir[0], R.dir[1], 0, 180)} fill="url(#ringGrad)" opacity={win.dirRight ? 1 : 0.5} />
          
          {/* Curved SELL label - FIXED position */}
          <text fill="#e5f2ff" fontSize={18} fontWeight={700} letterSpacing={2}>
            <textPath href="#sellPath" startOffset="50%" textAnchor="middle">
              SELL
            </textPath>
          </text>
          
          {/* Curved BUY label - FIXED position */}
          <text fill="#e5f2ff" fontSize={18} fontWeight={700} letterSpacing={2}>
            <textPath href="#buyPath" startOffset="50%" textAnchor="middle">
              BUY
            </textPath>
          </text>
        </g>

        {/* Currency Ring - 2nd Circle: Counter-clockwise */}
        <g className="ring-currency spin-ccw">
          <path d={arcPath(R.curr[0], R.curr[1], -180, 180)} fill="rgba(100, 180, 255, 0.1)" />
          {CURRENCIES.map((ccy, i) => {
            const baseAngle = -180 + i * (360 / CURRENCIES.length);
            const dynamicAngle = baseAngle + textRotation; // Add rotation to create position changes
            const rr = (R.curr[0] + R.curr[1]) / 2;
            const x = cx + rr * Math.cos(deg2rad(dynamicAngle));
            const y = cy + rr * Math.sin(deg2rad(dynamicAngle));
            return <text key={ccy + "-" + i} x={x} y={y} fill="#a5d5ff" opacity={0.8} fontSize={9} fontWeight={600} textAnchor="middle" dominantBaseline="middle">{ccy}</text>;
          })}
        </g>

        {/* Color Ring (BLUE/RED) - 3rd Circle: Clockwise */}
        <g className="ring-color spin-cw">
          <path d={arcPath(R.color[0], R.color[1], -180, 0)} fill="url(#ringGrad)" opacity={win.colorLeft ? 1 : 0.45} />
          <path d={arcPath(R.color[0], R.color[1], 0, 180)} fill="url(#ringGrad)" opacity={win.colorRight ? 1 : 0.45} />
          
          {/* Curved RED label - FIXED position */}
          <text fill="#ef4444" fontSize={16} fontWeight={700} letterSpacing={2}>
            <textPath href="#redPath" startOffset="50%" textAnchor="middle">
              RED
            </textPath>
          </text>
          
          {/* Curved BLUE label - FIXED position */}
          <text fill="#3b82f6" fontSize={16} fontWeight={700} letterSpacing={2}>
            <textPath href="#bluePath" startOffset="50%" textAnchor="middle">
              BLUE
            </textPath>
          </text>
        </g>

        {/* Volatility Ring (LOW/HIGH) - 4th Circle: Counter-clockwise */}
        <g className="ring-volatility spin-ccw">
          <path d={arcPath(R.vol[0], R.vol[1], -180, 0)} fill="url(#ringGrad)" opacity={win.volLeft ? 1 : 0.4} />
          <path d={arcPath(R.vol[0], R.vol[1], 0, 180)} fill="url(#ringGrad)" opacity={win.volRight ? 1 : 0.4} />
          
          {/* Curved LOW VOLATILE label - FIXED position */}
          <text fill="#e5f2ff" fontSize={12} fontWeight={700} letterSpacing={1}>
            <textPath href="#lowPath" startOffset="50%" textAnchor="middle">
              LOW VOLATILE
            </textPath>
          </text>
          
          {/* Curved HIGH VOLATILE label - FIXED position */}
          <text fill="#e5f2ff" fontSize={12} fontWeight={700} letterSpacing={1}>
            <textPath href="#highPath" startOffset="50%" textAnchor="middle">
              HIGH VOLATILE
            </textPath>
          </text>
        </g>

        {/* Winner glow (on spinning rings) */}
        {showWinners && (
          <g fill="rgba(255, 255, 255, 0.2)" filter="url(#glow)">
            {win.dirLeft && <path d={arcPath(R.dir[0], R.dir[1], -180, 0)} />}
            {win.dirRight && <path d={arcPath(R.dir[0], R.dir[1], 0, 180)} />}
            {win.colorLeft && <path d={arcPath(R.color[0], R.color[1], -180, 0)} />}
            {win.colorRight && <path d={arcPath(R.color[0], R.color[1], 0, 180)} />}
            {win.volLeft && <path d={arcPath(R.vol[0], R.vol[1], -180, 0)} />}
            {win.volRight && <path d={arcPath(R.vol[1], R.vol[1], 0, 180)} />}
          </g>
        )}

        {/* FIXED GROUP - Core and Indecision Needles (DO NOT SPIN) - DRAWN LAST TO BE ON TOP */}
        <g className="fixed-center">
          {/* TWO VERTICAL INDECISION NEEDLES - FIXED, GOLDEN, ON TOP OF EVERYTHING */}
          <g opacity={win.indecision ? 1 : 0.9}>
            {/* Top needle (pointing up) - single continuous golden path */}
            <path d={indecisionNeedles.top} fill="url(#goldGrad)" filter="url(#strongGlow)" />
            
            {/* INDECISION label - VERTICAL text along top needle, perfectly centered */}
            <text
              x={cx}
              y={cy - 150}
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={18}
              fontWeight={900}
              letterSpacing={4}
              transform={`rotate(-90, ${cx}, ${cy - 150})`}
              filter="url(#strongGlow)"
            >
              INDECISION
            </text>

            {/* Bottom needle (pointing down) - single continuous golden path */}
            <path d={indecisionNeedles.bottom} fill="url(#goldGrad)" filter="url(#strongGlow)" />
            
            {/* INDECISION label - VERTICAL text along bottom needle, perfectly centered */}
            <text
              x={cx}
              y={cy + 150}
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={18}
              fontWeight={900}
              letterSpacing={4}
              transform={`rotate(-90, ${cx}, ${cy + 150})`}
              filter="url(#strongGlow)"
            >
              INDECISION
            </text>
          </g>

          {/* Core (countdown + state) - FIXED, no separator circle here */}
          <circle cx={cx} cy={cy} r={R.core[1]} fill="rgba(20, 35, 60, 0.95)" stroke="rgba(100, 200, 255, 0.3)" strokeWidth={2} filter="url(#glow)" />
          
          {/* Round Duration Label - shows the total round time */}
          <text x={cx} y={cy - 28} fill="rgba(165, 213, 255, 0.6)" textAnchor="middle" fontSize={9} fontWeight={600} letterSpacing={0.5}>
            {roundDurationMin} MIN ROUND
          </text>
          
          {/* Timer Display - Minutes:Seconds format - Always Green */}
          <text x={cx} y={cy - 8} fill="#22c55e" textAnchor="middle" fontSize={26} fontWeight={800} fontFamily="monospace">
            {state === "settled" ? "DONE" : state === "preopen" ? "--:--" : `${String(Math.floor(countdownSec / 60)).padStart(2, '0')}:${String(countdownSec % 60).padStart(2, '0')}`}
          </text>
          
          {/* Market status under timer */}
          <text x={cx} y={cy + 20} fill="rgba(165, 213, 255, 0.6)" textAnchor="middle" fontSize={9} fontWeight={500}>
            {state === "settled" ? "Round Complete" : 
             state === "frozen" ? "Market Frozen" : 
             state === "preopen" ? "Market Opening Soon" : 
             "Market AI Analysing"}
          </text>
        </g>
      </svg>
    </div>
  );
}