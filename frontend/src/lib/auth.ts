/**
 * Authentication utilities
 */

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/** localStorage key for last user activity (used for inactivity timeout) */
export const LAST_ACTIVITY_KEY = 'lastActivityAt';

/** Inactivity timeout: 10 minutes in ms. After this, user is logged out and sent to login. */
export const INACTIVITY_MS = 10 * 60 * 1000;

// Event name for legal compliance issues (age confirmation or terms re-acceptance required)
export const LEGAL_REACCEPT_EVENT = 'legal-reaccept-required';

// Helper to dispatch legal compliance event
export function dispatchLegalComplianceEvent(code: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEGAL_REACCEPT_EVENT, { detail: { code } }));
  }
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  username: string;
  role: string;
  [key: string]: any;
}

/**
 * Get last activity timestamp from localStorage
 */
export function getLastActivity(): number | null {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Update last activity timestamp (call on user interaction to prevent inactivity logout)
 */
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

/**
 * Clear all auth and session data then redirect to login with full page reload.
 * Use reason so the login page can show "session expired" or "you have been logged out".
 */
export function clearSessionAndRedirectToLogin(
  reason: 'logout' | 'session_expired' = 'session_expired'
): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  sessionStorage.clear();
  const params = new URLSearchParams();
  if (reason === 'session_expired') params.set('session_expired', '1');
  else if (reason === 'logout') params.set('logout', '1');
  const qs = params.toString();
  window.location.replace(qs ? `/login?${qs}` : '/login');
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  const user = getCurrentUser();
  return !!(token && user?.id);
}

/**
 * Verify token with backend
 */
export const verifyToken = async (): Promise<boolean> => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const user = (data.data || data).user || (data.data || data);
    
    if (user?.id) {
      // Update user data in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Logout - Clear all auth data and redirect to login (full reload).
 * Login page will show "You have been logged out" via ?logout=1
 */
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  sessionStorage.clear();
  window.location.replace('/login?logout=1');
}

/**
 * Check if user has specific role
 */
export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return (user.role || 'USER').toUpperCase() === role.toUpperCase();
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  const role = (user.role || 'USER').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}


