"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState('admin')

  const handleLogin = (e) => {
    e.preventDefault()
    // For demo purposes, redirect based on role
    // In a real app, you'd validate credentials first
    if (userRole === 'admin') {
      router.push('/dashboard')
    } else {
      router.push('/user-dashboard')
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

          <form className="login-form" onSubmit={handleLogin}>
            <label>Email</label>
            <input type="email" placeholder="admin@gmail.com" />

            <label>Password</label>
            <input type="password" placeholder="********" />

            <label>Login As</label>
            <div className="role-selection">
              <label className="role-option">
                <input 
                  type="radio" 
                  name="role" 
                  value="admin" 
                  checked={userRole === 'admin'}
                  onChange={(e) => setUserRole(e.target.value)}
                />
                <span className="role-label">
                  <span className="role-icon">👨‍💼</span>
                  Admin Dashboard
                </span>
              </label>
              <label className="role-option">
                <input 
                  type="radio" 
                  name="role" 
                  value="user" 
                  checked={userRole === 'user'}
                  onChange={(e) => setUserRole(e.target.value)}
                />
                <span className="role-label">
                  <span className="role-icon">👤</span>
                  User Dashboard
                </span>
              </label>
            </div>

            <div className="login-forgot">
              <a href="/forgetpassword">Forgot Password</a>
            </div>

            <button type="submit" className="login-btn">Sign in</button>
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
