"use client";
import React from "react";

export default function UserDashboardContent() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>User Dashboard Content</h1>
      <p>Welcome to your personal investment dashboard!</p>
      <p>This is a separate component that you can customize independently from the admin dashboard.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginTop: '2rem' 
      }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3>My Balance</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>$1,250.50</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3>Total Invested</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>$5,000</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3>Returns</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>+$250</p>
        </div>
      </div>
    </div>
  );
}
