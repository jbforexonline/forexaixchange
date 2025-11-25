"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import '../Styles/Deposit.scss';

// Link to the original uploaded doc (local file path used as URL)
const DOC_URL = '/mnt/data/premium package And about badge setup on web dashboard.docx';

export default function PremiumPricingPage() {
  const router = useRouter();
  return (
    <div className="premium-page">
      <div className="premium-container">
        
        {/* Hero Section */}
        <header className="premium-hero">
          <div className="hero-text">
            <h1>forexAIexchange Premium</h1>
            <p>Unlock exclusive features, VIP support, and a verification badge to level up your experience.</p>
            <a className="cta" href="#pricing">Choose your plan</a>
          </div>

          <div className="hero-badge">
            <div className="badge">🎖 Verified</div>
            <a className="doc-link" href={DOC_URL} target="_blank" rel="noreferrer">
              View package details
            </a>
          </div>
        </header>

        {/* Benefits Section */}
        <section id="benefits" className="benefits">
          <h2>Premium Benefits</h2>
          <ul>
            <li>✅ Verification Badge</li>
            <li>✅ Internal Transfers between users</li>
            <li>✅ Flexible Spin Timing & Auto-Press Orders</li>
            <li>✅ High Order Limits (up to $200 per order)</li>
            <li>✅ Unlimited Withdrawals</li>
            <li>✅ Members’ Chart Room Access & VIP support</li>
          </ul>
        </section>

        {/* Pricing Grid */}
        <section id="pricing" className="pricing-grid">

          {/* Monthly */}
          <article className="plan">
            <div className="plan-header">
              <h3>Monthly</h3>
              <div className="price">$10</div>
            </div>
            <ul className="plan-features">
              <li>Verification Badge</li>
              <li>Internal Transfers</li>
              <li>Up to $200 per order</li>
            </ul>
            <button className="upgrade" onClick={() => router.push('/deposit/checkout?plan=monthly')}>Upgrade — 1 Month</button>
          </article>

          {/* Half-Year (Featured) */}
          <article className="plan featured">
            <div className="plan-header">
              <h3>Half-Year</h3>
              <div className="price">$50</div>
            </div>
            <ul className="plan-features">
              <li>Everything in Monthly</li>
              <li>Auto-Press Orders (up to 50)</li>
              <li>Unlimited Withdrawals</li>
            </ul>
            <button className="upgrade" onClick={() => router.push('/deposit/checkout?plan=half-year')}>Upgrade — 6 Months</button>
          </article>

          {/* Yearly */}
          <article className="plan">
            <div className="plan-header">
              <h3>Yearly</h3>
              <div className="price">$90</div>
            </div>
            <ul className="plan-features">
              <li>Everything in Half-Year</li>
              <li>Free Ads Account</li>
              <li>Early access to Crypto & Stock Spins</li>
            </ul>
            <button className="upgrade" onClick={() => router.push('/deposit/checkout?plan=yearly')}>Upgrade — 12 Months</button>
          </article>

        </section>

      </div>
    </div>
  );
}
