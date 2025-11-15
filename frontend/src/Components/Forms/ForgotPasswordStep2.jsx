"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import "../Styles/ForgetPassword.scss";

export default function ForgotPasswordStep2() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('resetEmail');
    if (!storedEmail) {
      // If no email found, redirect back to step 1
      router.push('/forgetpassword');
    } else {
      setEmail(storedEmail);
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    // Store OTP in sessionStorage for the next step
    sessionStorage.setItem('resetOtp', otp);
    // Redirect to reset password page
    router.push('/forgetpassword/reset-password');
  };

  const handleResendOtp = async () => {
    setError("");
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert('OTP resent successfully! Please check your email.');
      } else {
        setError('Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Resend OTP error:', err);
    }
  };

  return (
    <div className="forget-page">
      <div className="image-side">
        <img src="/image/Login.png" alt="background" />
      </div>

      <div className="form-side">
        <div className="form-wrapper">
          <h2>Verify OTP</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
            Enter the 6-digit OTP sent to your email: <strong>{email}</strong>
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
            <label>OTP Code</label>
            <input
              type="text"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength="6"
              required
              style={{ letterSpacing: '0.5rem', fontSize: '1.2rem', textAlign: 'center' }}
            />

            <button type="submit">Verify OTP</button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button 
              onClick={handleResendOtp}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#2400ff', 
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              Resend OTP
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a href="/forgetpassword" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
              Back to Email Entry
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

