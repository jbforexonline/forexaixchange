/**
 * Suggestions API Client
 * Handles betting suggestions based on history and analytics
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

export interface BetSelection {
  market: 'OUTER' | 'MIDDLE' | 'INNER' | 'GLOBAL';
  selection: string;
  frequency: number;
  winRate: number;
  profitLoss: number;
}

export interface SuggestionData {
  topSelections: BetSelection[];
  minoritySelection: BetSelection;
  recommendedAmount: number;
  basedOnBets: number;
  reasoning: string;
}

export async function getBettingSuggestions(): Promise<SuggestionData> {
  const response = await fetch(`${API_URL}/suggestions/next-bet`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getBetAnalytics(): Promise<{
  totalBets: number;
  winningBets: number;
  losingBets: number;
  winRate: number;
  avgBetAmount: number;
  totalProfitLoss: number;
  mostFrequentSelection: BetSelection;
  mostProfitableSelection: BetSelection;
}> {
  const response = await fetch(`${API_URL}/suggestions/analytics`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getRecommendedBets(): Promise<{
  suggestions: SuggestionData[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  nextUpdateIn: number;
}> {
  const response = await fetch(`${API_URL}/suggestions/recommended`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}
