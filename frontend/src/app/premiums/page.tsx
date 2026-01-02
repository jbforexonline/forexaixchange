"use client";
import React, { useState, useEffect } from "react";
import {
  getPremiumPlans,
  subscribeToPlan,
  simulateSubscription,
  getActiveSubscription,
  cancelSubscription,
  refreshUserData,
  PremiumPlan,
  Subscription,
} from "@/lib/api/premium";
import "./premium.scss";

export default function PremiumPage() {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.all([
        getPremiumPlans().catch(() => []),
        getActiveSubscription().catch(() => null),
      ]);

      setPlans(plansData);
      setActiveSubscription(subscriptionData);
    } catch (err) {
      console.error("Failed to load premium data:", err);
      setError("Failed to load premium plans. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, isSimulated: boolean = false) => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      if (isSimulated) {
        await simulateSubscription(planId);
      } else {
        await subscribeToPlan(planId);
      }

      setSuccess("✅ Premium activated successfully!");
      
      // Refresh user data to update premium status
      await refreshUserData();
      
      // Reload data
      await loadData();
    } catch (err: any) {
      const message = err.message || "Failed to subscribe";
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
      await refreshUserData();
    } catch (err: any) {
      const message = err.message || "Failed to cancel subscription";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading premium plans...</p>
        </div>
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
              <p className="plan-name">{activeSubscription.plan?.name || "Premium Active"}</p>
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

      {plans.length === 0 && !loading && !error && (
        <div className="no-plans">
          <p>No premium plans are currently available. Please check back later.</p>
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
                disabled={processing || isActive || !!activeSubscription}
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
            <p>Access real money trading with actual profits and faster execution.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <h4>Advanced Analytics</h4>
            <p>Deep insights and performance tracking to improve your strategy.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💎</div>
            <h4>Priority Support</h4>
            <p>Get help faster with dedicated support available 24/7 for VIPs.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <h4>Exclusive Signals</h4>
            <p>Premium trading signals and alerts sent directly to your device.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
