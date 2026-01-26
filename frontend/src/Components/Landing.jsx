"use client";
import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import SpinWheel from "../Components/Spin/SpinWheel";
import Historigram from "./Historigram";
import TradingViewWidget from "./TradingViewWidget";
import { useRound } from "@/hooks/useRound";
import "./Styles/Landing.scss";

export default function Landing() {
  const videoRef = useRef(null);
  const [premiumSlideIndex, setPremiumSlideIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const carouselIntervalRef = useRef(null);
  
  // Use the same round hook as the logged-in version for synchronization
  const { round, state: roundState, countdown, loading, error } = useRound();
  const premiumFeatures = [
    "✅ Verification Badge",
    "✅ Internal Transfers between users",
    "✅ Flexible Spin Timing & Auto-Press Orders",
    "✅ High Order Limits (up to $200 per order)",
    "✅ Unlimited Withdrawals",
    "✅ Members' Chart Room Access & VIP support",
    "✅ No limits on daily withdraw (basic daily withdraw is $1000)",
    "✅ Access to all crypto and stock spins",
    "✅ Free ads account upon yearly subscription",
    "✅ Early access to new features and promotions"
  ];
  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(premiumFeatures.length / itemsPerSlide);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Keep video muted permanently
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
      // Keep video muted - no sound
      video.muted = true;
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

    // Start playing immediately (muted)
    const playVideo = () => {
      video.play().then(() => {
        // Keep muted
        video.muted = true;
      }).catch(() => {
        // If autoplay fails, try again on user interaction
        const tryPlay = () => {
          video.play().then(() => {
            video.muted = true;
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

  // Premium features carousel auto-rotate (15 seconds per slide)
  useEffect(() => {
    if (isCarouselPaused) {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
        carouselIntervalRef.current = null;
      }
      return;
    }

    carouselIntervalRef.current = setInterval(() => {
      setPremiumSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 15000); // 15 seconds per slide

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
        carouselIntervalRef.current = null;
      }
    };
  }, [totalSlides, isCarouselPaused]);

  const goToSlide = (index) => {
    // Pause carousel when user interacts
    setIsCarouselPaused(true);
    
    // Resume after 20 seconds of inactivity
    setTimeout(() => {
      setIsCarouselPaused(false);
    }, 20000);

    if (index < 0) {
      setPremiumSlideIndex(totalSlides - 1);
    } else if (index >= totalSlides) {
      setPremiumSlideIndex(0);
    } else {
      setPremiumSlideIndex(index);
    }
  };

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
              <button className="btn signin">Demo/Live Account</button>
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

        {/* TradingView Widget - Live Market Data - Attached to header */}
        <section className="tradingview-section">
          <TradingViewWidget />
        </section>

        <div className="main-grid">
          {/* Left Column: Premium Card with Carousel */}
          <section className="premium-card">
            <h1>Forexaiexchange Premium</h1>
            <div className="premium-carousel">
              <button 
                className="carousel-arrow carousel-prev" 
                aria-label="Previous features"
                onClick={() => goToSlide(premiumSlideIndex - 1)}
              >
                ←
              </button>
              <div className="premium-features-wrapper">
                <ul className="premium-features-list" style={{ transform: `translateY(-${premiumSlideIndex * (itemsPerSlide * 34)}px)` }}>
                  {premiumFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
              <button 
                className="carousel-arrow carousel-next" 
                aria-label="Next features"
                onClick={() => goToSlide(premiumSlideIndex + 1)}
              >
                →
              </button>
            </div>
            <Link href="/login">
              <button className="btn register" style={{ marginTop: '12px', width: '100%' }}>
                Upgrade to Premium
              </button>
            </Link>
          </section>

          {/* History Table - Below premium features, beside spin */}
          <section className="history-section">
            <Historigram title="Trading History" showChartOnly={false} showHistoryOnly={true} />
          </section>

          {/* Center: Spin Wheel */}
          <div className="spinner-area">
            <div className="spinner-container">
              <SpinWheel
                state={roundState}
                countdownSec={countdown}
                winners={undefined}
                roundDurationMin={20}
              />
            </div>
          </div>

          {/* Right: Graph beside spin */}
          <div className="graph-area">
            <Historigram title="Analytics" showChartOnly={true} />
          </div>

          {/* Place Order Section - Under Analytics */}
          <section className="strategy-table order-section">
            <table>
              <thead>
                <tr>
                  <th>
                    <Link href="/login" className="cell-link">
                      <button type="button">Buy (x2) order</button>
                    </Link>
                  </th>
                  <th>
                    <Link href="/login" className="cell-link">
                      <button type="button">Sell (x2) order</button>
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Link href="/login" className="cell-link">
                      <button type="button">Blue (x2) order</button>
                    </Link>
                  </td>
                  <td>
                    <Link href="/login" className="cell-link">
                      <button type="button">Red (x2) order</button>
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
                      <button type="button">Indecision </button>
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
            <p className="tagline-text">Forexaiexchange where market-trading meet with ai.</p>
            <p className="warning-text">⚠️ WARNING: Trading forex and related services is Risky.</p>
            <p className="age-restriction">🔞 18+</p>
            <div className="socials">
              <span className="dot">●</span>
              <span className="dot">●</span>
              <span className="dot">●</span>
            </div>
          </div>

          <div className="footer-col">
            <h5>Our Products</h5>
            <ul>
              <li><Link href="/register">Demo</Link></li>
              <li><Link href="/register">Buy & Sell</Link></li>
              <li><Link href="/register">Red and Blue</Link></li>
              <li><Link href="/register">High Volatile and Low Volatile</Link></li>
              <li><Link href="/register">Indecision</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Pages</h5>
            <ul>
              <li><Link href="/register">Register</Link></li>
              <li><Link href="/register">Spin</Link></li>
              <li><Link href="/register">Withdraw</Link></li>
              <li><Link href="/register">Deposit</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Contact</h5>
            <ul>
              <li><Link href="/register">forexaiexchange@gmail.com</Link></li>
              <li><Link href="/register">+250 782 444 243</Link></li>
              <li><Link href="/register">Support Center</Link></li>
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