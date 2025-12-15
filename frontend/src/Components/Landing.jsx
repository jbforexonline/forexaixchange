"use client";
import React, { useRef, useEffect } from "react";
import Link from "next/link";
import SpinWheel from "../Components/Spin/SpinWheel";
import "./Styles/Landing.scss";

export default function Landing() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start muted for autoplay compatibility, then unmute
    video.muted = true;
    video.preload = 'auto';

    // Ensure video plays continuously without interruption
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    const handlePause = () => {
      // Immediately resume if paused
      video.play().catch(() => {});
    };

    const handleWaiting = () => {
      // If video is buffering, try to play immediately
      video.play().catch(() => {});
    };

    const handlePlaying = () => {
      // Once playing, unmute for sound
      if (video.muted) {
        video.muted = false;
      }
    };

    const handleCanPlay = () => {
      // Ensure it's playing when ready
      video.play().catch(() => {});
    };

    // Set up event listeners
    video.addEventListener('ended', handleEnded);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', () => {
      // Keep playing if somehow paused
      if (video.paused) {
        video.play().catch(() => {});
      }
    });

    // Pause video when the document is hidden (user switches tab or navigates away)
    const handleVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else {
        // Attempt to resume when coming back to the tab
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Start playing immediately
    const playVideo = () => {
      video.play().then(() => {
        // Successfully playing, unmute
        video.muted = false;
      }).catch(() => {
        // If autoplay fails, try again on user interaction
        const tryPlay = () => {
          video.play().then(() => {
            video.muted = false;
          }).catch(() => {});
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('touchstart', tryPlay);
        };
        document.addEventListener('click', tryPlay, { once: true });
        document.addEventListener('touchstart', tryPlay, { once: true });
      });
    };

    // Try to play immediately
    playVideo();

    // Also try when video metadata is loaded
    if (video.readyState >= 2) {
      playVideo();
    }

    // Cleanup
    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Ensure the video is paused and rewound when leaving the page
      try {
        video.pause();
        video.currentTime = 0;
      } catch (e) {
        // ignore if video already destroyed
      }
    };
  }, []);

  return (
    <div className="home">
      {/* HEADER */}
      <header className="site-header">
        <div className="header-inner">
          <Link href="/login" className="logo">
            <img src="/image/logo.png" alt="Forexaiexchange" />
            <p>Forexaiexchange</p>
          </Link>

          <nav className="nav">
            <Link href="/login">
              <button className="btn signin">Buy and Sell</button>
            </Link>
           <Link href="/login">
              <button className="btn signin">Account Balance</button>
            </Link>
              <Link href="/login">
              <button className="btn signin">Notification</button>
            </Link>
            <Link href="/register">
              <button className="btn register">Register/sign in</button>
            </Link>
            <Link href="/login">
              <button className="btn signin">Language</button>
            </Link>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT with Spinner */}
      <main className="main-content">
        {/* VIDEO BACKGROUND - Only in main content area, behind spinner */}
        <div
          className="video-background"
          onClick={() => {
            const v = videoRef.current;
            if (v) v.play().catch(() => {});
          }}
          role="button"
          aria-label="Play background video"
        >
          <video
            ref={videoRef}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
          >
            <source src="/image/heroo.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="main-grid">
          <section className="premium-card">
            <h1>Forexaiexchange Premium</h1>
            <ul>
              <li>✅ Verification Badge</li>
              <li>✅ Internal Transfers between users</li>
              <li>✅ Flexible Spin Timing & Auto-Press Orders</li>
              <li>✅ High Order Limits (up to $200 per order)</li>
              <li>✅ Unlimited Withdrawals</li>
              <li>✅ Members’ Chart Room Access & VIP support</li>
              <li>✅ No limits on daily withdraw (basic daily withdraw is $1000)</li>
              <li>✅ Access to all crypto and stock spins</li>
              <li>✅ Free ads account upon yearly subscription</li>
              <li>✅ Early access to new features and promotions</li>
            </ul>
            <Link href="/login">
              <button className="btn register" style={{ marginTop: '12px', width: '100%' }}>
                Upgrade to Premium
              </button>
            </Link>
          </section>

          <div className="spinner-container">
            <SpinWheel
              state="open"
              countdownSec={30}
              winners={undefined}
            />
          </div>

          <section className="strategy-table">
            <h2>Place Order</h2>
            <h2>Balance: $1000</h2>
            <table>
              <thead>
                <tr>
                  <th>
                    <Link href="/login" className="cell-link">
                      <button type="button">Buy (*2) order</button>
                    </Link>
                  </th>
                  <th>
                    <Link href="/login" className="cell-link">
                      <button type="button">Sell (*2) order</button>
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Link href="/login" className="cell-link">
                      <button type="button">Blue (*2) stock</button>
                    </Link>
                  </td>
                  <td>
                    <Link href="/login" className="cell-link">
                      <button type="button">Red (*2) order</button>
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Link href="/login" className="cell-link">
                      <button type="button">High Volatility order</button>
                    </Link>
                  </td>
                  <td>
                    <Link href="/login" className="cell-link">
                      <button type="button">Low Volatility order</button>
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td colSpan="2" className="indecision">
                    <Link href="/login" className="cell-link full">
                      <button type="button">Indecision Area</button>
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="cta-buttons">
              <div className="order-entry">
                <input type="number" min="0" step="1" placeholder="Enter amount" />
                <Link href="/login">
                  <button type="button" className="primary">Place Order</button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-inner">

          <div className="footer-brand">
            <h4>Forexaiexchange</h4>
            <p>Buy and sell. Secure crypto services built for everyone.</p>
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
              <li>Buy & Sell</li>
              <li>Red and Blue</li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Pages</h5>
            <ul>
              <li>Register</li>
              <li>Spin</li>
              <li>Withdraw</li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Contact</h5>
            <ul>
              <li>forexaiexchange@gmail.com</li>
              <li>+250 782 444 243</li>
              <li>Support Center</li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Forexaiexchange — All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}