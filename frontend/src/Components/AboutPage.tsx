"use client";

import Link from "next/link";
import BackToLanding from "@/Components/Common/BackToLanding";
import "./Styles/About.scss";

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-hero">
        <div className="about-hero-inner">
          <BackToLanding />
          <p className="about-motto">ForexAiXchange — Where Market Trading Meets AI</p>
          <h1>About, Mission and Vision of ForexAiXchange</h1>
        </div>
      </header>

      <main className="about-main">
        <section className="about-grid">
          {/* About forexaiexchange */}
          <article className="about-card about-intro">
            <h2>About ForexAiXchange</h2>
            <p>
              ForexAiXchange is an innovative platform where the world of Forex meets the thrill of
              AI-powered gaming. We transform real market data into a unique spin-based prediction
              experience, making trading fun, interactive, and rewarding.
            </p>
          </article>

          {/* Our Mission */}
          <article className="about-card">
            <h2>Our Mission</h2>
            <p>
              Our mission is to give everyone — from beginners to market pros — a chance to
              experience Forex in a simple, fun, and skill-based way. We aim to combine the
              excitement of prediction with the intelligence of AI.
            </p>
          </article>

          {/* What Makes Us Different */}
          <article className="about-card about-different">
            <h2>What Makes Us Different</h2>
            <ul className="about-list about-list-bullets">
              <li>
                <strong>AI-Powered Spins</strong> → Outcomes inspired by market data & predictive
                models.
              </li>
              <li>
                <strong>Fair & Transparent</strong> → Secure system, results logged and visible.
              </li>
              <li>
                <strong>Premium Features</strong> → Auto-orders, chartroom access, higher withdrawal
                limits.
              </li>
              <li>
                <strong>Affiliate Program</strong> → Earn rewards when your friends play & withdraw.
              </li>
              <li>
                <strong>Community First</strong> → Chartroom, discussions, and shared predictions.
              </li>
            </ul>
          </article>

          {/* Our Vision */}
          <article className="about-card">
            <h2>Our Vision</h2>
            <p>
              ForexAiXchange is just the beginning. We plan to expand with crypto and stock spins,
              mobile apps, and international payment options — making financial prediction gaming
              available to everyone, everywhere.
            </p>
          </article>

          {/* Our Dignity and Values */}
          <article className="about-card about-values">
            <h2>Our Dignity and Values</h2>
            <ol className="about-list about-list-numbered">
              <li>
                <strong>Integrity</strong>
                <p>
                  We commit to fairness and transparency in all activities. Spin outcomes, payments,
                  and affiliate rewards are processed with honesty and accuracy.
                </p>
              </li>
              <li>
                <strong>Innovation</strong>
                <p>
                  We combine AI technology with Forex data to create new experiences that are both
                  entertaining and intelligent.
                </p>
              </li>
              <li>
                <strong>Trust & Security</strong>
                <p>
                  User data, funds, and transactions are protected with industry grade security.
                  Your confidence in us is our top priority.
                </p>
              </li>
              <li>
                <strong>Community First</strong>
                <p>
                  We believe in building a strong community. Chartrooms, predictions, and shared
                  discussions create a space where everyone learns and grows together.
                </p>
              </li>
              <li>
                <strong>Opportunity for All</strong>
                <p>
                  ForexAiXchange is built to be inclusive. Whether you're a beginner exploring Forex
                  or a professional seeking a new edge, the platform gives equal opportunity to enjoy
                  and win.
                </p>
              </li>
            </ol>
          </article>
        </section>

        {/* Call to action */}
        <section className="about-cta">
          <h2>Join ForexAiXchange Today</h2>
          <p>
            Spin your skills, predict with AI, and be part of the future of Forex entertainment.
          </p>
          <div className="about-hero-cta">
            <Link href="/register">
              <button className="btn primary">Create Account</button>
            </Link>
            <Link href="/login">
              <button className="btn ghost">Log In</button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
