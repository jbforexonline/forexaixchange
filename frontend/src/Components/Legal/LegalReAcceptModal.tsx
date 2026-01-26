"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  acceptLegal,
  confirmAge,
  LEGAL_REACCEPT_REQUIRED,
  AGE_CONFIRM_REQUIRED,
} from "@/lib/api/legal";
import { verifyToken, LEGAL_REACCEPT_EVENT } from "@/lib/auth";

export default function LegalReAcceptModal() {
  const [show, setShow] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [is18Plus, setIs18Plus] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEvent = useCallback((e: CustomEvent<{ code: string }>) => {
    setCode(e.detail?.code ?? null);
    setShow(true);
    setError(null);
    setIs18Plus(false);
    setAcceptedTerms(false);
  }, []);

  useEffect(() => {
    const fn = (e: Event) => handleEvent(e as CustomEvent<{ code: string }>);
    window.addEventListener(LEGAL_REACCEPT_EVENT, fn);
    return () => window.removeEventListener(LEGAL_REACCEPT_EVENT, fn);
  }, [handleEvent]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (needAge && !is18Plus) {
      setError("Please confirm you are 18 or older.");
      return;
    }
    if (needLegal && !acceptedTerms) {
      setError("Please agree to the Terms & Conditions and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      await confirmAge();
      await acceptLegal("terms");
      await acceptLegal("privacy");
      await verifyToken();
      setShow(false);
      setCode(null);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const needAge = code === AGE_CONFIRM_REQUIRED || !code;
  const needLegal = code === LEGAL_REACCEPT_REQUIRED || !code;

  return (
    <div className="legal-reaccept-overlay">
      <div className="legal-reaccept-modal">
        <h2>Action required</h2>
        <p>
          {needAge && needLegal
            ? "You must confirm you are 18 or older and accept the current Terms & Conditions and Privacy Policy to continue."
            : needAge
            ? "You must confirm you are 18 or older to continue."
            : "You must accept the current Terms & Conditions and Privacy Policy to continue."}
        </p>
        <form onSubmit={onSubmit}>
          {needAge && (
            <label className="legal-reaccept-cb">
              <input
                type="checkbox"
                checked={is18Plus}
                onChange={(e) => setIs18Plus(e.target.checked)}
                disabled={loading}
              />
              <span>I confirm I am 18 or older</span>
            </label>
          )}
          {needLegal && (
            <label className="legal-reaccept-cb">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={loading}
              />
              <span>
                I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link>
                {" "}and <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
              </span>
            </label>
          )}
          {error && <p className="legal-reaccept-err">{error}</p>}
          <div className="legal-reaccept-actions">
            <button type="submit" disabled={loading || (needAge && !is18Plus) || (needLegal && !acceptedTerms)}>
              {loading ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .legal-reaccept-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
        }
        .legal-reaccept-modal {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
          max-width: 440px;
        }
        .legal-reaccept-modal h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          color: #fff;
        }
        .legal-reaccept-modal p {
          margin: 0 0 1.25rem;
          color: #b0b0b0;
          font-size: 0.95rem;
        }
        .legal-reaccept-cb {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 1rem;
          cursor: pointer;
          color: #e0e0e0;
        }
        .legal-reaccept-cb input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .legal-reaccept-cb a {
          color: var(--expert-accent);
          text-decoration: underline;
        }
        .legal-reaccept-err {
          color: #f87171;
          font-size: 0.9rem;
          margin-bottom: 1rem !important;
        }
        .legal-reaccept-actions button {
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          border: none;
          background: linear-gradient(125deg, var(--expert-accent-2), #ff8bbd);
          color: #0a0a12;
          font-weight: 600;
          cursor: pointer;
        }
        .legal-reaccept-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
