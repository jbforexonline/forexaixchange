"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
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
      console.log('Sending login request to:', `${apiUrl}/auth/login`)
      console.log('Login data:', { email: formData.email })

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      })

      console.log('Response status:', response.status)

      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        // Store token and user data in localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Redirect based on user role
        if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
          router.push('/dashboard')
        } else {
          router.push('/user-dashboard')
        }
      } else {
        setError(data.message || 'Invalid credentials. Please try again.')
      }
    } catch (err) {
      console.error('Login error details:', err)
      setError(`Network error: ${err.message}. Please check if backend is running on ${apiUrl}`)
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
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@gmail.com"
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
