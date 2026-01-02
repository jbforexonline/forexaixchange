"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { isAuthenticated, verifyToken } from '../../lib/auth'
import ForgotPasswordModal from '../Modals/ForgotPasswordModal'

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        const isValid = await verifyToken()
        if (isValid) {
          // User is already authenticated, redirect to appropriate page
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          const role = (user.role || 'USER').toUpperCase()
          const nextRoute = role === 'ADMIN' || role === 'SUPER_ADMIN'
            ? '/admin/dashboard'
            : '/dashboard'
          router.replace(nextRoute)
          return
        }
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  // Read error from query parameters (e.g., from OAuth callback failures)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      // Clean up URL by removing error parameter
      const newUrl = window.location.pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [searchParams, router])

  // Prevent back navigation to authenticated pages
  useEffect(() => {
    const handlePopState = () => {
      // If user tries to go back, check if they're authenticated
      if (isAuthenticated()) {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const role = (user.role || 'USER').toUpperCase()
        const nextRoute = role === 'ADMIN' || role === 'SUPER_ADMIN'
          ? '/admin/dashboard'
          : '/dashboard'
        router.replace(nextRoute)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [router])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const trimmedIdentifier = formData.identifier.trim()
      if (!trimmedIdentifier) {
        throw new Error('Please enter your email address or phone number')
      }

      const loginPayload = {
        password: formData.password,
      }

      const looksLikeEmail = trimmedIdentifier.includes('@')
      if (looksLikeEmail) {
        loginPayload.email = trimmedIdentifier.toLowerCase()
      } else {
        loginPayload.phone = trimmedIdentifier.replace(/\s+/g, '')
      }

      console.log('Sending login request to:', `${apiUrl}/auth/login`)
      console.log('Login data:', { identifier: trimmedIdentifier })

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginPayload),
      })

      console.log('Response status:', response.status)

      const responseBody = await response.json()
      console.log('Response data:', responseBody)

      if (!response.ok) {
        setError(responseBody.message || 'Invalid credentials. Please try again.')
        return
      }

      // Robust payload extraction to handle potential double-nesting (e.g. data.data.token)
      let payload = responseBody
      // Drill down into data property if it exists and doesn't contain what we need directly
      while (payload && payload.data && (!payload.token || !payload.user)) {
        payload = payload.data
      }

      if (!payload?.token || !payload?.user) {
        throw new Error('Invalid response from server')
      }

      // Store token and user data in localStorage
      localStorage.setItem('token', payload.token)
      localStorage.setItem('user', JSON.stringify(payload.user))

      console.log('✅ Login successful!')
      console.log('📋 User role:', payload.user.role)
      console.log('💾 Stored user data:', payload.user)

      // Get user role from response
      const role = (payload.user.role || 'USER').toUpperCase()

      // Determine redirect route based on role
      let nextRoute = '/dashboard'  // Default for regular users

      if (role === 'SUPER_ADMIN') {
        console.log('🔴 Super Admin detected - redirecting to admin dashboard')
        nextRoute = '/admin/dashboard'
      } else if (role === 'ADMIN') {
        console.log('🔵 Admin detected - redirecting to admin dashboard')
        nextRoute = '/admin/dashboard'
      } else if (role === 'MODERATOR') {
        console.log('🟣 Moderator detected - redirecting to dashboard')
        nextRoute = '/dashboard'
      } else {
        console.log('🔷 Regular user - redirecting to user dashboard')
        nextRoute = '/dashboard'
      }

      console.log('🚀 Redirecting to:', nextRoute)

      router.replace(nextRoute)
      // Clear browser history to prevent back navigation after login
      window.history.replaceState(null, '', nextRoute)
    } catch (err) {
      console.error('Login error details:', err)
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(`Network error: ${message}. Please check if backend is running on ${apiUrl}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setLoading(true)

    try {
      console.log('🎯 Creating demo account...')

      const response = await fetch(`${apiUrl}/auth/demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Demo response status:', response.status)

      const responseBody = await response.json()
      console.log('Demo response data:', responseBody)

      if (!response.ok) {
        setError(responseBody.message || 'Failed to create demo account. Please try again.')
        return
      }

      // Robust payload extraction to handle potential double-nesting (e.g. data.data.token)
      let payload = responseBody
      // Drill down into data property if it exists and doesn't contain what we need directly
      while (payload && payload.data && (!payload.token || !payload.user)) {
        payload = payload.data
      }

      if (!payload?.token || !payload?.user) {
        throw new Error('Invalid response from server')
      }

      // Store token and user data in localStorage
      localStorage.setItem('token', payload.token)
      localStorage.setItem('user', JSON.stringify(payload.user))

      console.log('✅ Demo account created!')
      console.log('📋 User:', payload.user.username)
      console.log('💰 Starting balance:', payload.user.wallet?.available)

      router.replace('/dashboard')
      window.history.replaceState(null, '', '/dashboard')
    } catch (err) {
      console.error('Demo login error:', err)
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(`Failed to create demo account: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2400ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="login-container">
      {/* Left side background */}
      <div className="login-left"></div>

      {/* Right side form */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <h1 className="login-title">Welcome Back!!</h1>
          <p className="login-subtitle">Please Login your Account</p>

          {error && (
            <div style={{
              padding: '0.8rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <label>Email or phone number</label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="admin@gmail.com / +1234567890"
              required
              disabled={loading}
            />

            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="********"
              required
              disabled={loading}
            />

            <div className="login-forgot">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgotPassword(true);
                }}
              >
                Forgot Password
              </a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="demo-btn"
            onClick={handleDemoLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem',
              marginBottom: '1rem',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#5568d3')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#667eea')}
          >
            {loading ? 'Creating Demo Account...' : '🎮 Try Demo Account'}
          </button>

          <button
            type="button"
            className="google-btn"
            onClick={() => {
              const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
              const width = 500;
              const height = 600;
              const left = (window.screen.width - width) / 2;
              const top = (window.screen.height - height) / 2;

              const popup = window.open(
                `${apiUrl}/auth/google`,
                'Google OAuth',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
              );

              if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                setError('Popup was blocked. Please allow popups for this site.');
                return;
              }

              // Listen for messages from the popup
              const messageListener = (event) => {
                if (event.origin !== window.location.origin) return;

                if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
                  window.removeEventListener('message', messageListener);
                  popup.close();

                  const { token } = event.data;
                  localStorage.setItem('token', token);

                  fetch(`${apiUrl}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                  })
                    .then(res => res.json())
                    .then(data => {
                      const user = (data.data || data).user || (data.data || data);
                      if (user?.id) {
                        localStorage.setItem('user', JSON.stringify(user));
                        const nextRoute = ['ADMIN', 'SUPER_ADMIN'].includes((user.role || 'USER').toUpperCase())
                          ? '/admin/dashboard'
                          : '/dashboard';
                        router.replace(nextRoute);
                      }
                    })
                    .catch(() => setError('Failed to authenticate. Please try again.'));
                } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
                  window.removeEventListener('message', messageListener);
                  popup.close();
                  setError(event.data.message || 'Google authentication failed');
                }
              };

              window.addEventListener('message', messageListener);
            }}
            disabled={loading}
          >
            <img src="/image/google.png" alt="Google" className="google-icon" />
            Continue with Google
          </button>

          <p className="login-signup">
            Didn't have an Account? <a href="/register">Sign-up</a>
          </p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  )
}
