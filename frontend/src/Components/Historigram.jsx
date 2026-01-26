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
import { getRoundHistory, getCurrentRound } from "../lib/api/spin";
import { getWebSocketClient } from "../lib/websocket";
import { useEffect, useState, useRef } from "react";

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

export default function Histogram({
  title,
  data = [],
  historyRows = DEFAULT_HISTORY,
  showChartOnly = false,
  showHistoryOnly = false
}) {
  const [realHistory, setRealHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        
        // Fetch current round and round history
        const [currentResponse, historyResponse] = await Promise.all([
          getCurrentRound().catch(() => ({ round: null })),
          getRoundHistory(1, 15).catch(() => ({ data: [] }))
        ]);
        
        // Handle current round
        const currentRound = currentResponse?.round;
        
        // Handle history response structure
        let historyRounds = [];
        const history = historyResponse;
        if (history.data && Array.isArray(history.data)) {
          historyRounds = history.data;
        } else if (Array.isArray(history)) {
          historyRounds = history;
        } else if (history.data && history.data.data && Array.isArray(history.data.data)) {
          historyRounds = history.data.data;
        }
        
        console.log('Current round:', currentRound);
        console.log('History rounds:', historyRounds);
        
        let allRounds = [];
        
        // Add current round at the top if it exists
        if (currentRound) {
          allRounds.push({
            ...currentRound,
            isCurrent: true
          });
        }
        
        // Add history rounds (settled rounds)
        allRounds = allRounds.concat(historyRounds.filter(r => r.state === 'SETTLED'));
        
        // Show up to 8 rounds for better user experience, minimum 5
        let displayRounds = allRounds.slice(0, 8);
        
        // If we have less than 5 rounds, pad with default data
        if (displayRounds.length < 5) {
          const defaultData = DEFAULT_HISTORY.slice(displayRounds.length);
          displayRounds = displayRounds.concat(defaultData.slice(0, 5 - displayRounds.length));
        }
        
        // Transform to component format
        const formatted = displayRounds.map((round, index) => {
          // Check if this is default data (no API data)
          if (typeof round === 'object' && round.date && typeof round.date === 'string' && !round.roundNumber) {
            // This is default display data, return as-is
            return {
              date: round.date,
              previous: round.previous,
              previousType: round.previousType,
              forexAI: round.forexAI,
              suggestion: round.suggestion,
              resultType: round.resultType
            };
          }

          const isCurrent = round.isCurrent || (index === 0 && round.state !== 'SETTLED');
          let recentResult = "Waiting results";
          let recentResultType = "info";
          
          // Get the actual result of THIS round (for Recent Result column)
          if (round.state === 'SETTLED') {
            const winners = [];
            if (round.outerWinner) winners.push(round.outerWinner);
            if (round.middleWinner) winners.push(round.middleWinner);
            if (round.innerWinner) winners.push(round.innerWinner);
            if (round.indecisionTriggered) winners.push("INDECISION");
            
            recentResult = winners.length > 0 ? winners.join(", ") : "Settled";
            recentResultType = "success";
          } else if (isCurrent) {
            recentResult = "Waiting results";
            recentResultType = "info";
          } else {
            // Non-current rounds that are not settled should show their actual state
            recentResult = round.state === 'FROZEN' ? "Finalizing" : "Waiting results";
            recentResultType = "info";
          }

          // AI suggestion logic
          let suggestion = "Waiting";
          if (isCurrent) {
            suggestion = "AI analysing market";
          } else if (round.state === 'SETTLED') {
            if (round.indecisionTriggered) {
              suggestion = "Indecision";
            } else if (round.innerWinner) {
              suggestion = round.innerWinner === 'HIGH_VOL' ? "High Volatile" : "Low Volatile";
            } else {
              suggestion = "High Volatile";
            }
          }

          return {
            date: isCurrent ? "Current" : new Date(round.openedAt || round.settledAt).toLocaleString([], {
              month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'
            }),
            previous: "", // Will be filled in next step
            previousType: "primary",
            forexAI: suggestion,
            suggestion: recentResult, // This goes to "Recent Result" column
            resultType: recentResultType
          };
        });
        
        // Second pass: Fill in Previous Result from the row below
        formatted.forEach((row, index) => {
          if (index < formatted.length - 1) {
            // Get Recent Result from row below (index + 1)
            const belowRow = formatted[index + 1];
            row.previous = belowRow.suggestion; // suggestion contains the Recent Result
            
            // Set color based on the content
            if (row.previous.includes('RED')) {
              row.previousType = "danger";
            } else if (row.previous.includes('BLUE')) {
              row.previousType = "primary";
            } else if (row.previous.includes('INDECISION')) {
              row.previousType = "warning";
            } else if (row.previous.includes('SELL')) {
              row.previousType = "danger";
            } else {
              row.previousType = "success";
            }
          } else {
            // Last row - try to get actual previous result, don't use placeholder
            // If there are more rounds available, use the next one's result
            if (allRounds.length > formatted.length) {
              const nextRound = allRounds[formatted.length];
              if (nextRound && nextRound.state === 'SETTLED') {
                const winners = [];
                if (nextRound.outerWinner) winners.push(nextRound.outerWinner);
                if (nextRound.middleWinner) winners.push(nextRound.middleWinner);
                if (nextRound.innerWinner) winners.push(nextRound.innerWinner);
                if (nextRound.indecisionTriggered) winners.push("INDECISION");
                
                row.previous = winners.length > 0 ? winners.join(", ") : "Previous Round";
                
                // Set color based on the content
                if (row.previous.includes('RED')) {
                  row.previousType = "danger";
                } else if (row.previous.includes('BLUE')) {
                  row.previousType = "primary";
                } else if (row.previous.includes('INDECISION')) {
                  row.previousType = "warning";
                } else if (row.previous.includes('SELL')) {
                  row.previousType = "danger";
                } else {
                  row.previousType = "success";
                }
              } else {
                row.previous = "Previous Round";
                row.previousType = "info";
              }
            } else {
              row.previous = "Previous Round";
              row.previousType = "info";
            }
          }
        });
        
        setRealHistory(formatted);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setIsLoading(false);
      }
    };

    fetchHistory();
    
    // Connect to WebSocket for real-time updates
    const socket = getWebSocketClient();
    if (socket.getState() === 'CLOSED') {
      socket.connect();
    }

    const unsubscribeSettled = socket.on('roundSettled', (data) => {
      console.log('Round settled, refreshing history:', data.roundNumber);
      fetchHistory();
    });

    const unsubscribeOpened = socket.on('roundOpened', (data) => {
      console.log('New round opened, refreshing history:', data.roundNumber);
      fetchHistory();
    });

    return () => {
      unsubscribeSettled();
      unsubscribeOpened();
    };
  }, []);

  // Use real history if available, else show loading or fallback to default
  const displayHistory = realHistory.length > 0 ? realHistory : (isLoading ? [] : DEFAULT_HISTORY);

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
      )}
    </div>
  );
}
