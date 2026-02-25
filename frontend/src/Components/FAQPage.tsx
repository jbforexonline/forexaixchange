"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackToLanding from "@/Components/Common/BackToLanding";
import "./Styles/FAQ.scss";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
}

function groupByCategory(items: FaqItem[]): Record<string, FaqItem[]> {
  const groups: Record<string, FaqItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export default function FAQPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/faq`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setItems(list);
      })
      .catch(() => setError("Failed to load FAQ"))
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByCategory(items);
  const categories = Object.keys(groups).sort();

  return (
    <div className="faq-page">
      <header className="faq-hero">
        <div className="faq-hero-inner">
          <BackToLanding />
          <p className="faq-motto">ForexAiXchange — Where Market Trading Meets AI</p>
          <h1>ForexAiXchange – FAQ</h1>
        </div>
      </header>

      <main className="faq-main">
        {loading && (
          <div className="faq-loading">
            <div className="faq-spinner" />
            <p>Loading FAQ...</p>
          </div>
        )}
        {error && (
          <div className="faq-error">
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && categories.length === 0 && (
          <div className="faq-empty">
            <p>No FAQ items yet. Check back later.</p>
          </div>
        )}
        {!loading && !error && categories.length > 0 && (
          <div className="faq-sections">
            {categories.map((category) => (
              <section key={category} className="faq-section">
                <h2 className="faq-section-title">{category}</h2>
                <div className="faq-accordion">
                  {groups[category].map((item) => {
                    const isOpen = openId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`faq-item ${isOpen ? "open" : ""}`}
                      >
                        <button
                          type="button"
                          className="faq-question"
                          onClick={() => setOpenId(isOpen ? null : item.id)}
                          aria-expanded={isOpen}
                        >
                          <span>{item.question}</span>
                          <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                        </button>
                        {isOpen && (
                          <div className="faq-answer">
                            <div
                              className="faq-answer-inner"
                              dangerouslySetInnerHTML={{
                                __html: item.answer.replace(/\n/g, "<br />"),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <section className="faq-cta">
          <p>Can&apos;t find your answer?</p>
          <div className="faq-cta-buttons">
            <Link href="/login">
              <button className="btn primary">Log In</button>
            </Link>
            <Link href="/register">
              <button className="btn ghost">Create Account</button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
