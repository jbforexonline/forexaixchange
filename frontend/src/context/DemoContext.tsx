"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoContextType {
  isDemo: boolean;
  toggleDemo: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const stored = localStorage.getItem('isDemo');
      if (stored) {
        setIsDemo(stored === 'true');
      }
    } catch {
      // Ignore storage errors and fall back to default
    }
  }, []);

  const toggleDemo = () => {
    const newValue = !isDemo;
    setIsDemo(newValue);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('isDemo', String(newValue));
        // Trigger a window event for non-react listeners if any
        window.dispatchEvent(new Event('demo-mode-changed'));
      }
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <DemoContext.Provider value={{ isDemo, toggleDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
