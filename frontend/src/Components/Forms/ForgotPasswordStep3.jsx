"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import "../Styles/ForgetPassword.scss";

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function ForgotPasswordStep3() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Get email and OTP from sessionStorage
    const storedEmail = sessionStorage.getItem('resetEmail');
    const storedOtp = sessionStorage.getItem('resetOtp');
    
    if (!storedEmail || !storedOtp) {
      // If no email or OTP found, redirect back to step 1
      router.push('/forgetpassword');
    } else {
      setEmail(storedEmail);
      setOtp(storedOtp);
    }
  }, [router]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength (matching backend requirements)
    if (formData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (!/[A-Z]/.test(formData.newPassword)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }
    
    if (!/[a-z]/.test(formData.newPassword)) {
      setError("Password must contain at least one lowercase letter");
      return;
    }
    
    if (!/[0-9]/.test(formData.newPassword)) {
      setError("Password must contain at least one number");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: otp,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear sessionStorage
        sessionStorage.removeItem('resetEmail');
        sessionStorage.removeItem('resetOtp');
        // Redirect to success page
        router.push('/Changed');
      } else {
        setError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Reset password error:', err);
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
          <h2>Reset Password</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
            Enter your new password
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
            <label>New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="********"
              required
              disabled={loading}
              minLength="8"
            />

            <label>Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="********"
              required
              disabled={loading}
              minLength="8"
            />
            
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '-0.5rem', marginBottom: '1rem' }}>
              Password must be at least 8 characters with uppercase, lowercase, and number
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a href="/forgetpassword" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
              Start Over
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

