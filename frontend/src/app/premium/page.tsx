"use client";
import React, { useState, useEffect } from "react";
import { getAvailablePlans, subscribeToPlan, PremiumPlan } from "@/lib/api/premium";

export default function PremiumPage() {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getAvailablePlans()
      .then(setPlans)
      .catch((err) => setError(err.message || "Failed to load plans"));
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await subscribeToPlan(selectedPlan);
      setSuccess("Premium subscription successful!");
    } catch (err) {
      setError(err.message || "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Buy Premium</h1>
      <p>Upgrade your account to premium for exclusive features.</p>
      {plans.length === 0 && <p>No premium plans available.</p>}
      <ul>
        {plans.map((plan) => (
          <li key={plan.id} style={{ marginBottom: 16 }}>
            <label>
              <input
                type="radio"
                name="premiumPlan"
                value={plan.id}
                checked={selectedPlan === plan.id}
                onChange={() => setSelectedPlan(plan.id)}
                disabled={loading}
              />
              <strong>{plan.name}</strong> - {plan.price} {plan.currency} ({plan.billingCycle})
            </label>
            <div style={{ fontSize: 14, color: '#555' }}>{plan.description}</div>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSubscribe}
        disabled={loading || !selectedPlan}
        style={{ padding: "12px 24px", fontSize: 18 }}
      >
        {loading ? "Processing..." : "Subscribe to Premium"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
}
