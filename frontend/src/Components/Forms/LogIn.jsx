"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { isAuthenticated, verifyToken, updateLastActivity } from '../../lib/auth'
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
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Check if user is already authenticated and redirect (use replace so back button doesn't show login)
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        const isValid = await verifyToken()
        if (isValid) {
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          const role = (user.role || 'USER').toUpperCase()
          const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN']
          const nextRoute = adminRoles.includes(role)
            ? '/admin/dashboard'
            : '/dashboard/spin'
          // Full redirect and replace history so back button cannot return to login
          window.location.replace(nextRoute)
          return
        }
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  // Read error or session message from query and clean URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      router.replace(window.location.pathname, { scroll: false })
    }
  }, [searchParams, router])

  // Set welcome message once from query (session expired / logged out) and clear URL
  useEffect(() => {
    const sessionExpired = searchParams.get('session_expired') === '1'
    const loggedOut = searchParams.get('logout') === '1'
    if (sessionExpired) {
      setWelcomeMessage('Your session expired after 10 minutes of inactivity. Please sign in again.')
      router.replace('/login', { scroll: false })
    } else if (loggedOut) {
      setWelcomeMessage('You have been logged out. Welcome back — please sign in again.')
      router.replace('/login', { scroll: false })
    }
  }, [searchParams, router])

  // Prevent back navigation to authenticated pages
  useEffect(() => {
    const handlePopState = () => {
      if (isAuthenticated()) {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const role = (user.role || 'USER').toUpperCase()
        const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN']
        const nextRoute = adminRoles.includes(role)
          ? '/admin/dashboard'
          : '/dashboard/spin'
        window.location.replace(nextRoute)
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
        const serverMessage = (responseBody.message || '').trim()
        const isAuthFailure = response.status === 401 || /invalid credential|unauthorized|bad request/i.test(serverMessage)
        const friendlyMessage = isAuthFailure
          ? (looksLikeEmail
            ? 'Email or password is wrong. Please try again.'
            : 'Phone number or password is wrong. Please try again.')
          : (serverMessage || 'Something went wrong. Please try again.')
        setError(friendlyMessage)
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
      updateLastActivity()

      // Get user role from response
      const role = (payload.user.role || 'USER').toUpperCase()

      // Admin roles that should go to admin dashboard
      const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN']

      // Determine redirect route based on role
      let nextRoute = '/dashboard/spin'  // Default for regular users - go directly to spin/game
      let isAdminRole = false

      if (adminRoles.includes(role)) {
        console.log(`🔴 ${role} detected - redirecting to admin dashboard`)
        nextRoute = '/admin/dashboard'
        isAdminRole = true
      } else if (role === 'MODERATOR') {
        console.log('🟣 Moderator detected - redirecting to spin')
        nextRoute = '/dashboard/spin'
      } else {
        console.log('🔷 Regular user - redirecting to spin/game')
        nextRoute = '/dashboard/spin'
      }

      console.log('🚀 Redirecting to:', nextRoute)

      // Use full page reload and replace history so back button cannot return to login
      window.location.replace(nextRoute)
    } catch (err) {
      console.error('Login error details:', err)
      setError('Network error. Please check your connection and try again.')
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
          {/* Go to Landing Page Button */}
          <div className="back-to-landing">
            <button 
              type="button" 
              onClick={() => router.push('/')}
              className="landing-button"
            >
              ← Go to Landing Page
            </button>
          </div>
          
          <h1 className="login-title">Welcome Back!</h1>
          <p className="login-subtitle">
            {welcomeMessage || 'Please sign in to your account'}
          </p>

          {welcomeMessage && (
            <div className="auth-message auth-message--info" role="status">
              {welcomeMessage}
            </div>
          )}

          {error && (
            <div className="auth-message auth-message--error" role="alert">
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
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

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
                        const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN'];
                        const isAdmin = adminRoles.includes((user.role || 'USER').toUpperCase());
                        const nextRoute = isAdmin ? '/admin/dashboard' : '/dashboard/spin';
                        
                        // Use full page reload and replace history so back button cannot return to login
                        window.location.replace(nextRoute);
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
