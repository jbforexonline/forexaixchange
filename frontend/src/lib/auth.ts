/**
 * Authentication utilities
 */

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

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
 * Logout - Clear all auth data and redirect to login
 */
export function logout(): void {
  if (typeof window === 'undefined') return;

  // Clear all auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();

  // Clear any cached data
  // Force reload to clear any cached state
  window.location.href = '/login';
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


