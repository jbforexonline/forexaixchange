"use client";
import React, { useMemo } from 'react';

type WheelState = "preopen" | "open" | "frozen" | "settled";

type WinnerFlags = {
  outer?: "BUY" | "SELL";
  color?: "BLUE" | "RED";
  vol?: "HIGH" | "LOW";
  indecision?: boolean;
};

type Props = {
  state: WheelState;
  countdownSec: number; // shows in the core
  winners?: WinnerFlags; // set when settled
  indecisionAngleDeg?: number; // where the vertical slice is (default -90 = 12 o’clock)
  currencies?: string[]; // ISO codes to repeat around the currency ring
};

const cx = 250, cy = 250; // center
const R = { // radii (inner/outer) for each ring
  core: [0, 85],
  vol: [90, 140],
  color:[145, 195],
  curr: [200, 235],
  dir: [240, 290], // outermost Buy/Sell
};

const PI = Math.PI;
const deg2rad = (d:number)=> (d-90) * (PI/180); // SVG 0° is at 3 o'clock; we shift so 0° is up

// Large-arc path helper for donut arcs
function arcPath(rInner:number, rOuter:number, startDeg:number, endDeg:number){
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
    `A ${rInner} ${rInner} 0 ${large} ${sweep^1} ${x3} ${y3}`,
    "Z"
  ].join(" ");
}

