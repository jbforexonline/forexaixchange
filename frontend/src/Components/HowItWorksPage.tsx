"use client";

import Link from "next/link";
import "./Styles/HowItWorks.scss";

export default function HowItWorksPage() {
  return (
    <div className="howitworks-page">
      <header className="howitworks-hero">
        <div className="howitworks-hero-inner">
          <p className="howitworks-motto">ForexAiXchange — Where Market Trading Meets AI</p>
          <h1>How the ForexAiXchange Spin Gamification Works</h1>
          <p className="howitworks-lead">
            ForexAiXchange is a spin-based forex gamification platform. You place structured
            predictions on how a forex spin will behave across three betting pairs — Buy/Sell,
            Blue/Red, High/Low Volatility — plus an Indecision option when you expect the market
            to show no clear direction.
          </p>
          <div className="howitworks-hero-cta">
            <Link href="/login">
              <button className="btn primary">Try the Platform</button>
            </Link>
            <Link href="/register">
              <button className="btn ghost">Create Account</button>
            </Link>
          </div>
        </div>
      </header>

      <main className="howitworks-main">
        <section className="howitworks-grid">
          <article className="howitworks-card">
            <h2>Spin-based forex game, not risk-free trading</h2>
            <p>
              ForexAiXchange is designed as a <strong>forex game</strong> and{" "}
              <strong>forex spin</strong> experience. Each spin behaves like a structured
              prediction game on top of live or simulated forex pair movement — it is not
              marketed as risk-free trading or guaranteed profit.
            </p>
            <p>
              You use clear betting pairs and transparent rules so that you always know what
              you are predicting in each <strong>forex spin</strong>.
            </p>
          </article>

          <article className="howitworks-card">
            <h2>Three betting pairs + Indecision</h2>
            <ul className="howitworks-list">
              <li>
                <strong>Buy / Sell</strong> – you choose whether the selected forex pair ends
                the spin higher (Buy) or lower (Sell) than it started.
              </li>
              <li>
                <strong>Blue / Red</strong> – you pick which color zone the outcome lands in on
                the spin interface: <strong>blue and red</strong> represent different outcome
                regions for that spin.
              </li>
              <li>
                <strong>High Volatile / Low Volatile</strong> – you decide whether the spin
                will behave with high volatile or low volatile movement for the pair.
              </li>
              <li>
                <strong>Indecision</strong> – an extra option that wins when both sides of a
                pair effectively tie or when there is no meaningful move (for example, 0–0 or
                a balanced result).
              </li>
            </ul>
            <p>
              You can focus on one pair or combine several predictions depending on how you
              want to engage with the <strong>forex game</strong>.
            </p>
          </article>

          <article className="howitworks-card">
            <h2>Rounds, timers and freeze period</h2>
            <p>
              Each forex spin is organized into a visible timer window. While the timer counts
              down, you can place or adjust predictions across Buy/Sell, Blue/Red, and
              High/Low Volatility, plus Indecision.
            </p>
            <p>
              As the timer reaches the configured cut-off, the system enters a{" "}
              <strong>freeze period</strong>. During freeze:
            </p>
            <ul className="howitworks-list">
              <li>New orders are blocked for that spin.</li>
              <li>Existing orders are locked in and cannot be changed.</li>
              <li>The spin result is calculated and displayed on the wheel.</li>
            </ul>
            <p>
              Once the outcome is final, it flows into your visible <strong>spin history</strong>{" "}
              so you can see how recent spins behaved for each forex pair market.
            </p>
          </article>

          <article className="howitworks-card">
            <h2>AI market insights and suggestions</h2>
            <p>
              ForexAiXchange can surface <strong>forex ai</strong> style features in the form of
              market insights and suggestions, such as highlighting volatility patterns or
              showing how recent forex spins behaved.
            </p>
            <p>
              These AI components are designed as <strong>assistive tools</strong> — they do not
              guarantee outcomes or place orders for you. Your predictions remain your own
              choices, based on how you want to play the <strong>forex spin</strong> game.
            </p>
          </article>

          <article className="howitworks-card faq-card">
            <h2>FAQ</h2>
            <div className="faq-item">
              <h3>Is ForexAiXchange a trading platform or a game?</h3>
              <p>
                ForexAiXchange is a spin-based <strong>forex gamification</strong> experience.
                It uses real market concepts like buy and sell, volatility and color zones to
                build a structured game around each forex spin.
              </p>
            </div>
            <div className="faq-item">
              <h3>How do payouts work for winning predictions?</h3>
              <p>
                For each betting pair, the platform looks at the results for each side of the spin.
                The system gives out the winning sides for that forex spin, and if what you chose
                wins, you generally receive around x2 of your stake, subject to live rules and
                limits configured by the platform.
              </p>
            </div>
            <div className="faq-item">
              <h3>When does Indecision win?</h3>
              <p>
                Indecision is built for spins where there is effectively no clear direction —
                for example a tie between both sides of a pair or a 0–0 style outcome. If those
                rules are met, the Indecision option can win that forex spin.
              </p>
            </div>
            <div className="faq-item">
              <h3>What role does AI play?</h3>
              <p>
                AI is used for <strong>market insights and suggestions</strong>, such as showing
                how volatile recent rounds have been or surfacing trends. It does not promise
                guaranteed predictions and does not replace your own decisions.
              </p>
            </div>
            <div className="faq-item">
              <h3>Do I need an account to try the platform?</h3>
              <p>
                You can explore parts of the experience from the landing page, but to fully
                engage with orders and history you should{" "}
                <Link href="/register">create a ForexAiXchange account</Link> and then{" "}
                <Link href="/login">log in</Link>.
              </p>
            </div>
          </article>
        </section>

        <section className="howitworks-bottom-cta">
          <h2>Ready to explore the next forex spin?</h2>
          <p>
            Login to try the platform or create a new account and start placing predictions on
            Buy/Sell, Blue/Red, High/Low Volatility and Indecision in your next forex spin.
          </p>
          <div className="howitworks-hero-cta">
            <Link href="/login">
              <button className="btn primary">Try the Platform</button>
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

