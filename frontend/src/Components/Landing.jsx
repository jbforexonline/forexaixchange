import React from "react";
import Link from "next/link";
import "./Styles/Landing.scss";

export default function Landing() {
  return (
    <div className="home">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <img src="/image/logo.png" alt="Forexaiexchange" />
            <p>Forexaiechange</p>
          </Link>
          <nav className="nav">
            <Link href="/register"><button className="btn register">Register</button></Link>
            <Link href="/login"><button className="btn signin">Sign In</button></Link>
          </nav>
        </div>
      </header>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-text">
          <h1>
            Best place buy and <span>sell crypto currency</span> asset
          </h1>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
          <div className="hero-buttons">
            <Link href="/register"><button>Register</button></Link>
            <button>Learn more</button>
          </div>
        </div>
        <div className="hero-img">
          <img src="/image/hero 1.png" alt="crypto" />
        </div>
      </section>

      {/* About Section */}
      <section className="about">
        <div className="chart">
          <img src="/image/about.jpg" alt="chart" />
        </div>
        <div className="about-text">
          <h2>Accelerate the world’s transition</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
          <button>More About Us</button>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="steps">
      <h6 className="steps-subtitle">Simple & Fast Guide</h6>
      <h2 className="steps-title">Easy Steps to Success</h2>
      <p className="steps-description">
        With a clear guide, you can start instantly. Follow the steps below to create your wallet,
        make payments, buy crypto or convert. Click the button to start instantly.
      </p>

      <div className="steps-cards">
        {/* Card 1 */}
        <div className="step-card">
          <div className="icon-circle">
            <i className="fa fa-wallet"></i>
          </div>
          <h3>Create Wallet</h3>
          <p>
            Create your crypto wallet for transactions. Secure, fast and easy to set up. Start your
            crypto journey instantly.
          </p>
          <button>Learn More</button>
        </div>

        {/* Card 2 */}
        <div className="step-card">
          <div className="icon-circle">
            <i className="fa fa-credit-card"></i>
          </div>
          <h3>Make Payment</h3>
          <p>
            Make fast and secure payments using any supported payment method. We support multiple
            gateways.
          </p>
          <button>Learn More</button>
        </div>

        {/* Card 3 */}
        <div className="step-card">
          <div className="icon-circle">
            <i className="fa fa-exchange-alt"></i>
          </div>
          <h3>Buy and or Sell</h3>
          <p>
            Buy or sell crypto easily at competitive rates. Exchange your assets anytime with full
            security.
          </p>
          <button>Learn More</button>
        </div>
      </div>
    </section>

      <section className="promo">
      <div className="promo-banner">
        <div className="promo-left">
          <h5 className="promo-kicker">Forexaiexchange</h5>
          <h2 className="promo-title">Low fees and deep liquidity</h2>
          <p className="promo-text">
            Learn to trade with the best prices. Our deep liquidity and low fees make it easy to enter and exit positions quickly.
          </p>
          <button className="promo-btn">Get Started</button>
        </div>

        <div className="promo-art">
          {/* Decorative 3D-ish coin + globe (SVG/CSS) */}
          <div className="coin-globe" aria-hidden="true">
            <svg className="globe" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="glow" x1="0" x2="1">
                  <stop offset="0" stopColor="#1fb6ff" />
                  <stop offset="1" stopColor="#0ea5a3" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="url(#glow)" opacity="0.95" />
              <g fill="rgba(255,255,255,0.12)">
                <path d="M10,60 a50,30 0 0,0 100,0" />
                <path d="M60,10 a30,50 0 0,1 0,100" />
                <path d="M20,30 a40,10 0 0,1 80,0" />
              </g>
            </svg>

            <div className="coin">
              <div className="coin-inner">$</div>
            </div>
          </div>
        </div>
      </div>

      {/* newsletter signup + form */}
 <div className="newsletter-wrap">
      <div className="newsletter-inner">
        <div className="newsletter-art" aria-hidden="true">
          {/* Decorative small globe on left */}
          {/* <svg viewBox="0 0 100 100" className="newsletter-globe" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="#0ea5a3" opacity="0.95" />
            <g opacity="0.12" fill="#fff">
              <path d="M10,50 a40,22 0 0,0 80,0" />
            </g>
          </svg> */}
        </div>

        <div className="newsletter-content">
          <h3>Sign up to learn more</h3>
          <p>Get updates, market news and curated offers — delivered weekly. No spam.</p>

          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email" required />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </div>
    </div>
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h4>Forexaiexchange</h4>
          <p>buy and sell. Secure crypto services built for everyone.</p>
          <div className="socials">
            <span className="dot">●</span>
            <span className="dot">●</span>
            <span className="dot">●</span>
          </div>
        </div>

        <div className="footer-col">
          <h5>Our Products</h5>
          <ul>
            <li>Demo</li>
            <li>buy and sell</li>
            <li>Red and Blue</li>
          </ul>
        </div>

        <div className="footer-col">
          <h5>Pages</h5>
          <ul>
            <li>Register</li>
            <li>Spin</li>
            <li>withdraw</li>
          </ul>
        </div>

        <div className="footer-col">
          <h5>Contact</h5>
          <ul>
            <li>forexaiexchange@gmail.com</li>
            <li>+250 782 444 243 </li>
            <li>Support Center</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Forexaiexchange — All rights reserved.</span>
      </div>
    </footer>
    </section>
    </div>
  );
}
