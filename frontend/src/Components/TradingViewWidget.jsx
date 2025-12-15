"use client";

import React, { useEffect, useRef, memo } from 'react';
import "../Components/Styles/Trading.scss";

function TradingViewWidget() {
  // refs for original container and its clone and track
  const containerRef = useRef(null);
  const cloneRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const clone = cloneRef.current;
    const track = trackRef.current;
    if (!container || !clone || !track) return;

    // Avoid adding the script multiple times
    if (container.querySelector('script[data-tv-widget]')) return;

    const script = document.createElement("script");
    script.setAttribute('data-tv-widget', 'true');
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-tickers.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify({
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500 Index" },
        { proName: "FOREXCOM:NSXUSD", title: "US 100 Cash CFD" },
        { proName: "FX_IDC:EURUSD", title: "EUR to USD" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" }
      ],
      colorTheme: "dark",
      locale: "en",
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true
    });

    container.appendChild(script);

    // When TradingView injects content into the container, clone its HTML into the clone element
    const observer = new MutationObserver((mutations, obs) => {
      if (container.children.length > 0) {
        try {
          clone.innerHTML = container.innerHTML;
        } catch (e) {
          // ignore clone errors
        }
        obs.disconnect();
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    const onResize = () => {
      try { clone.innerHTML = container.innerHTML; } catch (e) {}
    };

    window.addEventListener('resize', onResize);

    return () => {
      const existing = container.querySelector('script[data-tv-widget]');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      try { observer.disconnect(); } catch (e) {}
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="tradingview-wrapper">
      <div className="tradingview-track" ref={trackRef}>
        <div className="tradingview-item" ref={containerRef}></div>
        <div className="tradingview-item tradingview-clone" ref={cloneRef} aria-hidden="true"></div>
      </div>
      <div className="tradingview-caption">
        <a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank">

        </a>
    
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);