"use client";
import React, { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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
        setSuccess('OTP sent successfully! Please check your email.');
        setStep(2);
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

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setStep(3);
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      if (response.ok) {
        setSuccess('OTP resent successfully! Please check your email.');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Resend OTP error:', err);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
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
        setSuccess('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          onClose();
          // Reset form
          setStep(1);
          setEmail("");
          setOtp("");
          setFormData({ newPassword: "", confirmPassword: "" });
          setError("");
          setSuccess("");
        }, 2000);
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

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setOtp("");
    } else if (step === 3) {
      setStep(2);
      setFormData({ newPassword: "", confirmPassword: "" });
    }
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setStep(1);
    setEmail("");
    setOtp("");
    setFormData({ newPassword: "", confirmPassword: "" });
    setError("");
    setSuccess("");
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: '#0c1326',
          borderRadius: '16px',
          padding: '2rem',
          width: '90%',
          maxWidth: '450px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          border: '1px solid rgba(152, 163, 205, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <h2 style={{ 
          color: '#2400ff', 
          marginBottom: '1rem',
          fontSize: '1.5rem',
          textAlign: 'center'
        }}>
          {step === 1 && 'Forgot Password'}
          {step === 2 && 'Verify OTP'}
          {step === 3 && 'Reset Password'}
        </h2>

        {step === 1 && (
          <>
            <p style={{ 
              textAlign: 'center', 
              color: '#98a3cd', 
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
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

            <form onSubmit={handleEmailSubmit}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#fff',
                fontSize: '0.9rem'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@gmail.com"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(152, 163, 205, 0.3)',
                  backgroundColor: 'rgba(12, 19, 38, 0.9)',
                  color: '#fff',
                  marginBottom: '1rem',
                  fontSize: '0.95rem',
                }}
              />

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2400ff, #1a00cc)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ 
              textAlign: 'center', 
              color: '#98a3cd', 
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              Enter the 6-digit OTP sent to <strong style={{ color: '#fff' }}>{email}</strong>
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

            {success && (
              <div style={{ 
                padding: '0.8rem', 
                backgroundColor: '#efe', 
                color: '#3c3', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {success}
              </div>
            )}

            <form onSubmit={handleOtpSubmit}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#fff',
                fontSize: '0.9rem'
              }}>
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength="6"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(152, 163, 205, 0.3)',
                  backgroundColor: 'rgba(12, 19, 38, 0.9)',
                  color: '#fff',
                  marginBottom: '1rem',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  letterSpacing: '0.5rem',
                }}
              />

              <button 
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2400ff, #1a00cc)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Verify OTP
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
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
              <button 
                onClick={handleBack}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#98a3cd', 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p style={{ 
              textAlign: 'center', 
              color: '#98a3cd', 
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
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

            {success && (
              <div style={{ 
                padding: '0.8rem', 
                backgroundColor: '#efe', 
                color: '#3c3', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {success}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#fff',
                fontSize: '0.9rem'
              }}>
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="********"
                required
                disabled={loading}
                minLength="8"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(152, 163, 205, 0.3)',
                  backgroundColor: 'rgba(12, 19, 38, 0.9)',
                  color: '#fff',
                  marginBottom: '1rem',
                  fontSize: '0.95rem',
                }}
              />

              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#fff',
                fontSize: '0.9rem'
              }}>
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="********"
                required
                disabled={loading}
                minLength="8"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(152, 163, 205, 0.3)',
                  backgroundColor: 'rgba(12, 19, 38, 0.9)',
                  color: '#fff',
                  marginBottom: '0.5rem',
                  fontSize: '0.95rem',
                }}
              />
              
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#98a3cd', 
                marginBottom: '1rem',
                marginTop: '-0.5rem'
              }}>
                Password must be at least 8 characters with uppercase, lowercase, and number
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2400ff, #1a00cc)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button 
                onClick={handleBack}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#98a3cd', 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

