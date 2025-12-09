
"use client";
import React from "react";

export default function LoginErrorBoundary({ children }) {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const errorHandler = (event) => {
      setError(event.reason || event.error || 'Unknown error');
    };
    window.addEventListener('unhandledrejection', errorHandler);
    window.addEventListener('error', errorHandler);
    return () => {
      window.removeEventListener('unhandledrejection', errorHandler);
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32, color: '#c00', background: '#fee', borderRadius: 8, maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p>{error.toString()}</p>
        <a href="/login" style={{ color: '#0070f3', textDecoration: 'underline' }}>Try again</a>
      </div>
    );
  }
  return children;
}
