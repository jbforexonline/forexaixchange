"use client";
import React from "react";

/**
 * Transfer Page - PERMANENTLY DISABLED
 * 
 * Internal user-to-user transfers have been disabled for security reasons.
 * All financial transactions must go through official deposit/withdrawal channels
 * with admin approval.
 */
export default function TransferPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Internal Transfer</h1>
      
      {/* Feature Disabled Notice */}
      <div style={{
        padding: "2rem",
        backgroundColor: "#f8d7da",
        border: "1px solid #f5c6cb",
        borderRadius: "8px",
        color: "#721c24",
        marginBottom: "2rem",
      }}>
        <h3 style={{ marginTop: 0, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🚫</span>
          Feature Discontinued
        </h3>
        <p style={{ marginBottom: "1rem" }}>
          <strong>Internal transfers between users have been permanently disabled</strong> for security and regulatory compliance reasons.
        </p>
        <p style={{ marginBottom: "0" }}>
          All financial transactions must now go through official channels:
        </p>
      </div>

      {/* Alternative Options */}
      <div style={{
        backgroundColor: "#fff",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        <h3 style={{ marginTop: 0, marginBottom: "1.5rem" }}>Available Options</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            padding: "1rem",
            backgroundColor: "#e7f5e7",
            borderRadius: "8px",
            border: "1px solid #c3e6c3",
          }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#155724" }}>
              💰 Deposits
            </h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#155724" }}>
              Add funds to your account via MoMo, bank transfer, or cryptocurrency. 
              Deposits require admin approval for security.
            </p>
            <a 
              href="/dashboard/deposit" 
              style={{
                display: "inline-block",
                marginTop: "0.75rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#28a745",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "0.9rem",
              }}
            >
              Go to Deposits
            </a>
          </div>

          <div style={{
            padding: "1rem",
            backgroundColor: "#e7f3ff",
            borderRadius: "8px",
            border: "1px solid #b8daff",
          }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#004085" }}>
              💸 Withdrawals
            </h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#004085" }}>
              Withdraw your winnings via MoMo or bank transfer. 
              Withdrawals require OTP verification and admin approval.
            </p>
            <a 
              href="/dashboard/withdraw" 
              style={{
                display: "inline-block",
                marginTop: "0.75rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#007bff",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "0.9rem",
              }}
            >
              Go to Withdrawals
            </a>
          </div>
        </div>

        <div style={{
          marginTop: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          fontSize: "0.85rem",
          color: "#666",
        }}>
          <strong>Why was this feature removed?</strong>
          <ul style={{ marginTop: "0.5rem", marginBottom: 0, paddingLeft: "1.25rem" }}>
            <li>Enhanced security and fraud prevention</li>
            <li>Regulatory compliance requirements</li>
            <li>Better audit trail for all transactions</li>
            <li>Protection against unauthorized transfers</li>
          </ul>
        </div>
      </div>

      {/* Contact Support */}
      <div style={{
        marginTop: "1.5rem",
        padding: "1rem",
        backgroundColor: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: "8px",
        color: "#856404",
        fontSize: "0.9rem",
      }}>
        <strong>Need to send money to another user?</strong>
        <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
          Please contact our support team for assistance with special circumstances.
          We can help facilitate verified transactions through proper channels.
        </p>
      </div>
    </div>
  );
}

