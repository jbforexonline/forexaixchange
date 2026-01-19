import { verifyToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// Create headers with auth token
function getHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// API response handler
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  amountPaid: number;
  isSimulated: boolean;
  plan: PremiumPlan;
}

/**
 * Get all available premium plans
 */
export async function getPremiumPlans() {
  const response = await fetch(`${API_URL}/premium/plans`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Simulate premium subscription (testing - no payment required)
 */
export async function simulateSubscription(planId: string) {
  const response = await fetch(`${API_URL}/premium/simulate/${planId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Subscribe to premium plan (requires wallet funds)
 */
export async function subscribeToPlan(planId: string) {
  const response = await fetch(`${API_URL}/premium/subscribe/${planId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Upgrade or change current subscription plan
 */
export async function upgradeSubscription(planId: string) {
  const response = await fetch(`${API_URL}/premium/change/${planId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Get active subscription
 */
export async function getActiveSubscription() {
  const response = await fetch(`${API_URL}/premium/subscription`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Backward-compat shim used by useUserData hook.
 * Maps to the active subscription endpoint.
 */
export async function getUserSubscription() {
  return getActiveSubscription();
}

/**
 * Cancel active subscription
 */
export async function cancelSubscription() {
  const response = await fetch(`${API_URL}/premium/subscription`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Refresh user data from backend to get latest premium status
 */
export async function refreshUserData() {
  try {
    // Use the existing verifyToken function which fetches and updates user data
    await verifyToken();
    return true;
  } catch (err) {
    console.error('Failed to refresh user data:', err);
    return false;
  }
}
