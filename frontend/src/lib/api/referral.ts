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

export interface ReferralStats {
  affiliateCode: string;
  totalReferrals: number;
  activeReferrals?: number;
  totalEarnings: number;
  totalPaid: number;
  pendingPayout: number;
  earnings: any[];
  referrals?: any[];
}

/**
 * Get user's referral/affiliate data
 */
export async function getReferralData(): Promise<ReferralStats> {
  const response = await fetch(`${API_URL}/affiliate`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<ReferralStats>(response);
}

/**
 * Get user's referrals list
 */
export async function getReferralsList() {
  const response = await fetch(`${API_URL}/affiliate/referrals`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any[]>(response);
}

/**
 * Generate referral link for current user
 */
export function getReferralLink(affiliateCode: string): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3000';
  return `${baseUrl}/register?ref=${affiliateCode}`;
}

/**
 * Withdraw affiliate earnings
 */
export async function withdrawAffiliateEarnings(amount: number) {
  const response = await fetch(`${API_URL}/affiliate/withdraw`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ amount }),
  });
  return handleResponse<any>(response);
}

/**
 * Generate affiliate code if not exists
 */
export async function generateAffiliateCode() {
  const response = await fetch(`${API_URL}/affiliate/generate-code`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse<{ affiliateCode: string }>(response);
}