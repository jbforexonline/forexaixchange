"use client";
import React, { useState, useEffect } from "react";
import {
  getPremiumPlans,
  subscribeToPlan,
  upgradeSubscription,
  simulateSubscription,
  getActiveSubscription,
  cancelSubscription,
  refreshUserData,
} from "@/lib/api/premium";
import { getWallet } from "@/lib/api/spin";
import { useDemo } from "@/context/DemoContext";
import { resetDemoWallet } from "@/lib/api/spin";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Check, Star, Zap, Shield, Trophy, Crown, Gem, RefreshCw, CreditCard, Landmark, Smartphone, ArrowLeft, Loader2, Home, Wallet as WalletIcon, History as HistoryIcon, LayoutDashboard } from "lucide-react";
import "./PremiumPage.scss";

export default function PremiumPage() {
  const [plans, setPlans] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();
  
  // Checkout State
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  
  const { isDemo, toggleDemo } = useDemo();

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
      
      const unwrappedPlans = plansData?.data ?? plansData;
      const unwrappedSub = subscriptionData?.data ?? subscriptionData;

      setPlans(Array.isArray(unwrappedPlans) ? unwrappedPlans : []);
      setActiveSubscription(unwrappedSub);
      return { plans: unwrappedPlans, subscription: unwrappedSub };
    } catch (err) {
      console.error("Failed to load premium data:", err);
      setError("Failed to load premium plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    // Set selected plan and open checkout view
    setSelectedPlan({
      ...plan,
      label: plan.duration === 1 ? "Monthly" : plan.duration === 6 ? "6 Months" : "Yearly"
    });
    setShowCheckout(true);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const processSubscription = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPlan) return;

    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      // Determine if we're doing a NEW sub or an UPGRADE
      if (activeSubscription) {
        // CALL UPGRADE API (handles prorated credit from wallet)
        await upgradeSubscription(selectedPlan.id);
        setSuccess("✅ Tier upgraded! Prorated credit applied to your wallet.");
      } else {
        // CALL NEW SUB API (full deduction from wallet)
        await subscribeToPlan(selectedPlan.id);
        setSuccess("✅ Premium unlocked! Funds deducted from your wallet.");
      }
      
      // Update local storage and status IMMEDIATELY
      await refreshUserData();
      await loadData();
      
      setShowCheckout(false);
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('user-data-updated'));
      
    } catch (err) {
      const message = err.message || "Failed to process transaction. Check your wallet balance.";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = async (amount) => {
    try {
      setProcessing(true);
      await resetDemoWallet(amount);
      setSuccess(`✅ Demo balance reset to $${amount.toLocaleString()}!`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError("Failed to reset demo wallet");
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
      setTimeout(() => window.location.reload(), 2000);
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
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Analyzing premium opportunities...</p>
        </div>
      </div>
    );
  }

  // Group plans by duration for specific boxes
  const monthlyPlan = plans.find(p => p.duration === 1);
  const sixMonthPlan = plans.find(p => p.duration === 6);
  const yearlyPlan = plans.find(p => p.duration === 12);

  const displayPlans = [
    { ...monthlyPlan, label: "Monthly", color: "#d4af37", icon: <Star /> },
    { ...sixMonthPlan, label: "6 Months", color: "#10b981", icon: <Gem />, popular: true },
    { ...yearlyPlan, label: "Yearly", color: "#6366f1", icon: <Crown /> }
  ].filter(p => p.id);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="premium-page"
    >
      <AnimatePresence mode="wait">
        {!showCheckout ? (
          <motion.div 
            key="plans-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="premium-header">
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                🌟 Premium Membership
              </motion.h1>
              <p>Unlock exclusive features and maximize your trading potential</p>
              
              <div className="demo-controls-enhanced" style={{
                marginTop: '3rem',
                padding: '1.5rem',
                background: 'rgba(30, 41, 59, 0.5)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                maxWidth: '650px',
                margin: '3rem auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isDemo ? '1.5rem' : 0 }}>
                   <div style={{ textAlign: 'left' }}>
                     <h3 style={{ margin: 0, color: isDemo ? '#d4af37' : '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       {isDemo ? <RefreshCw size={20} /> : <Check size={20} />}
                       {isDemo ? 'Demo Mode Active' : 'Live Trading Active'}
                     </h3>
                     <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', opacity: 0.6 }}>
                       {isDemo ? 'Simulation environment with test funds.' : 'Real money trading environment.'}
                     </p>
                   </div>
                   <button onClick={toggleDemo} className="subscribe-btn" style={{ padding: '0.75rem 1.5rem', width: 'auto', fontSize: '0.9rem' }}>
                     {isDemo ? 'Go Live' : 'Try Demo'}
                   </button>
                </div>
                
                <AnimatePresence>
                  {isDemo && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', overflow: 'hidden' }}
                    >
                      <button onClick={() => handleReset(10000)} className="reset-btn" disabled={processing}>
                        <RefreshCw size={14} /> Reset $10,000
                      </button>
                      <button onClick={() => handleReset(20000)} className="reset-btn" disabled={processing}>
                        <RefreshCw size={14} /> Reset $20,000
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="plans-grid">
              {/* 1. Free Tier (Current Status if not Premium) */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`plan-card static ${!activeSubscription ? "active" : ""}`}
              >
                <div className="plan-header">
                  <div className="tier-icon"><Shield style={{ color: '#94a3b8' }} /></div>
                  <h3>Free Tier</h3>
                  <div className="price">
                    <span className="amount">$0</span>
                    <span className="period">/Lifetime</span>
                  </div>
                </div>
                <ul className="features-list">
                  <li><span className="check">✓</span> Standard trading hub</li>
                  <li><span className="check">✓</span> Basic analytics</li>
                  <li><span className="check">✓</span> Community access</li>
                  <li style={{ opacity: 0.5 }}><span className="check" style={{ color: 'rgba(255,255,255,0.2)' }}>×</span> No auto-spin</li>
                </ul>
                <button className="subscribe-btn active" disabled>
                  {!activeSubscription ? "Current Plan" : "Included"}
                </button>
              </motion.div>

              {/* 2. Paid Tiers from Backend (Showing All) */}
              {plans.map((plan, index) => {
                const isActive = activeSubscription?.planId === plan.id;
                
                // Tier Logic based on duration
                let tierLabel = "Basic";
                let tierIcon = <Star style={{ color: '#d4af37' }} />;
                let tierClass = "basic";

                if (plan.duration === 6) {
                  tierLabel = "Premium";
                  tierIcon = <Gem style={{ color: '#10b981' }} />;
                  tierClass = "premium";
                } else if (plan.duration === 12) {
                  tierLabel = "VIP Elite";
                  tierIcon = <Crown style={{ color: '#6366f1' }} />;
                  tierClass = "vip";
                }

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: (index + 1) * 0.1 }}
                    className={`plan-card ${isActive ? "active" : ""} ${tierClass}`}
                  >
                    <div className="plan-header">
                      <div className="tier-icon">{tierIcon}</div>
                      <h3>{tierLabel}</h3>
                      <div className="price">
                        <span className="amount">${plan.price}</span>
                        <span className="period">/{plan.duration} month{plan.duration > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <ul className="features-list">
                      {(plan.features || []).slice(0, 4).map((feature, idx) => (
                        <li key={idx}>
                          <span className="check">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`subscribe-btn ${isActive ? "active" : ""}`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processing || isActive}
                    >
                      {processing 
                        ? "Verifying..." 
                        : isActive 
                        ? "Current Plan" 
                        : activeSubscription 
                        ? "Switch to Tier" 
                        : "Buy from Wallet"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="checkout-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="checkout-container"
          >
            <button className="back-btn" onClick={() => setShowCheckout(false)} disabled={processing}>
              <ArrowLeft size={20} /> Back to plans
            </button>

            <div className="checkout-layout">
              <div className="checkout-form-section">
                <h2>Secure Checkout</h2>
                <p className="subtitle">Choose your payment method and complete your upgrade.</p>

                <form className="payment-form" onSubmit={processSubscription}>
                  <div className="method-selector">
                    <button 
                      type="button" 
                      className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <CreditCard /> <span>Card</span>
                    </button>
                    <button 
                      type="button" 
                      className={`method-btn ${paymentMethod === 'bank' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('bank')}
                    >
                      <Landmark /> <span>Bank</span>
                    </button>
                    <button 
                      type="button" 
                      className={`method-btn ${paymentMethod === 'mobile' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('mobile')}
                    >
                      <Smartphone /> <span>Mobile</span>
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {paymentMethod === 'card' && (
                      <motion.div 
                        key="card-fields"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="form-fields"
                      >
                        <input className="premium-input" placeholder="Card Number" type="text" />
                        <div className="input-row">
                          <input className="premium-input" placeholder="MM/YY" type="text" />
                          <input className="premium-input" placeholder="CVC" type="text" />
                        </div>
                      </motion.div>
                    )}
                    {paymentMethod === 'mobile' && (
                      <motion.div 
                        key="mobile-fields"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="form-fields"
                      >
                        <select className="premium-input">
                          <option>MTN MoMo</option>
                          <option>Airtel Money</option>
                        </select>
                        <input className="premium-input" placeholder="Phone Number" type="tel" />
                      </motion.div>
                    )}
                    {paymentMethod === 'bank' && (
                      <motion.div 
                        key="bank-fields"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="form-fields"
                      >
                        <input className="premium-input" placeholder="Account Number" type="text" />
                        <input className="premium-input" placeholder="Bank Name" type="text" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" className="subscribe-btn final-btn" disabled={processing}>
                    {processing ? <><Loader2 className="spinner" /> Processing...</> : `Confirm & Pay $${selectedPlan.price}`}
                  </button>
                </form>
              </div>

              <div className="order-summary">
                <div className="summary-card">
                  <h3>Order Summary</h3>
                  <div className="summary-row">
                    <span>{selectedPlan.name} ({selectedPlan.label})</span>
                    <span>${selectedPlan.price}.00</span>
                  </div>
                  <div className="summary-row">
                    <span>Processing Fee</span>
                    <span>$0.00</span>
                  </div>
                  <div className="summary-total">
                    <span>Total Due</span>
                    <span>${selectedPlan.price}.00</span>
                  </div>
                  <div className="summary-protection">
                    <Shield size={16} /> Secure Payment Encrypted
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="alerts-container">
        {error && <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="error-banner">❌ {error}</motion.div>}
        {success && <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="success-banner">{success}</motion.div>}
      </div>

      <section className="premium-features">
        <h2>Exclusive Privileges</h2>
        <div className="features-showcase">
          <div className="feature-item">
            <Zap className="feature-icon" />
            <h4>Instant Profits</h4>
            <p>Withdraw your earnings instantly to your preferred wallet.</p>
          </div>
          <div className="feature-item">
            <Shield className="feature-icon" />
            <h4>Risk Management</h4>
            <p>Advanced tools to protect your capital and minimize losses.</p>
          </div>
          <div className="feature-item">
            <Trophy className="feature-icon" />
            <h4>VIP Access</h4>
            <p>Join private signals groups and professional trading webinars.</p>
          </div>
        </div>
      </section>

      <section className="quick-nav-hub">
        <h2>Quick Navigation</h2>
        <div className="nav-grid">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="nav-box"
            onClick={() => router.push('/spin')}
          >
            <Home className="nav-icon" />
            <span>Trading Hub</span>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="nav-box"
            onClick={() => router.push('/deposit')}
          >
            <WalletIcon className="nav-icon" />
            <span>Wallet</span>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="nav-box"
            onClick={() => router.push('/history')}
          >
            <HistoryIcon className="nav-icon" />
            <span>Transactions</span>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
