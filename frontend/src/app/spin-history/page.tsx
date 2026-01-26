'use client';
import { useState, useMemo } from 'react';
import styles from './spinHistory.module.scss';

const data = [
  { date: '04/12/2024', time: '08:45 PM', Indicator: "Red, Sell, Low volitile", Oder: 5, payout: 50, result: 'Win' },
  { date: '04/12/2024', time: '07:22 PM', Indicator: 'blue, buy, high volitile', Oder: 4, payout: 0, result: 'Loss' },
  { date: '04/11/2024', time: '09:15 PM', Indicator: "Red, Sell, Low volitile", Oder: 3, payout: 0, result: 'Loss' },
  { date: '04/11/2024', time: '05:30 PM', Indicator: 'blue, buy, high volitile', Oder: 5, payout: 20, result: 'Win' },
  { date: '04/10/2024', time: '10:00 PM', Indicator: "Red, Sell, Low volitile", Oder: 2, payout: 0, result: 'Loss' }
];

export default function SpinHistory() {
  const [startDate, setStartDate] = useState('04/01/2024');
  const [endDate, setEndDate] = useState('04/14/2024');
  const [selectedIndicator, setSelectedIndicator] = useState('All');

  const indicators = ['All', ...new Set(data.map(d => d.Indicator))];

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const [rowMonth, rowDay, rowYear] = row.date.split('/').map(Number);
      const rowDateObj = new Date(rowYear, rowMonth - 1, rowDay);
      
      const [startMonth, startDay, startYear] = startDate.split('/').map(Number);
      const startDateObj = new Date(startYear, startMonth - 1, startDay);
      
      const [endMonth, endDay, endYear] = endDate.split('/').map(Number);
      const endDateObj = new Date(endYear, endMonth - 1, endDay);

      const dateInRange = rowDateObj >= startDateObj && rowDateObj <= endDateObj;
      const indicatorMatch = selectedIndicator === 'All' || row.Indicator === selectedIndicator;

      return dateInRange && indicatorMatch;
    });
  }, [startDate, endDate, selectedIndicator]);

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Spin History</h1>
      <p className={styles.desc}>Track all your past spins, wins, and losses in one place.</p>

      <div className={styles.card}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Start Date</label>
            <input 
              type="date" 
              value={startDate.split('/').reverse().join('-')}
              onChange={(e) => {
                const [year, month, day] = e.target.value.split('-');
                setStartDate(`${month}/${day}/${year}`);
              }}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>End Date</label>
            <input 
              type="date" 
              value={endDate.split('/').reverse().join('-')}
              onChange={(e) => {
                const [year, month, day] = e.target.value.split('-');
                setEndDate(`${month}/${day}/${year}`);
              }}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Indicator</label>
            <select 
              value={selectedIndicator} 
              onChange={(e) => setSelectedIndicator(e.target.value)}
              className={styles.select}
            >
              {indicators.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.header}>
          <h2>Spin History</h2>
          <span>{startDate} - {endDate} ({filteredData.length} records)</span>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Indicator</th>
              <th>Oder</th>
              <th>Payout</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <tr key={i}>
                <td>{row.date} {row.time}</td>
                <td>{row.Indicator}</td>
                <td>${row.Oder.toFixed(2)}</td>
                <td className={row.payout > 0 ? styles.win : styles.loss}>${row.payout.toFixed(2)}</td>
                <td>
                  <span className={`${styles.badge} ${row.result === 'Win' ? styles.winBadge : styles.lossBadge}`}>
                    {row.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.features}>
          <div className={styles.feature}>Complete betting history</div>
          <div className={styles.feature}>Win/Loss analytics</div>
          <div className={styles.feature}>Filter by date range</div>
        </div>
      </div>
    </div>
  );
}
