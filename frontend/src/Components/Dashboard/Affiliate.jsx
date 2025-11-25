"use client";
import React from "react";
import "../../Components/Styles/Affiliate.scss";
// NOTE: original source saved at /mnt/data/Affiliate.jsx

export default function AffiliatePage(){
  return (
    <div className="panel-wrap">
      <div className="panel">
        <h3 className="panel-title">Affiliate Dashboard</h3>

        <div className="affiliate-top">
          <div className="commission-card">
            <div className="label">Total Commission</div>
            <div className="amount">$0.00</div>
            <div className="desc">Commissions are credited on referral withdrawals.</div>
          </div>

          <div className="link-card">
            <div className="label">Your referral link</div>
            <div className="copy-row">
              <input readOnly value="https://www.forexaiexchange.com/signup?ref=12345" />
              <button className="copy-btn">Copy</button>
            </div>
          </div>
        </div>

        <div className="affiliate-body">
          <h4>Commission Structure</h4>
          <table className="comm-table">
            <thead><tr><th>Referral Withdrawal</th><th>Commission</th></tr></thead>
            <tbody>
              <tr><td>Below $49</td><td>$0</td></tr>
              <tr><td>$50 – $99</td><td>$1</td></tr>
              <tr><td>$100 – $499</td><td>$2</td></tr>
              <tr><td>$500+</td><td>$5</td></tr>
            </tbody>
          </table>

          <div className="info-block">
            <h5>How it works</h5>
            <p>Your referrals must withdraw for commissions to be paid. Transfers cost $3 fee for the sender.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
