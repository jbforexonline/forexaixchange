/**
 * Affiliate API Client
 * Handles affiliate program, referrals, commissions, and leaderboards
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

export interface Referral {
  id: string;
  referralCode: string;
  referredUserId: string;
  referredUsername: string;
  referredEmail?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  totalDeposits: number;
  commissionEarned: number;
  createdAt: string;
}

export interface CommissionTier {
  id: string;
  tier: number;
  dailyReferralMinimum: number;
  commissionPercentage: number;
  isActive: boolean;
}

export interface AffiliateStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalDepositsFromReferrals: number;
  totalCommissionsEarned: number;
  pendingCommission: number;
  commissionTiers: CommissionTier[];
  lastPayoutDate?: string;
  nextPayoutDate?: string;
}

export interface AffiliateLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalCommissionsEarned: number;
  totalReferrals: number;
  period: 'daily' | 'weekly' | 'monthly' | 'allTime';
}

export async function getAffiliateData(): Promise<AffiliateStats> {
  const response = await fetch(`${API_URL}/affiliate`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getAffiliateStats(): Promise<AffiliateStats> {
  const response = await fetch(`${API_URL}/affiliate/stats`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getReferrals(page = 1, limit = 20): Promise<{
  data: Referral[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await fetch(`${API_URL}/affiliate/referrals?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getCommissionTiers(): Promise<CommissionTier[]> {
  const response = await fetch(`${API_URL}/affiliate/tiers`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getAffiliateLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'allTime' = 'allTime',
  limit = 20
): Promise<AffiliateLeaderboardEntry[]> {
  const params = new URLSearchParams({
    period,
    limit: limit.toString(),
  });
  const response = await fetch(`${API_URL}/affiliate/leaderboard?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function requestCommissionPayout(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/affiliate/payout`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getPayoutHistory(page = 1, limit = 20): Promise<{
  data: Array<{
    id: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    requestedAt: string;
    processedAt?: string;
  }>;
  meta: any;
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await fetch(`${API_URL}/affiliate/payouts?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}
