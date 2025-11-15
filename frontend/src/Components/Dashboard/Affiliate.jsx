"use client";
import React from "react";
import "../Styles/Affiliate.scss";

const AffiliateDashboard = () => {
  return (
    <section className="affiliate-dashboard">
      <header className="dashboard-header">
        <h1>Affiliate Dashboard</h1>
        <div className="total-commission">
          <p>Total Commission</p>
          <h2>$0.00</h2>
        </div>
      </header>

      <div className="overview">
        <h2>Overview</h2>
        <p>
          The <strong>forexaiexchange Affiliate Program</strong> is a unique and
          innovative system designed to reward partners (“linkers”) for bringing
          active players. Unlike common affiliate models that pay on deposits,
          our system rewards commissions only when referrals make withdrawals,
          ensuring that affiliates benefit from real engagement and player
          activity.
        </p>

        <div className="link-box">
          <input
            type="text"
            value="https://www.forexaiexchange.com/signup?ref=12345"
            readOnly
          />
          <button>Copy Link</button>
        </div>
      </div>

      <div className="commission-structure">
        <h2>Commission Structure</h2>
        <table>
          <thead>
            <tr>
              <th>Referral Withdrawal Amount (USD)</th>
              <th>Commission to Linker (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Below $49</td>
              <td>$0</td>
            </tr>
            <tr>
              <td>$50 – $99</td>
              <td>$1</td>
            </tr>
            <tr>
              <td>$100 – $499</td>
              <td>$2</td>
            </tr>
            <tr>
              <td>$500+</td>
              <td>$5</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="example">
        <h2>Example</h2>
        <ul>
          <li>If your referral withdraws $50 today → you earn $1.</li>
          <li>
            If the same referral withdraws again on the same day → no additional
            commission.
          </li>
          <li>Commission opportunities reset every 24 hours.</li>
        </ul>
        <p>
          A <strong>$3 processing fee</strong> applies to the sending linker for
          each transfer request.
        </p>
      </div>

      <div className="referral-transfer">
        <h2>Referral Transfer Rights</h2>
        <p>
          A linker has the right to transfer a referral to another linker,
          provided both sides agree.
        </p>
        <ol>
          <li>
            The current linker (sender) submits a transfer request with:
            <ul>
              <li>Referral username</li>
              <li>Current linker details (name, email, phone, link)</li>
              <li>New linker details</li>
            </ul>
          </li>
          <li>The new linker (receiver) must also confirm the request.</li>
          <li>
            The Affiliate Department reviews and approves/rejects the request.
          </li>
        </ol>
      </div>
    </section>
  );
};

export default AffiliateDashboard;
