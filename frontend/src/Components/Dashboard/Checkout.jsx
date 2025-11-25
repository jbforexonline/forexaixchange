"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import "../../Components/Styles/Checkout.scss";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const planParam = searchParams?.get("plan") || "monthly";

  const [method, setMethod] = useState("card");
  const [saveInfo, setSaveInfo] = useState(false);
  const [email] = useState("jtumukunde60@gmail.com");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, method, saveInfo, plan: planParam });
    alert(
      `Static demo: payment simulated for ${planParam}. Full integration comes next.`
    );
  };

  const planConfig = {
    monthly: { price: 10, label: "Monthly" },
    "half-year": { price: 50, label: "6 Months" },
    yearly: { price: 90, label: "Yearly" },
  };

  const activePlan = planConfig[planParam] || planConfig.monthly;

  return (
    <main className="checkout-root">
      {/* LEFT SIDE (summary) */}
      <div className="checkout-panel left-panel">
        <div
          className="left-visual"
          style={{
            backgroundImage: `url("/mnt/data/Screenshot (4).png")`,
          }}
        >
          <div className="left-overlay">
            <div className="promo">
              <div className="promo-title">Try Forexaiexchange Pro</div>
              <div className="promo-free">Premuim</div>
              <div className="promo-sub">
                Then ${activePlan.price}.00 per month starting December 2, 2025
              </div>

              <div className="plan-card">
                <div className="plan-name">
                  ForexAIexchange Premium — {activePlan.label}
                </div>
                <div className="plan-badge">One month</div>
                <div className="plan-desc">
                  Upgrade to premium and unlock VIP features.
                </div>
                <div className="plan-price">${activePlan.price}.00</div>
              </div>

              <div className="summary">
                <div className="row">
                  <span>Subtotal</span>
                  <strong>${activePlan.price}.00</strong>
                </div>
                <div className="row">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="row bold">
                  <span>Total after trial</span>
                  <strong>${activePlan.price}.00</strong>
                </div>
                <div className="row bold">
                  <span>Total due today</span>
                  <strong>$0.00</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (form) */}
      <div className="checkout-panel right-panel">
        <div className="form-container">
          <h2>Enter payment details</h2>

          <form onSubmit={handleSubmit} className="payment-form">
            {/* EMAIL */}
            <label className="label">Email</label>
            <div className="input-muted">{email}</div>

            {/* PAYMENT METHOD */}
            <label className="label">Payment method</label>

            <div className="radio-card">

              {/* CARD */}
              <label
                className={`radio-row ${
                  method === "card" ? "active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="card"
                  checked={method === "card"}
                  onChange={() => setMethod("card")}
                />
                <div className="radio-content">
                  <div className="radio-title">Card</div>
                  <div className="cards-icons">
                    VISA • MC • AMEX • Discover
                  </div>
                </div>
              </label>

              {/* BANK */}
              <label
                className={`radio-row ${
                  method === "bank" ? "active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="bank"
                  checked={method === "bank"}
                  onChange={() => setMethod("bank")}
                />
                <div className="radio-content">
                  <div className="radio-title">US Bank Account</div>
                  <div className="cards-icons">ACH</div>
                </div>
              </label>

              {/* MOBILE MONEY — NEW */}
              <label
                className={`radio-row ${
                  method === "mobile" ? "active mobile-active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="mobile"
                  checked={method === "mobile"}
                  onChange={() => setMethod("mobile")}
                />
                <div className="radio-content">
                  <div className="radio-title">Mobile Money</div>
                  <div className="cards-icons">
                    MTN • Airtel 
                  </div>
                </div>
              </label>
            </div>

            {/* CARD INPUTS (hidden for mobile money) */}
            {method === "card" && (
              <>
                <label className="label">Card details</label>
                <div className="fake-card-inputs">
                  <input className="text-input" placeholder="Card number" />
                  <div className="row-split">
                    <input className="text-input" placeholder="MM / YY" />
                    <input className="text-input" placeholder="CVC" />
                  </div>
                </div>
              </>
            )}

            {/* MOBILE MONEY INPUTS */}
            {method === "mobile" && (
              <>
                <label className="label">Mobile Money Details</label>
                <input
                  className="text-input"
                  placeholder="Phone number"
                />
                <select className="text-input">
                  <option>MTN</option>
                  <option>Airtel</option>
                </select>
              </>
            )}

            {/* SAVE INFO */}
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={saveInfo}
                onChange={() => setSaveInfo(!saveInfo)}
              />
              <span>Save my information for faster checkout</span>
            </label>

            {/* SUBMIT */}
            <button className="start-btn" type="submit">
                Submit Payment
            </button>

            {/* FOOTER */}
            <p className="legal">
              By subscribing, you authorize Forexaiexchange to charge you
              according to the terms until you cancel.
            </p>

            <div className="powered">
              <div className="links">Terms • Privacy</div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
