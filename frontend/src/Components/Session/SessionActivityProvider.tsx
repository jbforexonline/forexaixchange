"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  isAuthenticated,
  updateLastActivity,
  getLastActivity,
  clearSessionAndRedirectToLogin,
  INACTIVITY_MS,
} from "@/lib/auth";

/** Throttle: update lastActivity at most every 30 seconds on activity */
const ACTIVITY_THROTTLE_MS = 30 * 1000;
/** Check for inactivity every 60 seconds */
const CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Tracks user activity and logs out after INACTIVITY_MS (10 min) of no activity.
 * Uses full page redirect so the app state is cleared and user must sign in again.
 * Only runs when the user is authenticated; public pages (login, register, etc.) are ignored.
 */
export default function SessionActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const lastSavedAt = useRef<number>(0);

  const throttledUpdateActivity = useCallback(() => {
    if (!isAuthenticated()) return;
    const now = Date.now();
    if (now - lastSavedAt.current < ACTIVITY_THROTTLE_MS) return;
    lastSavedAt.current = now;
    updateLastActivity();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const publicPaths = [
      "/login",
      "/register",
      "/forgetpassword",
      "/auth/callback",
      "/terms",
      "/privacy",
      "/maintenance",
      "/how-it-works",
    ];
    const isPublic = publicPaths.some((p) => pathname?.startsWith(p));
    if (isPublic) return;

    if (!isAuthenticated()) return;

    // Set last activity on mount when authenticated (e.g. after login or when returning to app)
    updateLastActivity();
    lastSavedAt.current = Date.now();

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    events.forEach((ev) => window.addEventListener(ev, throttledUpdateActivity));

    const interval = setInterval(() => {
      if (!isAuthenticated()) return;
      const last = getLastActivity();
      const now = Date.now();
      if (last != null && now - last >= INACTIVITY_MS) {
        clearSessionAndRedirectToLogin("session_expired");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((ev) =>
        window.removeEventListener(ev, throttledUpdateActivity)
      );
      clearInterval(interval);
    };
  }, [pathname, throttledUpdateActivity]);

  return <>{children}</>;
}
