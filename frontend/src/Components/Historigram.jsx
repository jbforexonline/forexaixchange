"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import React from "react";
import "../Components/Styles/Historigram.scss";

const DEFAULT_KEYS = [
  "Buy",
  "Sell",
  "Red",
  "Blue",
  "High Volatile",
  "Low Volatile",
  "Indecision"
];

/* DEFAULT TABLE DATA (VISIBLE IMMEDIATELY) */
const DEFAULT_HISTORY = [
  {
    date: "2025-01-10 14:30",
    previous: "Red",
    previousType: "danger",
    forexAI: "Buy",
    suggestion: "High Volatile",
    result: "Waiting",
    resultType: "warning"
  },
  {
    date: "2025-01-10 14:00",
    previous: "Blue",
    previousType: "primary",
    forexAI: "Sell",
    suggestion: "Low Volatile",
    result: "Win",
    resultType: "success"
  },
  {
    date: "2025-01-10 13:30",
    previous: "Red",
    previousType: "danger",
    forexAI: "Buy",
    suggestion: "High Volatile",
    result: "Lost",
    resultType: "danger"
  },
   {
    date: "2025-01-10 13:30",
    previous: "Red",
    previousType: "danger",
    forexAI: "Buy",
    suggestion: "High Volatile",
    result: "Win",
    resultType: "success"
  },
   {
    date: "2025-01-10 13:30",
    previous: "Red",
    previousType: "danger",
    forexAI: "Buy",
    suggestion: "High Volatile",
    result: "Lost",
    resultType: "danger"
  },
    {
    date: "2025-01-10 14:00",
    previous: "Blue",
    previousType: "primary",
    forexAI: "Sell",
    suggestion: "Low Volatile",
    result: "Win",
    resultType: "success"
  }
];

export default function Histogram({
  title,
  data = [],
  historyRows = DEFAULT_HISTORY,
  showChartOnly = false,
  showHistoryOnly = false
}) {
  const normalizedData = DEFAULT_KEYS.map((key) => {
    const found = data.find(
      (d) => d.name?.toLowerCase() === key.toLowerCase()
    );

    return {
      name: key,
      value: found ? Math.max(found.value, 2) : 2
    };
  });

  return (
    <div className={`histogram-box ${showChartOnly ? 'chart-only' : ''} ${showHistoryOnly ? 'history-only' : ''}`}>
      {!showHistoryOnly && (
        <>
          <h3>{title}</h3>
          {/* ================= CHART ================= */}
          <ResponsiveContainer width="100%" height={showChartOnly ? 120 : 180}>
            <BarChart
              data={normalizedData}
              barSize={showChartOnly ? 12 : 18}
              margin={{ top: 10, right: 10, left: -10, bottom: showChartOnly ? 10 : 20 }}
            >
              <CartesianGrid
                stroke="rgba(59,130,246,0.15)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis dataKey="name" stroke="#9ccfff" tick={{ fontSize: showChartOnly ? 8 : 10 }} />
              <YAxis stroke="#9ccfff" tick={{ fontSize: showChartOnly ? 8 : 10 }} width={showChartOnly ? 25 : 30} />
              <ReferenceLine y={0} stroke="rgba(59,130,246,0.4)" />

              <Tooltip
                cursor={{ fill: "rgba(59,130,246,0.18)" }}
                contentStyle={{
                  background: "#02131f",
                  border: "1px solid rgba(59,130,246,0.35)",
                  borderRadius: "8px",
                  color: "#e7f7ff"
                }}
              />

              <Bar
                dataKey="value"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                animationDuration={900}
              />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* ================= HISTORY TABLE ================= */}
      {!showChartOnly && (
        <div className="history-wrapper">
          {showHistoryOnly && <h3>{title}</h3>}
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Previous History</th>
                <th>ForexAI</th>
                <th>NextGen Suggestion</th>
                <th>Win / Lose</th>
              </tr>
            </thead>

            <tbody>
              {historyRows.map((row, index) => (
                <tr key={index}>
                  <td className="date">{row.date}</td>

                  <td>
                    <span className={`badge ${row.previousType}`}>
                      {row.previous}
                    </span>
                  </td>

                  <td>
                    <span className="badge primary">
                      {row.forexAI}
                    </span>
                  </td>

                  <td>
                    <span className="badge info">
                      {row.suggestion}
                    </span>
                  </td>

                  <td>
                    <span className={`badge ${row.resultType}`}>
                      {row.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
