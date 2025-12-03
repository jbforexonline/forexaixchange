/**
 * Premium API Client
 * Handles premium subscription management and features
 */

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export interface PremiumPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  features: string[];
  maxAutoSpins: number;
  maxOrderLimit: number;
  maxDailyWithdrawal: number;
  minSpinCycle: number;
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan: PremiumPlan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  price: number;
  nextBillingDate?: string;
  cancellationDate?: string;
}

export interface PremiumFeatures {
  verificationBadge: boolean;
  internalTransfers: boolean;
  flexibleSpinTiming: boolean;
  autoSpinOrders: boolean;
  highOrderLimits: boolean;
  unlimitedWithdrawals: boolean;
  chartRoomAccess: boolean;
  maxAutoSpinsAllowed: number;
  maxOrderLimitAmount: number;
  maxDailyWithdrawals: number;
  minSpinCycleDuration: number;
}

export async function getAvailablePlans(): Promise<PremiumPlan[]> {
  const response = await fetch(`${API_URL}/premium/plans`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getPlanDetails(planId: string): Promise<PremiumPlan> {
  const response = await fetch(`${API_URL}/premium/plans/${planId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function subscribeToPlan(planId: string): Promise<UserSubscription> {
  const response = await fetch(`${API_URL}/premium/subscribe/${planId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getUserSubscription(): Promise<UserSubscription | null> {
  const response = await fetch(`${API_URL}/premium/subscription`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getPremiumFeatures(): Promise<PremiumFeatures> {
  const response = await fetch(`${API_URL}/premium/features`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function cancelSubscription(reason?: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/premium/subscription/cancel`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
}

export async function updateAutoRenewal(autoRenew: boolean): Promise<UserSubscription> {
  const response = await fetch(`${API_URL}/premium/subscription/auto-renew`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ autoRenew }),
  });
  return handleResponse(response);
}

export async function getSubscriptionHistory(page = 1, limit = 10): Promise<{
  data: UserSubscription[];
  meta: any;
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await fetch(`${API_URL}/premium/history?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getUpgradeOptions(): Promise<PremiumPlan[]> {
  const response = await fetch(`${API_URL}/premium/upgrade-options`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}
