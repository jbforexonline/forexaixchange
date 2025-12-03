"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      const payload = responseBody?.data ?? responseBody

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
      let nextRoute = '/spin'  // Default for regular users
      
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
        console.log('🔷 Regular user - redirecting to spin page')
        nextRoute = '/spin'
      }

      console.log('🚀 Redirecting to:', nextRoute)
      router.replace(nextRoute)
    } catch (err) {
      console.error('Login error details:', err)
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(`Network error: ${message}. Please check if backend is running on ${apiUrl}`)
    } finally {
      setLoading(false)
    }
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
              <a href="/forgetpassword">Forgot Password</a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <button className="google-btn">
            <img src="/image/google.png" alt="Google" className="google-icon" />
                Continue with Google
          </button>

          <p className="login-signup">
            Didn’t have an Account? <a href="/register">Sign-up</a>
          </p>
        </div>
      </div>
    </div>
  )
}
