"use client";
import React, { useState, useEffect } from "react";
import {
  getPremiumPlans,
  simulateSubscription,
  getActiveSubscription,
  cancelSubscription,
  refreshUserData,
} from "@/lib/api/premium";
import "./PremiumPage.scss";

export default function PremiumPage() {
  const [plans, setPlans] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.all([
        getPremiumPlans(),
        getActiveSubscription().catch(() => null),
      ]);
      setPlans(plansData);
      setActiveSubscription(subscriptionData);
    } catch (err) {
      console.error("Failed to load premium data:", err);
      setError("Failed to load premium plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      await simulateSubscription(planId);
      setSuccess("✅ Premium activated successfully!");
      
      // Refresh user data to update premium status
      await refreshUserData();
      
      // Reload data
      await loadData();
      
      // Reload page after 2 seconds to update premium status everywhere
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to subscribe";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your premium subscription?")) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      await cancelSubscription();
      setSuccess("Subscription cancelled successfully");
      await loadData();
      
      // Reload page to update premium status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to cancel subscription";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-page">
        <div className="loading">Loading premium plans...</div>
      </div>
    );
  }

  return (
    <div className="premium-page">
      <div className="premium-header">
        <h1>🌟 Premium Membership</h1>
        <p>Unlock exclusive features and maximize your trading potential</p>
      </div>

      {error && <div className="error-banner">❌ {error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {activeSubscription && (
        <div className="active-subscription">
          <div className="subscription-badge">
            <span className="badge-icon">👑</span>
            <div className="badge-content">
              <h3>Active Premium</h3>
              <p className="plan-name">{activeSubscription.plan?.name}</p>
              <p className="expiry">
                Expires: {new Date(activeSubscription.endDate).toLocaleDateString()}
              </p>
              {activeSubscription.isSimulated && (
                <span className="simulated-badge">🧪 Test Mode</span>
              )}
            </div>
          </div>
          <button
            className="cancel-btn"
            onClick={handleCancel}
            disabled={processing}
          >
            Cancel Subscription
          </button>
        </div>
      )}

      <div className="plans-grid">
        {plans.map((plan) => {
          const isActive = activeSubscription?.planId === plan.id;
          const features = plan.features || [
            "Unlimited live trading",
            "Advanced analytics",
            "Priority support",
            "Exclusive signals",
          ];

          return (
            <div
              key={plan.id}
              className={`plan-card ${isActive ? "active" : ""}`}
            >
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="price">
                  <span className="amount">${plan.price}</span>
                  <span className="period">/{plan.duration} month{plan.duration > 1 ? 's' : ''}</span>
                </div>
              </div>

              <ul className="features-list">
                {features.map((feature, idx) => (
                  <li key={idx}>
                    <span className="check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`subscribe-btn ${isActive ? "active" : ""}`}
                onClick={() => handleSubscribe(plan.id)}
                disabled={processing || isActive || activeSubscription}
              >
                {processing
                  ? "Processing..."
                  : isActive
                  ? "Current Plan"
                  : activeSubscription
                  ? "Already Subscribed"
                  : "Subscribe Now"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="premium-features">
        <h2>Why Go Premium?</h2>
        <div className="features-showcase">
          <div className="feature-item">
            <div className="feature-icon">🚀</div>
            <h4>Live Trading</h4>
            <p>Access real money trading with actual profits</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <h4>Advanced Analytics</h4>
            <p>Deep insights and performance tracking</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💎</div>
            <h4>Priority Support</h4>
            <p>Get help faster with dedicated support</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <h4>Exclusive Signals</h4>
            <p>Premium trading signals and alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
