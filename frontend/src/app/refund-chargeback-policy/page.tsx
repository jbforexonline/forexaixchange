"use client";

import BackToLanding from "@/Components/Common/BackToLanding";

const sections = [
  {
    title: "Refund & Chargeback Policy",
    paragraphs: [
      "This Refund and Chargeback Policy outlines the conditions under which payments made to ForexAIExchange may be refunded.",
      "ForexAIExchange provides digital financial technology services, including AI-powered forex market insights, educational tools, and analytics. Due to the nature of digital services, refunds are limited.",
    ],
  },
  {
    title: "Digital Service Payments",
    bullets: [
      "Platform access",
      "Subscription services",
      "AI-powered market analysis tools",
      "Educational trading resources",
    ],
  },
  {
    title: "Refund Eligibility",
    paragraphs: [
      "Refund requests must be submitted within 7 days of the transaction date.",
    ],
    bullets: [
      "Duplicate payment",
      "Technical billing error",
      "Service not delivered due to system malfunction",
      "Unauthorized payment reported promptly",
    ],
  },
  {
    title: "Non-Refundable Situations",
    bullets: [
      "Trading losses",
      "Change of mind",
      "Misunderstanding of service",
      "Violation of platform terms",
    ],
  },
  {
    title: "Chargeback Policy",
    paragraphs: [
      "Users should contact support before initiating a chargeback with their payment details for refund.",
      "Improper chargebacks may result in account suspension or termination.",
    ],
  },
  {
    title: "Anti-Money Laundering (AML) Policy",
    paragraphs: [
      "Commitment",
      "ForexAIExchange is committed to preventing financial crimes including money laundering, fraud, and illegal financial activity.",
      "Platform Nature",
    ],
    bullets: [
      "AI-powered forex insights",
      "Market analysis tools",
      "Educational resources",
    ],
    trailingParagraphs: [
      "ForexAIExchange does not act as a broker and does not execute trades for users.",
      "Non-Custodial Model",
      "ForexAIExchange does not hold or manage client trading funds.",
      "Payments are only for software services, platform subscriptions, and analytical tools.",
      "Monitoring",
      "The platform may monitor transactions to detect suspicious activity including:",
    ],
    trailingBullets: [
      "unusual payment patterns",
      "multiple linked accounts",
      "fraudulent payment methods",
    ],
  },
  {
    title: "Prohibited Activities",
    bullets: [
      "money laundering",
      "terrorist financing",
      "fraud",
      "identity theft",
      "stolen payment methods",
    ],
  },
  {
    title: "Risk & Fraud Prevention Policy",
    paragraphs: [
      "Security Commitment",
      "ForexAIExchange prioritizes the security of user accounts and payment systems.",
      "Fraud Detection",
      "Measures include:",
    ],
    bullets: [
      "payment verification",
      "fraud monitoring systems",
      "login activity tracking",
      "account behavior analysis",
    ],
    trailingParagraphs: [
      "User Responsibility",
      "Users must protect their login credentials and report suspicious activity immediately.",
      "Abuse Prevention",
      "Accounts may be suspended for:",
    ],
    trailingBullets: [
      "payment fraud attempts",
      "chargeback abuse",
      "fake accounts",
      "unauthorized platform usage",
    ],
  },
];

export default function RefundChargebackPolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <BackToLanding />
        <h1>Refund &amp; Chargeback Policy</h1>
        {sections.map((section) => (
          <section key={section.title} className="policy-section">
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.trailingParagraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.trailingBullets && (
              <ul>
                {section.trailingBullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          padding: 2rem;
          max-width: 720px;
          margin: 0 auto;
        }
        .legal-inner nav {
          margin-bottom: 1.5rem;
        }
        .legal-inner nav a {
          color: var(--expert-accent);
        }
        .policy-section {
          margin-top: 1.75rem;
        }
        .policy-section h2 {
          font-size: 1.2rem;
          margin: 0 0 0.75rem;
        }
        .policy-section p {
          margin: 0.5rem 0;
        }
        .policy-section ul {
          margin: 0.5rem 0 1rem 1.5rem;
        }
      `}</style>
    </div>
  );
}
