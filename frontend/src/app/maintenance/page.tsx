"use client";
import React, { useState, useEffect } from "react";
import { Hammer, Clock, RefreshCw, Home, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import { getUserRole, isAdminRole } from "@/lib/layoutConfig";
import BackToLanding from "@/Components/Common/BackToLanding";
import "@/Components/Styles/BackToLanding.scss";

export default function MaintenancePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check if user is admin and redirect them to admin dashboard
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user) {
      const userRole = getUserRole(user);
      if (isAdminRole(userRole)) {
        router.replace('/admin/dashboard');
        return;
      }
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/status`);
      const response = await res.json();
      // Backend wraps response in { data: ..., message: ..., statusCode: ... }
      const statusData = response.data || response;
      setLastChecked(new Date());
      
      if (!statusData.maintenance) {
        // Maintenance is over, redirect to home
        router.replace('/');
      }
    } catch (error) {
      console.error("Failed to check status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#fff',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Main Card */}
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        padding: '3rem',
        borderRadius: '24px',
        border: '1px solid rgba(96, 165, 250, 0.2)',
        maxWidth: '550px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        animation: 'float 6s ease-in-out infinite'
      }}>
        {/* Icon and Title */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '2px solid rgba(251, 191, 36, 0.3)'
          }}>
            <Hammer size={40} style={{ color: '#fbbf24' }} />
          </div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            margin: 0,
            background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Under Maintenance
          </h1>
        </div>
        
        {/* Message */}
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#94a3b8', 
          lineHeight: 1.7, 
          marginBottom: '2rem' 
        }}>
          We're currently performing scheduled maintenance to improve your trading experience. 
          Our team is working hard to bring you new features and improvements.
        </p>
        
        {/* Status Info */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          padding: '1.25rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid rgba(71, 85, 105, 0.5)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            color: '#fbbf24',
            fontSize: '0.95rem',
            fontWeight: 600
          }}>
            <Clock size={18} />
            <span>Estimated Return: Soon</span>
          </div>
          {lastChecked && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: '#64748b', 
              marginTop: '0.75rem',
              marginBottom: 0
            }}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <BackToLanding />
          <button
            onClick={checkStatus}
            disabled={isChecking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(96, 165, 250, 0.15)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              borderRadius: '10px',
              color: '#60a5fa',
              fontWeight: 600,
              cursor: isChecking ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.95rem'
            }}
          >
            <RefreshCw size={18} style={{ 
              animation: isChecking ? 'spin 1s linear infinite' : 'none' 
            }} />
            {isChecking ? 'Checking...' : 'Check Status'}
          </button>

          {currentUser ? (
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#ef4444',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              <LogOut size={18} />
              Logout
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '10px',
                color: '#94a3b8',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              <Home size={18} />
              Go to Login
            </button>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Need help? Contact us at <a href="mailto:support@forexaiexchange.com" style={{ color: '#60a5fa' }}>support@forexaiexchange.com</a>
        </p>
        <p style={{ color: '#334155', fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} ForexAI Exchange. All rights reserved.
        </p>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
