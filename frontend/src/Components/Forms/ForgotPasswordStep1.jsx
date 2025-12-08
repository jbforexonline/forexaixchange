"use client";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import "../Styles/ForgetPassword.scss";

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function ForgotPasswordStep1() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store email in sessionStorage to use in next steps
        sessionStorage.setItem('resetEmail', email);
        // Redirect to OTP verification page
        router.push('/forgetpassword/verify-otp');
      } else {
        setError(data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forget-page">
      <div className="image-side">
        <img src="/image/Login.png" alt="background" />
      </div>

      <div className="form-side">
        <div className="form-wrapper">
          <h2>Forgot Password</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
            Enter your registered email address and we'll send you an OTP to reset your password.
          </p>

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

          <form onSubmit={handleSubmit}>
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@gmail.com"
              required
              disabled={loading}
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a href="/login" style={{ color: '#2400ff', textDecoration: 'none' }}>
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

