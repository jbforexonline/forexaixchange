"use client";
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';

type WheelState = "preopen" | "open" | "frozen" | "settled";

type WinnerFlags = {
  outer?: "BUY" | "SELL";
  color?: "BLUE" | "RED";
  vol?: "HIGH" | "LOW";
  indecision?: boolean;
};

type Selection = {
  market: 'OUTER' | 'MIDDLE' | 'INNER' | 'GLOBAL';
  selection: 'BUY' | 'SELL' | 'BLUE' | 'RED' | 'HIGH_VOL' | 'LOW_VOL' | 'INDECISION';
};

type PlacedBet = {
  market: string;
  selection: string;
  amount: number;
  timestamp: number;
};

type Props = {
  state: WheelState;
  countdownSec: number;
  winners?: WinnerFlags;
  roundDurationMin?: number;
  currentSelection?: Selection | null;
  placedBets?: PlacedBet[];
  recentBetPlaced?: { selection: string; amount: number; label?: string } | null;
  previousWinners?: WinnerFlags;
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

export default function SpinWheel({ 
  state, 
  countdownSec, 
  winners, 
  roundDurationMin = 20,
  currentSelection,
  placedBets = [],
  recentBetPlaced,
  previousWinners
}: Props) {
  const showWinners = state === "settled" && winners;
  
  // Text position state - changes every 3 seconds to create dynamic effect
  const [textRotation, setTextRotation] = useState(0);
  
  // Currency animation states - sweeping dark gap effect
  const [currencyGapPosition, setCurrencyGapPosition] = useState<number>(0);
  const [currencyDirection, setCurrencyDirection] = useState<'cw' | 'ccw'>('cw');
  
  // Selection highlight with 3-second auto-unhighlight
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Order placed highlight with 3-second auto-unhighlight
  const [orderPlacedHighlight, setOrderPlacedHighlight] = useState<{ selection: string; amount: number } | null>(null);
  
  // Previous winner highlight (40 seconds)
  const [showPreviousWinners, setShowPreviousWinners] = useState(false);
  const [previousWinnerTimer, setPreviousWinnerTimer] = useState(40);
  
  // Fireworks animation state
  const [fireworksEmojis, setFireworksEmojis] = useState<Array<{
    id: number;
    emoji: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    opacity: number;
    scale: number;
  }>>([]);
  const fireworksIdRef = useRef(0);
  
  // Effect to change text positions every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTextRotation(prev => (prev + 12) % 360);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Sweeping dark gap effect - moves clockwise then counter-clockwise
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrencyGapPosition(prev => {
        if (currencyDirection === 'cw') {
          const next = prev + 1;
          if (next >= CURRENCIES.length) {
            setCurrencyDirection('ccw');
            return CURRENCIES.length - 1;
          }
          return next;
        } else {
          const next = prev - 1;
          if (next < 0) {
            setCurrencyDirection('cw');
            return 0;
          }
          return next;
        }
      });
    }, 150); // Move gap every 150ms for smooth sweeping
    
    return () => clearInterval(interval);
  }, [currencyDirection]);
  
  // Handle selection highlight with 3-second auto-unhighlight
  useEffect(() => {
    if (currentSelection) {
      // Clear any existing timer
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      
      // Set the highlight
      setActiveHighlight(currentSelection.selection);
      
      // Auto-unhighlight after 3 seconds
      highlightTimerRef.current = setTimeout(() => {
        setActiveHighlight(null);
      }, 3000);
    }
    
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [currentSelection]);
  
  // Handle order placed highlight with 3-second auto-unhighlight
  useEffect(() => {
    if (recentBetPlaced) {
      setOrderPlacedHighlight(recentBetPlaced);
      
      const timer = setTimeout(() => {
        setOrderPlacedHighlight(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [recentBetPlaced]);
  
  // Handle previous winners highlight for 40 seconds
  useEffect(() => {
    // Show previous winners when they exist and we're not showing current round winners
    if (previousWinners && !showWinners) {
      console.log('SpinWheel: Showing previous winners:', previousWinners);
      setShowPreviousWinners(true);
      setPreviousWinnerTimer(40);
      
      const interval = setInterval(() => {
        setPreviousWinnerTimer(prev => {
          if (prev <= 1) {
            setShowPreviousWinners(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (!previousWinners) {
      setShowPreviousWinners(false);
    }
  }, [previousWinners, showWinners]);
  
  // Fireworks animation effect - spawns emojis when winners are shown
  useEffect(() => {
    if (!showPreviousWinners || !previousWinners) return;
    
    const emojis = ['🎉', '🎊', '✨', '🌟', '💫', '🏆', '🥳', '🔥', '⭐'];
    
    // Get starting position based on winning selection
    const getWinnerPosition = () => {
      const positions: Array<{x: number, y: number}> = [];
      if (previousWinners.outer === 'SELL') positions.push({ x: cx - 180, y: cy });
      if (previousWinners.outer === 'BUY') positions.push({ x: cx + 180, y: cy });
      if (previousWinners.color === 'RED') positions.push({ x: cx - 140, y: cy });
      if (previousWinners.color === 'BLUE') positions.push({ x: cx + 140, y: cy });
      if (previousWinners.vol === 'LOW') positions.push({ x: cx - 100, y: cy });
      if (previousWinners.vol === 'HIGH') positions.push({ x: cx + 100, y: cy });
      if (previousWinners.indecision) {
        positions.push({ x: cx, y: cy - 150 });
        positions.push({ x: cx, y: cy + 150 });
      }
      return positions.length > 0 ? positions[Math.floor(Math.random() * positions.length)] : { x: cx, y: cy };
    };
    
    // Spawn fireworks periodically
    const spawnInterval = setInterval(() => {
      const pos = getWinnerPosition();
      const newEmojis = Array.from({ length: 3 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        return {
          id: fireworksIdRef.current++,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          x: pos.x + (Math.random() - 0.5) * 30,
          y: pos.y + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          opacity: 1,
          scale: 0.8 + Math.random() * 0.4,
        };
      });
      setFireworksEmojis(prev => [...prev.slice(-30), ...newEmojis]);
    }, 300);
    
    // Animate fireworks
    const animateInterval = setInterval(() => {
      setFireworksEmojis(prev => prev
        .map(fw => ({
          ...fw,
          x: fw.x + fw.vx,
          y: fw.y + fw.vy,
          vy: fw.vy + 0.1, // gravity
          opacity: fw.opacity - 0.02,
        }))
        .filter(fw => fw.opacity > 0)
      );
    }, 50);
    
    return () => {
      clearInterval(spawnInterval);
      clearInterval(animateInterval);
      setFireworksEmojis([]);
    };
  }, [showPreviousWinners, previousWinners]);

  // Two vertical needles
  const indecisionNeedles = useMemo(() => {
    const width = 15;
    const topAngle = 0;
    const topA0 = topAngle - width / 2;
    const topA1 = topAngle + width / 2;
    const bottomAngle = 180;
    const bottomA0 = bottomAngle - width / 2;
    const bottomA1 = bottomAngle + width / 2;
    
    return {
      top: arcPath(R.vol[0], R.dir[1], topA0, topA1),
      bottom: arcPath(R.vol[0], R.dir[1], bottomA0, bottomA1),
    };
  }, []);

  // Check if a selection is actively highlighted (within 3 seconds of selection)
  const isHighlighted = useCallback((selection: string) => {
    return activeHighlight === selection;
  }, [activeHighlight]);
  
  // Check if order was just placed on this selection
  const hasOrderPlaced = useCallback((selection: string) => {
    return orderPlacedHighlight?.selection === selection;
  }, [orderPlacedHighlight]);
  
  // Get placed order amount
  const getOrderAmount = useCallback((selection: string) => {
    if (orderPlacedHighlight?.selection === selection) {
      return orderPlacedHighlight.amount;
    }
    return 0;
  }, [orderPlacedHighlight]);

  const win = {
    volLeft: winners?.vol === "LOW",
    volRight: winners?.vol === "HIGH",
    colorLeft: winners?.color === "RED",
    colorRight: winners?.color === "BLUE",
    dirLeft: winners?.outer === "SELL",
    dirRight: winners?.outer === "BUY",
    indecision: !!winners?.indecision,
  };
  
  // Previous winners for 40-second highlight
  const prevWin = {
    volLeft: previousWinners?.vol === "LOW",
    volRight: previousWinners?.vol === "HIGH",
    colorLeft: previousWinners?.color === "RED",
    colorRight: previousWinners?.color === "BLUE",
    dirLeft: previousWinners?.outer === "SELL",
    dirRight: previousWinners?.outer === "BUY",
    indecision: !!previousWinners?.indecision,
  };
  
  // Get winner label
  const getWinnerLabel = (selection: string) => {
    const labels: Record<string, string> = {
      'BUY': 'BUY',
      'SELL': 'SELL',
      'BLUE': 'BLUE',
      'RED': 'RED',
      'HIGH_VOL': 'HIGH VOL',
      'LOW_VOL': 'LOW VOL',
      'INDECISION': 'INDECISION',
    };
    return labels[selection] || selection;
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
          <filter id="winnerGlow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="currencyGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(100, 200, 255, 0.8)" />
            <stop offset="100%" stopColor="rgba(50, 150, 220, 0.4)" />
          </linearGradient>
          
          {/* Gold gradient for indecision needles */}
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 215, 0, 1)" />
            <stop offset="50%" stopColor="rgba(255, 200, 0, 0.95)" />
            <stop offset="100%" stopColor="rgba(218, 165, 32, 0.9)" />
          </linearGradient>
          
          {/* Cyan/White blinking gradient for ALL highlights */}
          <linearGradient id="cyanHighlightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(100, 200, 255, 1)">
              <animate attributeName="stop-color" values="rgba(100, 200, 255, 1);rgba(255, 255, 255, 1);rgba(100, 200, 255, 1)" dur="0.6s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.9)">
              <animate attributeName="stop-color" values="rgba(255, 255, 255, 0.9);rgba(100, 200, 255, 1);rgba(255, 255, 255, 0.9)" dur="0.6s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="rgba(100, 200, 255, 1)">
              <animate attributeName="stop-color" values="rgba(100, 200, 255, 1);rgba(255, 255, 255, 1);rgba(100, 200, 255, 1)" dur="0.6s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          {/* Winner celebration gradient (purple/violet - royal & calm) */}
          <linearGradient id="winnerCelebrationGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(192, 132, 252, 1)">
              <animate attributeName="stop-color" values="rgba(192, 132, 252, 1);rgba(124, 58, 237, 1);rgba(216, 180, 254, 1);rgba(192, 132, 252, 1)" dur="0.8s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="rgba(167, 139, 250, 1)">
              <animate attributeName="stop-color" values="rgba(167, 139, 250, 1);rgba(192, 132, 252, 1);rgba(124, 58, 237, 1);rgba(167, 139, 250, 1)" dur="0.8s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="rgba(124, 58, 237, 1)">
              <animate attributeName="stop-color" values="rgba(124, 58, 237, 1);rgba(216, 180, 254, 1);rgba(192, 132, 252, 1);rgba(124, 58, 237, 1)" dur="0.8s" repeatCount="indefinite" />
            </stop>
          </linearGradient>

          {/* Curved text paths for labels */}
          <path id="sellPath" d={createCurvedTextPath('sell', (R.dir[0] + R.dir[1]) / 2, -170, -10)} fill="none" />
          <path id="buyPath" d={createCurvedTextPath('buy', (R.dir[0] + R.dir[1]) / 2, 10, 170)} fill="none" />
          
          <path id="redPath" d={createCurvedTextPath('red', (R.color[0] + R.color[1]) / 2, -170, -10)} fill="none" />
          <path id="bluePath" d={createCurvedTextPath('blue', (R.color[0] + R.color[1]) / 2, 10, 170)} fill="none" />
          
          <path id="lowPath" d={createCurvedTextPath('low', (R.vol[0] + R.vol[1]) / 2, -170, -10)} fill="none" />
          <path id="highPath" d={createCurvedTextPath('high', (R.vol[0] + R.vol[1]) / 2, 10, 170)} fill="none" />
          
          {/* Text paths for order confirmation messages - curved on semicircles */}
          <path id="sellConfirmPath" d={createCurvedTextPath('sellConfirm', (R.dir[0] + R.dir[1]) / 2, -130, -50)} fill="none" />
          <path id="buyConfirmPath" d={createCurvedTextPath('buyConfirm', (R.dir[0] + R.dir[1]) / 2, 50, 130)} fill="none" />
          <path id="redConfirmPath" d={createCurvedTextPath('redConfirm', (R.color[0] + R.color[1]) / 2, -130, -50)} fill="none" />
          <path id="blueConfirmPath" d={createCurvedTextPath('blueConfirm', (R.color[0] + R.color[1]) / 2, 50, 130)} fill="none" />
          <path id="lowConfirmPath" d={createCurvedTextPath('lowConfirm', (R.vol[0] + R.vol[1]) / 2, -130, -50)} fill="none" />
          <path id="highConfirmPath" d={createCurvedTextPath('highConfirm', (R.vol[0] + R.vol[1]) / 2, 50, 130)} fill="none" />
          
          {/* Winner celebration text paths */}
          <path id="sellWinPath" d={createCurvedTextPath('sellWin', (R.dir[0] + R.dir[1]) / 2, -150, -30)} fill="none" />
          <path id="buyWinPath" d={createCurvedTextPath('buyWin', (R.dir[0] + R.dir[1]) / 2, 30, 150)} fill="none" />
          <path id="redWinPath" d={createCurvedTextPath('redWin', (R.color[0] + R.color[1]) / 2, -150, -30)} fill="none" />
          <path id="blueWinPath" d={createCurvedTextPath('blueWin', (R.color[0] + R.color[1]) / 2, 30, 150)} fill="none" />
          <path id="lowWinPath" d={createCurvedTextPath('lowWin', (R.vol[0] + R.vol[1]) / 2, -150, -30)} fill="none" />
          <path id="highWinPath" d={createCurvedTextPath('highWin', (R.vol[0] + R.vol[1]) / 2, 30, 150)} fill="none" />
          
          {/* Curved confirmation badge gradient - dark with green glow */}
          <linearGradient id="confirmBadgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 40, 30, 0.95)" />
            <stop offset="50%" stopColor="rgba(0, 60, 40, 0.98)" />
            <stop offset="100%" stopColor="rgba(0, 40, 30, 0.95)" />
          </linearGradient>
          
          {/* Paths for winner celebration messages */}
          <path id="sellWinPath" d={createCurvedTextPath('sellWin', R.dir[1] + 20, -140, -40)} fill="none" />
          <path id="buyWinPath" d={createCurvedTextPath('buyWin', R.dir[1] + 20, 40, 140)} fill="none" />
          <path id="redWinPath" d={createCurvedTextPath('redWin', R.color[1] + 15, -140, -40)} fill="none" />
          <path id="blueWinPath" d={createCurvedTextPath('blueWin', R.color[1] + 15, 40, 140)} fill="none" />
          <path id="lowWinPath" d={createCurvedTextPath('lowWin', R.vol[1] + 12, -140, -40)} fill="none" />
          <path id="highWinPath" d={createCurvedTextPath('highWin', R.vol[1] + 12, 40, 140)} fill="none" />
          
          {/* Path for indecision confirmation (top arc) */}
          <path id="indecisionConfirmPath" d={createCurvedTextPath('indecConfirm', R.vol[0] - 15, -150, -30)} fill="none" />
        </defs>

        {/* Ring separators */}
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

        {/* OUTERMOST: Direction Ring (BUY/SELL) */}
        <g className="ring-direction spin-cw">
          {/* SELL - Left semicircle */}
          <path 
            d={arcPath(R.dir[0], R.dir[1], -180, 0)} 
            fill={(showPreviousWinners && prevWin.dirLeft) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('SELL') || hasOrderPlaced('SELL')) ? 'url(#cyanHighlightGrad)' : 'url(#ringGrad)'} 
            opacity={win.dirLeft || (showPreviousWinners && prevWin.dirLeft) ? 1 : (isHighlighted('SELL') || hasOrderPlaced('SELL')) ? 0.95 : 0.5}
            filter={(showPreviousWinners && prevWin.dirLeft) ? 'url(#winnerGlow)' : (isHighlighted('SELL') || hasOrderPlaced('SELL')) ? 'url(#strongGlow)' : undefined}
          />
          {/* BUY - Right semicircle */}
          <path 
            d={arcPath(R.dir[0], R.dir[1], 0, 180)} 
            fill={(showPreviousWinners && prevWin.dirRight) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('BUY') || hasOrderPlaced('BUY')) ? 'url(#cyanHighlightGrad)' : 'url(#ringGrad)'} 
            opacity={win.dirRight || (showPreviousWinners && prevWin.dirRight) ? 1 : (isHighlighted('BUY') || hasOrderPlaced('BUY')) ? 0.95 : 0.5}
            filter={(showPreviousWinners && prevWin.dirRight) ? 'url(#winnerGlow)' : (isHighlighted('BUY') || hasOrderPlaced('BUY')) ? 'url(#strongGlow)' : undefined}
          />
          
          {/* Winner celebration message - SELL */}
          {showPreviousWinners && prevWin.dirLeft && (
            <text fill="#ffffff" fontSize={14} fontWeight={900} filter="url(#winnerGlow)" className="winner-text">
              <textPath href="#sellWinPath" startOffset="50%" textAnchor="middle">
                🎊 CONGRATULATIONS SELL! 🏆
              </textPath>
            </text>
          )}
          
          {/* Winner celebration message - BUY */}
          {showPreviousWinners && prevWin.dirRight && (
            <text fill="#ffffff" fontSize={14} fontWeight={900} filter="url(#winnerGlow)" className="winner-text">
              <textPath href="#buyWinPath" startOffset="50%" textAnchor="middle">
                🎊 CONGRATULATIONS BUY! 🏆
              </textPath>
            </text>
          )}
          
          {/* Curved SELL label */}
          <text fill={(isHighlighted('SELL') || hasOrderPlaced('SELL')) ? '#ffffff' : '#e5f2ff'} fontSize={18} fontWeight={700} letterSpacing={2} filter={(isHighlighted('SELL') || hasOrderPlaced('SELL')) ? 'url(#glow)' : undefined}>
            <textPath href="#sellPath" startOffset="50%" textAnchor="middle">
              SELL
            </textPath>
          </text>
          
          {/* Curved BUY label */}
          <text fill={(isHighlighted('BUY') || hasOrderPlaced('BUY')) ? '#ffffff' : '#e5f2ff'} fontSize={18} fontWeight={700} letterSpacing={2} filter={(isHighlighted('BUY') || hasOrderPlaced('BUY')) ? 'url(#glow)' : undefined}>
            <textPath href="#buyPath" startOffset="50%" textAnchor="middle">
              BUY
            </textPath>
          </text>
          
          {/* Order confirmation - SELL (curved arc badge in semicircle) */}
          {hasOrderPlaced('SELL') && (
            <g className="order-confirm-curved">
              {/* Curved arc background */}
              <path 
                d={arcPath(R.dir[0] + 5, R.dir[1] - 5, -130, -50)} 
                fill="url(#confirmBadgeGrad)" 
                stroke="#22c55e" 
                strokeWidth={2}
                filter="url(#strongGlow)"
              />
              {/* Curved text */}
              <text fill="#22c55e" fontSize={12} fontWeight={800} letterSpacing={1}>
                <textPath href="#sellConfirmPath" startOffset="50%" textAnchor="middle">
                  ✓ ${getOrderAmount('SELL')} SELL
                </textPath>
              </text>
            </g>
          )}
          
          {/* Order confirmation - BUY (curved arc badge in semicircle) */}
          {hasOrderPlaced('BUY') && (
            <g className="order-confirm-curved">
              {/* Curved arc background */}
              <path 
                d={arcPath(R.dir[0] + 5, R.dir[1] - 5, 50, 130)} 
                fill="url(#confirmBadgeGrad)" 
                stroke="#22c55e" 
                strokeWidth={2}
                filter="url(#strongGlow)"
              />
              {/* Curved text */}
              <text fill="#22c55e" fontSize={12} fontWeight={800} letterSpacing={1}>
                <textPath href="#buyConfirmPath" startOffset="50%" textAnchor="middle">
                  ✓ ${getOrderAmount('BUY')} BUY
                </textPath>
              </text>
            </g>
          )}
        </g>

        {/* Currency Ring with creative effects */}
        <g className="ring-currency spin-ccw">
          <path d={arcPath(R.curr[0], R.curr[1], -180, 180)} fill="rgba(100, 180, 255, 0.1)" />
          {CURRENCIES.map((ccy, i) => {
            const baseAngle = -180 + i * (360 / CURRENCIES.length);
            const dynamicAngle = baseAngle + textRotation;
            const rr = (R.curr[0] + R.curr[1]) / 2;
            const x = cx + rr * Math.cos(deg2rad(dynamicAngle));
            const y = cy + rr * Math.sin(deg2rad(dynamicAngle));
            
            // Sweeping dark gap effect - most currencies lit, small gap moves back and forth
            const gapSize = 3; // Size of the dark gap
            const distanceFromGap = Math.abs(i - currencyGapPosition);
            const wrappedDistance = Math.min(
              distanceFromGap,
              CURRENCIES.length - distanceFromGap
            );
            const isInGap = wrappedDistance <= gapSize / 2;
            
            // Gradient intensity - dimmer near gap edges
            const gapIntensity = isInGap 
              ? (gapSize / 2 - wrappedDistance) / (gapSize / 2)
              : 0;
            
            // Most currencies are lit (not in gap)
            const isLit = !isInGap;
            
            return (
              <text 
                key={ccy + "-" + i} 
                x={x} 
                y={y} 
                fill={isLit ? '#00d9ff' : `rgba(165, 213, 255, ${0.3 + gapIntensity * 0.2})`}
                opacity={isLit ? 0.95 : 0.4 + gapIntensity * 0.2}
                fontSize={isLit ? 10.5 : 8 + gapIntensity} 
                fontWeight={isLit ? 700 : 500} 
                textAnchor="middle" 
                dominantBaseline="middle"
                filter={isLit ? 'url(#currencyGlow)' : undefined}
                style={{
                  transition: 'all 0.15s ease-out'
                }}
              >
                {ccy}
              </text>
            );
          })}
        </g>

        {/* Color Ring (BLUE/RED) */}
        <g className="ring-color spin-cw">
          {/* RED - Left semicircle */}
          <path 
            d={arcPath(R.color[0], R.color[1], -180, 0)} 
            fill={(showPreviousWinners && prevWin.colorLeft) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('RED') || hasOrderPlaced('RED')) ? 'url(#cyanHighlightGrad)' : 'url(#ringGrad)'} 
            opacity={win.colorLeft || (showPreviousWinners && prevWin.colorLeft) ? 1 : (isHighlighted('RED') || hasOrderPlaced('RED')) ? 0.95 : 0.45}
            filter={(showPreviousWinners && prevWin.colorLeft) ? 'url(#winnerGlow)' : (isHighlighted('RED') || hasOrderPlaced('RED')) ? 'url(#strongGlow)' : undefined}
          />
          {/* BLUE - Right semicircle */}
          <path 
            d={arcPath(R.color[0], R.color[1], 0, 180)} 
            fill={(showPreviousWinners && prevWin.colorRight) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('BLUE') || hasOrderPlaced('BLUE')) ? 'url(#cyanHighlightGrad)' : 'url(#ringGrad)'} 
            opacity={win.colorRight || (showPreviousWinners && prevWin.colorRight) ? 1 : (isHighlighted('BLUE') || hasOrderPlaced('BLUE')) ? 0.95 : 0.45}
            filter={(showPreviousWinners && prevWin.colorRight) ? 'url(#winnerGlow)' : (isHighlighted('BLUE') || hasOrderPlaced('BLUE')) ? 'url(#strongGlow)' : undefined}
          />
          
          {/* Winner celebration message - RED */}
          {showPreviousWinners && prevWin.colorLeft && (
            <text fill="#ffffff" fontSize={12} fontWeight={900} filter="url(#winnerGlow)" className="winner-text">
              <textPath href="#redWinPath" startOffset="50%" textAnchor="middle">
                🎉 CONGRATULATIONS RED! 🏆
              </textPath>
            </text>
          )}
          
          {/* Winner celebration message - BLUE */}
          {showPreviousWinners && prevWin.colorRight && (
            <text fill="#ffffff" fontSize={12} fontWeight={900} filter="url(#winnerGlow)" className="winner-text">
              <textPath href="#blueWinPath" startOffset="50%" textAnchor="middle">
                🎉 CONGRATULATIONS BLUE! 🏆
              </textPath>
            </text>
          )}
          
          {/* Curved RED label */}
          <text fill={(isHighlighted('RED') || hasOrderPlaced('RED')) ? '#ffffff' : '#ef4444'} fontSize={16} fontWeight={700} letterSpacing={2} filter={(isHighlighted('RED') || hasOrderPlaced('RED')) ? 'url(#glow)' : undefined}>
            <textPath href="#redPath" startOffset="50%" textAnchor="middle">
              RED
            </textPath>
          </text>
          
          {/* Curved BLUE label */}
          <text fill={(isHighlighted('BLUE') || hasOrderPlaced('BLUE')) ? '#ffffff' : '#3b82f6'} fontSize={16} fontWeight={700} letterSpacing={2} filter={(isHighlighted('BLUE') || hasOrderPlaced('BLUE')) ? 'url(#glow)' : undefined}>
            <textPath href="#bluePath" startOffset="50%" textAnchor="middle">
              BLUE
            </textPath>
          </text>
          
          {/* Order confirmation - RED (curved arc badge in semicircle) */}
          {hasOrderPlaced('RED') && (
            <g className="order-confirm-curved">
              {/* Curved arc background */}
              <path 
                d={arcPath(R.color[0] + 4, R.color[1] - 4, -130, -50)} 
                fill="url(#confirmBadgeGrad)" 
                stroke="#22c55e" 
                strokeWidth={2}
                filter="url(#strongGlow)"
              />
              {/* Curved text */}
              <text fill="#22c55e" fontSize={11} fontWeight={800} letterSpacing={1}>
                <textPath href="#redConfirmPath" startOffset="50%" textAnchor="middle">
                  ✓ ${getOrderAmount('RED')} RED
                </textPath>
              </text>
            </g>
          )}
          
          {/* Order confirmation - BLUE (curved arc badge in semicircle) */}
          {hasOrderPlaced('BLUE') && (
            <g className="order-confirm-curved">
              {/* Curved arc background */}
              <path 
                d={arcPath(R.color[0] + 4, R.color[1] - 4, 50, 130)} 
                fill="url(#confirmBadgeGrad)" 
                stroke="#22c55e" 
                strokeWidth={2}
                filter="url(#strongGlow)"
              />
              {/* Curved text */}
              <text fill="#22c55e" fontSize={11} fontWeight={800} letterSpacing={1}>
                <textPath href="#blueConfirmPath" startOffset="50%" textAnchor="middle">
                  ✓ ${getOrderAmount('BLUE')} BLUE
                </textPath>
              </text>
            </g>
          )}
        </g>

        {/* Volatility Ring (LOW/HIGH) */}
        <g className="ring-volatility spin-ccw">
          {/* LOW - Left semicircle */}
          <path 
            d={arcPath(R.vol[0], R.vol[1], -180, 0)} 
            fill={(showPreviousWinners && prevWin.volLeft) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('LOW_VOL') || hasOrderPlaced('LOW_VOL')) ? 'url(#cyanHighlightGrad)' : 'url(#ringGrad)'} 
            opacity={win.volLeft || (showPreviousWinners && prevWin.volLeft) ? 1 : (isHighlighted('LOW_VOL') || hasOrderPlaced('LOW_VOL')) ? 0.95 : 0.4}
            filter={(showPreviousWinners && prevWin.volLeft) ? 'url(#winnerGlow)' : (isHighlighted('LOW_VOL') || hasOrderPlaced('LOW_VOL')) ? 'url(#strongGlow)' : undefined}
          />
          {/* HIGH - Right semicircle */}
          <path 
            d={arcPath(R.vol[0], R.vol[1], 0, 180)} 
            fill={(showPreviousWinners && prevWin.volRight) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('HIGH_VOL') || hasOrderPlaced('HIGH_VOL')) ? 'url(#cyanHighlightGrad)' : 'url(#ringGrad)'} 
            opacity={win.volRight || (showPreviousWinners && prevWin.volRight) ? 1 : (isHighlighted('HIGH_VOL') || hasOrderPlaced('HIGH_VOL')) ? 0.95 : 0.4}
            filter={(showPreviousWinners && prevWin.volRight) ? 'url(#winnerGlow)' : (isHighlighted('HIGH_VOL') || hasOrderPlaced('HIGH_VOL')) ? 'url(#strongGlow)' : undefined}
          />
          
          {/* Winner celebration message - LOW */}
          {showPreviousWinners && prevWin.volLeft && (
            <text fill="#ffffff" fontSize={10} fontWeight={900} filter="url(#winnerGlow)" className="winner-text">
              <textPath href="#lowWinPath" startOffset="50%" textAnchor="middle">
                ✨ CONGRATULATIONS LOW! 🏆
              </textPath>
            </text>
          )}
          
          {/* Winner celebration message - HIGH */}
          {showPreviousWinners && prevWin.volRight && (
            <text fill="#ffffff" fontSize={10} fontWeight={900} filter="url(#winnerGlow)" className="winner-text">
              <textPath href="#highWinPath" startOffset="50%" textAnchor="middle">
                ✨ CONGRATULATIONS HIGH! 🏆
              </textPath>
            </text>
          )}
          
          {/* Curved LOW VOLATILE label */}
          <text fill={(isHighlighted('LOW_VOL') || hasOrderPlaced('LOW_VOL')) ? '#ffffff' : '#e5f2ff'} fontSize={12} fontWeight={700} letterSpacing={1} filter={(isHighlighted('LOW_VOL') || hasOrderPlaced('LOW_VOL')) ? 'url(#glow)' : undefined}>
            <textPath href="#lowPath" startOffset="50%" textAnchor="middle">
              LOW VOLATILE
            </textPath>
          </text>
          
          {/* Curved HIGH VOLATILE label */}
          <text fill={(isHighlighted('HIGH_VOL') || hasOrderPlaced('HIGH_VOL')) ? '#ffffff' : '#e5f2ff'} fontSize={12} fontWeight={700} letterSpacing={1} filter={(isHighlighted('HIGH_VOL') || hasOrderPlaced('HIGH_VOL')) ? 'url(#glow)' : undefined}>
            <textPath href="#highPath" startOffset="50%" textAnchor="middle">
              HIGH VOLATILE
            </textPath>
          </text>
          
          {/* Order confirmation - LOW (curved arc badge in semicircle) */}
          {hasOrderPlaced('LOW_VOL') && (
            <g className="order-confirm-curved">
              {/* Curved arc background */}
              <path 
                d={arcPath(R.vol[0] + 3, R.vol[1] - 3, -130, -50)} 
                fill="url(#confirmBadgeGrad)" 
                stroke="#22c55e" 
                strokeWidth={2}
                filter="url(#strongGlow)"
              />
              {/* Curved text */}
              <text fill="#22c55e" fontSize={10} fontWeight={800} letterSpacing={1}>
                <textPath href="#lowConfirmPath" startOffset="50%" textAnchor="middle">
                  ✓ ${getOrderAmount('LOW_VOL')} LOW
                </textPath>
              </text>
            </g>
          )}
          
          {/* Order confirmation - HIGH (curved arc badge in semicircle) */}
          {hasOrderPlaced('HIGH_VOL') && (
            <g className="order-confirm-curved">
              {/* Curved arc background */}
              <path 
                d={arcPath(R.vol[0] + 3, R.vol[1] - 3, 50, 130)} 
                fill="url(#confirmBadgeGrad)" 
                stroke="#22c55e" 
                strokeWidth={2}
                filter="url(#strongGlow)"
              />
              {/* Curved text */}
              <text fill="#22c55e" fontSize={10} fontWeight={800} letterSpacing={1}>
                <textPath href="#highConfirmPath" startOffset="50%" textAnchor="middle">
                  ✓ ${getOrderAmount('HIGH_VOL')} HIGH
                </textPath>
              </text>
            </g>
          )}
        </g>


        {/* Fireworks emojis animation */}
        {fireworksEmojis.map(fw => (
          <text
            key={fw.id}
            x={fw.x}
            y={fw.y}
            fontSize={24 * fw.scale}
            opacity={fw.opacity}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: 'none' }}
          >
            {fw.emoji}
          </text>
        ))}

        {/* Current round winner glow */}
        {showWinners && (
          <g fill="rgba(255, 255, 255, 0.3)" filter="url(#winnerGlow)" className="current-winners">
            {win.dirLeft && <path d={arcPath(R.dir[0], R.dir[1], -180, 0)} />}
            {win.dirRight && <path d={arcPath(R.dir[0], R.dir[1], 0, 180)} />}
            {win.colorLeft && <path d={arcPath(R.color[0], R.color[1], -180, 0)} />}
            {win.colorRight && <path d={arcPath(R.color[0], R.color[1], 0, 180)} />}
            {win.volLeft && <path d={arcPath(R.vol[0], R.vol[1], -180, 0)} />}
            {win.volRight && <path d={arcPath(R.vol[0], R.vol[1], 0, 180)} />}
          </g>
        )}

        {/* FIXED GROUP - Core and Indecision Needles */}
        <g className="fixed-center">
          {/* TWO VERTICAL INDECISION NEEDLES */}
          <g opacity={win.indecision || (showPreviousWinners && prevWin.indecision) ? 1 : (isHighlighted('INDECISION') || hasOrderPlaced('INDECISION')) ? 1 : 0.9}>
            {/* Top needle */}
            <path 
              d={indecisionNeedles.top} 
              fill={(showPreviousWinners && prevWin.indecision) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('INDECISION') || hasOrderPlaced('INDECISION')) ? 'url(#cyanHighlightGrad)' : 'url(#goldGrad)'} 
              filter={(showPreviousWinners && prevWin.indecision) ? 'url(#winnerGlow)' : 'url(#strongGlow)'} 
            />
            
            {/* INDECISION label - top */}
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
              {showPreviousWinners && prevWin.indecision ? '🎊 WINNER!' : 'INDECISION'}
            </text>

            {/* Bottom needle */}
            <path 
              d={indecisionNeedles.bottom} 
              fill={(showPreviousWinners && prevWin.indecision) ? 'url(#winnerCelebrationGrad)' : (isHighlighted('INDECISION') || hasOrderPlaced('INDECISION')) ? 'url(#cyanHighlightGrad)' : 'url(#goldGrad)'} 
              filter={(showPreviousWinners && prevWin.indecision) ? 'url(#winnerGlow)' : 'url(#strongGlow)'} 
            />
            
            {/* INDECISION label - bottom */}
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
              {showPreviousWinners && prevWin.indecision ? '🏆 WINNER!' : 'INDECISION'}
            </text>
            
            {/* Indecision winner celebration message */}
            {showPreviousWinners && prevWin.indecision && (
              <text
                x={cx}
                y={cy - 230}
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={16}
                fontWeight={900}
                filter="url(#winnerGlow)"
              >
                🎉 CONGRATULATIONS INDECISION! 🏆
              </text>
            )}
            
            {/* Order placed message for indecision - wedge shape on BOTH needles */}
            {hasOrderPlaced('INDECISION') && (() => {
              // Create smaller wedges inside both needles for consistency
              const confirmWidth = 12; // Slightly narrower than the needle (15)
              // Position in the middle section of the needle
              const innerR = (R.vol[0] + R.color[1]) / 2; // Start from middle
              const outerR = (R.color[0] + R.curr[1]) / 2 + 10; // End before outer
              
              // Top needle angles (centered at 0 degrees)
              const topA0 = 0 - confirmWidth / 2;
              const topA1 = 0 + confirmWidth / 2;
              
              // Bottom needle angles (centered at 180 degrees)
              const bottomA0 = 180 - confirmWidth / 2;
              const bottomA1 = 180 + confirmWidth / 2;
              
              return (
                <g className="order-confirm-wedge-indecision">
                  {/* TOP WEDGE - confirmation badge */}
                  <path 
                    d={arcPath(innerR, outerR, topA0, topA1)} 
                    fill="url(#confirmBadgeGrad)" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    filter="url(#strongGlow)"
                  />
                  <text 
                    x={cx} 
                    y={cy - (innerR + outerR) / 2} 
                    fill="#22c55e" 
                    fontSize={9} 
                    fontWeight={800} 
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(-90, ${cx}, ${cy - (innerR + outerR) / 2})`}
                  >
                    ✓ ${getOrderAmount('INDECISION')}
                  </text>
                  
                  {/* BOTTOM WEDGE - confirmation badge */}
                  <path 
                    d={arcPath(innerR, outerR, bottomA0, bottomA1)} 
                    fill="url(#confirmBadgeGrad)" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    filter="url(#strongGlow)"
                  />
                  <text 
                    x={cx} 
                    y={cy + (innerR + outerR) / 2} 
                    fill="#22c55e" 
                    fontSize={9} 
                    fontWeight={800} 
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(90, ${cx}, ${cy + (innerR + outerR) / 2})`}
                  >
                    ✓ ${getOrderAmount('INDECISION')}
                  </text>
                </g>
              );
            })()}
          </g>

          {/* Core (countdown + state) */}
          <circle cx={cx} cy={cy} r={R.core[1]} fill="rgba(20, 35, 60, 0.95)" stroke="rgba(100, 200, 255, 0.3)" strokeWidth={2} filter="url(#glow)" />
          
          {/* Round Duration Label */}
          <text x={cx} y={cy - 28} fill="rgba(165, 213, 255, 0.6)" textAnchor="middle" fontSize={9} fontWeight={600} letterSpacing={0.5}>
            {roundDurationMin} MIN ROUND
          </text>
          
          {/* Timer Display */}
          <text x={cx} y={cy - 8} fill="#22c55e" textAnchor="middle" fontSize={26} fontWeight={800} fontFamily="monospace">
            {state === "settled" ? "DONE" : state === "preopen" ? "--:--" : `${String(Math.floor(countdownSec / 60)).padStart(2, '0')}:${String(countdownSec % 60).padStart(2, '0')}`}
          </text>
          
          {/* Market status under timer */}
          <text x={cx} y={cy + 20} fill="rgba(165, 213, 255, 0.6)" textAnchor="middle" fontSize={9} fontWeight={500}>
            {state === "settled" ? "Round Complete" : 
             state === "frozen" ? "TIME OUT" : 
             state === "preopen" ? "Market Opening Soon" : 
             "Market AI Analysing"}
          </text>
          
          {/* Previous winner timer indicator */}
          {showPreviousWinners && !showWinners && (
            <text x={cx} y={cy + 35} fill="#c084fc" textAnchor="middle" fontSize={9} fontWeight={700} filter="url(#glow)">
              🎉 Celebrating Winner ({previousWinnerTimer}s) 🎊
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
