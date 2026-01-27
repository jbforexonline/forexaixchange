"use client";
import React from "react";
import { Settings, Hammer, Clock } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      color: '#fff',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        padding: '2rem',
        borderRadius: '24px',
        border: '1px solid rgba(96, 165, 250, 0.2)',
        maxWidth: '500px',
        animation: 'pulse 3s infinite ease-in-out'
      }}>
        <div style={{ marginBottom: '1.5rem', color: '#60a5fa' }}>
          <Hammer size={64} style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Under Maintenance</h1>
        </div>
        
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
          We're currently performing some scheduled maintenance to improve your experience. 
          We'll be back online shortly. Thank you for your patience!
        </p>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          color: '#60a5fa',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <Clock size={18} />
          <span>Estimated back online: SOON</span>
        </div>
      </div>
      
      <p style={{ marginTop: '3rem', color: '#475569', fontSize: '0.8rem' }}>
        &copy; 2026 ForexAI Exchange. All rights reserved.
      </p>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
