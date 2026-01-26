"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  getAgeGateConfirmed,
  setAgeGateConfirmed,
} from "@/lib/api/legal";

const BYPASS_PATHS = ["/terms", "/privacy"];

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setConfirmed(getAgeGateConfirmed());
    setChecked(true);
  }, []);

  const bypass = BYPASS_PATHS.some((p) => pathname?.startsWith(p));
  if (!checked || bypass) return <>{children}</>;
  if (confirmed) return <>{children}</>;

  return (
    <div className="age-gate-overlay">
      <div className="age-gate-modal">
        <h1>Age verification</h1>
        <p>You must be 18 or older to use ForexAI Exchange.</p>
        <div className="age-gate-links">
          <Link href="/terms">Terms &amp; Conditions</Link>
          <span> · </span>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
        <label className="age-gate-checkbox">
          <input
            type="checkbox"
            id="age-gate-confirm"
            onChange={(e) => {
              if (e.target.checked) {
                setAgeGateConfirmed();
                setConfirmed(true);
              }
            }}
          />
          <span>I confirm I am 18 or older</span>
        </label>
        <p className="age-gate-hint">You must confirm to continue.</p>
      </div>
      <style jsx>{`
        .age-gate-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        }
        .age-gate-modal {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
          max-width: 420px;
          text-align: center;
        }
        .age-gate-modal h1 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
          color: #fff;
        }
        .age-gate-modal p {
          margin: 0 0 1rem;
          color: #b0b0b0;
          font-size: 0.95rem;
        }
        .age-gate-links {
          margin-bottom: 1.25rem;
        }
        .age-gate-links a {
          color: #60a5fa;
          text-decoration: underline;
        }
        .age-gate-checkbox {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          color: #e0e0e0;
          margin-bottom: 0.5rem;
        }
        .age-gate-checkbox input {
          width: 18px;
          height: 18px;
        }
        .age-gate-hint {
          font-size: 0.85rem;
          color: #888;
        }
      `}</style>
    </div>
  );
}
