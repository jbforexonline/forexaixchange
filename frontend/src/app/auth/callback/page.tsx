"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    
    // Check if we're in a popup window
    const isPopup = window.opener && window.opener !== window;
    
    if (error) {
      const errorMessage = decodeURIComponent(error);
      setStatus('error');
      setMessage(errorMessage);
      
      if (isPopup) {
        // Send error to parent window and close popup
        window.opener?.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          message: errorMessage,
        }, window.location.origin);
        setTimeout(() => window.close(), 1000);
      } else {
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      }
      return;
    }
    
    if (token) {
      // Store token immediately
      localStorage.setItem('token', token);
      
      // Fetch user data from backend
      fetch(`${apiUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => {
          if (!res.ok) {
            console.error('Auth /me response not OK:', res.status, res.statusText);
            return res.json().then(err => {
              console.error('Auth /me error response:', err);
              throw new Error(err.message || 'Invalid token');
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('Auth /me response data:', data);
          // Handle wrapped response from TransformInterceptor: {data: {user: {...}}, message, statusCode, timestamp}
          // Or direct response: {user: {...}}
          const responseData = data.data || data;
          const user = responseData.user || responseData;
          console.log('Extracted user:', user);
          
          if (user && user.id) {
            localStorage.setItem('user', JSON.stringify(user));
            
            if (isPopup) {
              // Send success message to parent window and close popup
              window.opener?.postMessage({
                type: 'GOOGLE_OAUTH_SUCCESS',
                token: token,
              }, window.location.origin);
              setStatus('success');
              setMessage('Authentication successful! Closing...');
              setTimeout(() => window.close(), 1000);
            } else {
              // Normal redirect flow (not in popup)
              const role = (user.role || 'USER').toUpperCase();
              const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN'];
              const nextRoute = adminRoles.includes(role)
                ? '/admin/dashboard'
                : '/dashboard/spin';
              
              setStatus('success');
              setMessage('Authentication successful! Redirecting...');
              setTimeout(() => {
                router.replace(nextRoute);
              }, 1500);
            }
          } else {
            console.error('Invalid user data structure:', { user, hasId: !!user?.id, responseData, data });
            throw new Error('Invalid user data: missing user.id');
          }
        })
        .catch(err => {
          console.error('Auth callback error:', err);
          setStatus('error');
          setMessage(`Failed to authenticate: ${err.message || 'Please try again.'}`);
          
          if (isPopup) {
            window.opener?.postMessage({
              type: 'GOOGLE_OAUTH_ERROR',
              message: err.message || 'Authentication failed',
            }, window.location.origin);
            setTimeout(() => window.close(), 2000);
          } else {
            setTimeout(() => {
              router.replace('/login');
            }, 3000);
          }
        });
    } else {
      setStatus('error');
      setMessage('No authentication token received. Please try again.');
      
      if (isPopup) {
        window.opener?.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          message: 'No authentication token received',
        }, window.location.origin);
        setTimeout(() => window.close(), 2000);
      } else {
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      }
    }
  }, [searchParams, router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {status === 'loading' && (
        <>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #2400ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p>{message}</p>
        </>
      )}
      
      {status === 'success' && (
        <>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#4caf50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}>
            ✓
          </div>
          <p style={{ color: '#4caf50' }}>{message}</p>
        </>
      )}
      
      {status === 'error' && (
        <>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#f44336',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}>
            ✕
          </div>
          <p style={{ color: '#f44336' }}>{message}</p>
          <a href="/login" style={{ color: '#2400ff', textDecoration: 'none' }}>
            Go to Login
          </a>
        </>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