export default function SpinWheel({
  state,
  countdownSec,
  winners,
  indecisionAngleDeg = -90,
  currencies = ["USD","EUR","GBP","JPY","RWF","KES","NGN","CAD","AUD","ZAR"],
}: Props){
  const showWinners = state === "settled" && winners;

  // Colors (forex theme)
  const C = {
    bg: "#0b1020",
    grid: "#1c2540",
    text: "#e5eefc",
    buy: "#24d17e",
    sell: "#ea3943",
    blue: "#3ea7ff",
    red: "#ff4d4d",
    high: "#f0c419",
    low: "#6b7280",
    curr: "#8ab4f8",
    indecision: "#a78bfa",
    ringLine: "rgba(255,255,255,0.08)",
    winGlow: "rgba(255,255,255,0.35)",
  };

  // Indecision slice as a small wedge (e.g., 8 degrees)
  const indecisionWedge = useMemo(()=>{
    const width = 8;
    const a0 = indecisionAngleDeg - width/2;
    const a1 = indecisionAngleDeg + width/2;
    return {
      dir: arcPath(R.dir[0], R.dir[1], a0, a1),
      curr: arcPath(R.curr[0], R.curr[1], a0, a1),
      color:arcPath(R.color[0],R.color[1], a0, a1),
      vol: arcPath(R.vol[0], R.vol[1], a0, a1),
    };
  }, [indecisionAngleDeg]);

  // Helpers to highlight winners
  const win = {
    volLeft: winners?.vol === "LOW",
    volRight: winners?.vol === "HIGH",
    colorLeft:winners?.color === "RED",
    colorRight:winners?.color === "BLUE",
    dirLeft: winners?.outer === "SELL",
    dirRight: winners?.outer === "BUY",
    indecision: !!winners?.indecision,
  };

  return (
    <div className="relative w-[620px] mx-auto text-[14px]">
      {/* Winners panel (right side) */}
      {showWinners && (
      <div className="absolute -right-4 top-0 translate-x-full w-64 p-4 rounded-xl bg-white/5 border border-white/10 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🎆</span>
          <h3 className="font-semibold">Winners</h3>
        </div>
        <ul className="space-y-1 text-sm">
          {winners?.indecision && <li>Global: <b>INDECISION</b></li>}
          {winners?.outer && <li>Direction: <b>{winners.outer}</b></li>}
          {winners?.color && <li>Color: <b>{winners.color}</b></li>}
          {winners?.vol && <li>Volatility: <b>{winners.vol}</b></li>}
        </ul>
        <div className="mt-3 text-xs opacity-80">Congrats! Payouts are being applied.</div>
      </div>
      )}

      {/* Wheel */}
      <svg viewBox="0 0 500 500" className="rounded-2xl shadow-xl bg-[#0b1020] ring-1 ring-white/10">
        {/* ring separators */}
        {Object.values(R).map(([ri,ro],i)=>(
          // eslint-disable-next-line react/no-array-index-key
          <circle key={i} cx={cx} cy={cy} r={ro} fill="none" stroke={C.ringLine} strokeWidth={1}/>
        ))}

        {/* OUTERMOST: Buy/Sell (left = SELL, right = BUY) */}
        <path d={arcPath(R.dir[0], R.dir[1], -180, 0)} fill={C.sell} opacity={win.dirLeft?1:0.6}/>
        <path d={arcPath(R.dir[0], R.dir[1], 0, 180)} fill={C.buy} opacity={win.dirRight?1:0.6}/>
        {/* labels */}
        <text x={cx-140} y={cy} fill={C.text} textAnchor="middle" dominantBaseline="middle" style={{fontWeight:700}}>SELL</text>
        <text x={cx+140} y={cy} fill={C.text} textAnchor="middle" dominantBaseline="middle" style={{fontWeight:700}}>BUY</text>

        {/* CURRENCIES ring (ticks/text around) */}
        <path d={arcPath(R.curr[0], R.curr[1], -180, 180)} fill={C.curr} opacity={0.18}/>
        {currencies.map((ccy, i) => {
          const a = -180 + i*(360/currencies.length);
          const rr = (R.curr[0] + R.curr[1]) / 2;
          const x = cx + rr * Math.cos(deg2rad(a));
          const y = cy + rr * Math.sin(deg2rad(a));
          return <text key={ccy+"-"+i} x={x} y={y} fill={C.text} opacity={0.85}
            fontSize={10} textAnchor="middle" dominantBaseline="middle">{ccy}</text>;
        })}

        {/* COLOR ring: left RED | right BLUE */}
        <path d={arcPath(R.color[0], R.color[1], -180, 0)} fill={C.red} opacity={win.colorLeft?1:0.6}/>
        <path d={arcPath(R.color[0], R.color[1], 0, 180)} fill={C.blue} opacity={win.colorRight?1:0.6}/>
        <text x={cx-105} y={cy} fill={C.text} textAnchor="middle" dominantBaseline="middle">RED</text>
        <text x={cx+105} y={cy} fill={C.text} textAnchor="middle" dominantBaseline="middle">BLUE</text>

        {/* VOLATILITY ring: left LOW | right HIGH */}
        <path d={arcPath(R.vol[0], R.vol[1], -180, 0)} fill={C.low} opacity={win.volLeft?1:0.6}/>
        <path d={arcPath(R.vol[0], R.vol[1], 0, 180)} fill={C.high} opacity={win.volRight?1:0.6}/>
        <text x={cx-75} y={cy} fill={C.text} textAnchor="middle" dominantBaseline="middle">LOW</text>
        <text x={cx+75} y={cy} fill={C.text} textAnchor="middle" dominantBaseline="middle">HIGH</text>

        {/* INDECISION wedge (crosses all rings) */}
        <g opacity={win.indecision ? 1 : 0.9}>
          <path d={indecisionWedge.dir} fill={C.indecision}/>
          <path d={indecisionWedge.curr} fill={C.indecision}/>
          <path d={indecisionWedge.color}fill={C.indecision}/>
          <path d={indecisionWedge.vol} fill={C.indecision}/>
          {/* Label along the wedge tip (near core) */}
          <text x={cx} y={cy - R.core[1] - 6} fill={C.text} textAnchor="middle" fontSize={10}>INDECISION</text>
        </g>

        {/* CORE (countdown + Market Analysis) */}
        <circle cx={cx} cy={cy} r={R.core[1]} fill="#0f1733" stroke={C.grid} strokeWidth={1}/>
        <text x={cx} y={cy-8} fill={C.text} textAnchor="middle" fontSize={22} style={{fontWeight:700}}>
          {state === "settled" ? "Round Settled" : `${countdownSec}s`}
        </text>
        <text x={cx} y={cy+16} fill={C.text} textAnchor="middle" fontSize={12} opacity={0.85}>
          Market Analysis
        </text>

        {/* Subtle glow on winners */}
        {showWinners && (
        <g fill={C.winGlow}>
          {win.dirLeft && <path d={arcPath(R.dir[0], R.dir[1], -180, 0)} />}
          {win.dirRight && <path d={arcPath(R.dir[0], R.dir[1], 0, 180)} />}
          {win.colorLeft&& <path d={arcPath(R.color[0], R.color[1], -180, 0)} />}
          {win.colorRight&&<path d={arcPath(R.color[0], R.color[1], 0, 180)} />}
          {win.volLeft && <path d={arcPath(R.vol[0], R.vol[1], -180, 0)} />}
          {win.volRight && <path d={arcPath(R.vol[0], R.vol[1], 0, 180)} />}
        </g>
        )}
      </svg>

      {/* State banner */}
      <div className="mt-3 text-center text-white/80">
        {state === "preopen" && "Waiting to open"}
        {state === "open" && "Betting is open"}
        {state === "frozen" && "Final minute — no new bets"}
        {state === "settled" && "Winners announced"}
      </div>
    </div>
  );
}
