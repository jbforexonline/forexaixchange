/**
 * Spin/Rounds/Bets API Client
 * Handles all API calls for the spin feature
 */

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
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// =============================================================================
// ROUNDS API
// =============================================================================

export interface Round {
  id: string;
  roundNumber: number;
  state: 'OPEN' | 'FROZEN' | 'SETTLING' | 'SETTLED';
  openedAt: string;
  freezeAt: string;
  settleAt: string;
  roundDuration: number;
  commitHash?: string;
  betsCount?: number;
  // Winner fields (only present when state === 'SETTLED')
  outerWinner?: string | null;
  middleWinner?: string | null;
  innerWinner?: string | null;
  indecisionTriggered?: boolean;
  outerTied?: boolean;
  middleTied?: boolean;
  innerTied?: boolean;
}

export interface RoundTotals {
  outer: { BUY: number; SELL: number };
  middle: { BLUE: number; RED: number };
  inner: { HIGH_VOL: number; LOW_VOL: number };
  global: { INDECISION: number };
}

/**
 * Get current active round
 */
export async function getCurrentRound(): Promise<{ round: Round | null; message?: string }> {
  const response = await fetch(`${API_URL}/rounds/current`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const result = await handleResponse<any>(response);
  
  // Debug: log what we're receiving
  console.log('getCurrentRound raw response:', result);
  
  // Backend wraps response in envelope: { data: { round: {...} }, message, statusCode, timestamp }
  // Unwrap the envelope first
  const payload = result?.data ?? result;
  
  console.log('getCurrentRound payload (unwrapped):', payload);
  
  // Handle different response formats
  if (payload?.round) {
    console.log('getCurrentRound: Found round in payload.round');
    return { round: payload.round, message: payload.message || result?.message };
  } else if (payload?.id && payload?.state) {
    // Backend returned round directly without wrapper
    console.log('getCurrentRound: Found round directly in payload');
    return { round: payload as Round };
  } else {
    console.warn('No active round found or unexpected format:', payload);
    return { round: null, message: payload?.message || result?.message || 'No active round' };
  }
}

/**
 * Get round totals (live betting amounts)
 */
export async function getRoundTotals(roundId: string): Promise<{ roundId: string; totals: RoundTotals }> {
  const response = await fetch(`${API_URL}/rounds/${roundId}/totals`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Get round history
 */
export async function getRoundHistory(page = 1, limit = 20) {
  const response = await fetch(`${API_URL}/rounds/history?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Recent settled round for display
 */
export interface RecentRound {
  id: string;
  roundNumber: number;
  outerWinner: string | null;
  middleWinner: string | null;
  innerWinner: string | null;
  indecisionTriggered: boolean;
  totalVolume: number;
  settledAt: string;
  betsCount: number;
}

/**
 * Get recent settled rounds (for live results display)
 */
export async function getRecentRounds(limit = 5): Promise<{ data: RecentRound[] }> {
  const response = await fetch(`${API_URL}/rounds/history?page=1&limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const result = await handleResponse<any>(response);
  
  // Debug: log the actual response structure
  console.log('getRecentRounds raw response:', result);
  
  // Backend wraps response in envelope: { data: { data: [...], meta: {...} }, message, statusCode, timestamp }
  // Unwrap the envelope first
  const payload = result?.data ?? result;
  
  console.log('getRecentRounds payload (unwrapped):', payload);
  
  // Handle different response formats - backend may return { data: [...] } or array directly
  let roundsArray: any[];
  if (Array.isArray(payload)) {
    roundsArray = payload;
  } else if (Array.isArray(payload?.data)) {
    // Nested: payload.data is the rounds array
    roundsArray = payload.data;
  } else if (Array.isArray(payload?.rounds)) {
    roundsArray = payload.rounds;
  } else {
    console.warn('Unexpected response format from rounds/history (after unwrap):', payload);
    roundsArray = [];
  }
  
  console.log('getRecentRounds found rounds:', roundsArray.length);
  
  // Transform the backend response to our frontend format
  const rounds: RecentRound[] = roundsArray.map((round: any) => ({
    id: round.id,
    roundNumber: round.roundNumber,
    outerWinner: round.outerWinner || null,
    middleWinner: round.middleWinner || null,
    innerWinner: round.innerWinner || null,
    indecisionTriggered: round.indecisionTriggered || false,
    totalVolume: Number(round.totalVolume) || 0,
    settledAt: round.settledAt || round.updatedAt || round.createdAt,
    betsCount: round._count?.bets || 0,
  }));
  
  return { data: rounds };
}

// =============================================================================
// BETS API
// =============================================================================

export type BetMarket = 'OUTER' | 'MIDDLE' | 'INNER' | 'GLOBAL';
export type BetSelection = 'BUY' | 'SELL' | 'BLUE' | 'RED' | 'HIGH_VOL' | 'LOW_VOL' | 'INDECISION';

export interface PlaceBetDto {
  market: BetMarket;
  selection: BetSelection;
  amountUsd: number;
  idempotencyKey?: string;
}

export interface Bet {
  id: string;
  roundId: string;
  market: BetMarket;
  selection: BetSelection;
  amountUsd: number;
  status: string;
  isWinner?: boolean | null;
  payoutAmount?: number | null;
  profitAmount?: number | null;
  createdAt: string;
  round?: {
    roundNumber: number;
    state: string;
    settledAt?: string | null;
  };
}

/**
 * Place a bet on the current round
 */
export async function placeBet(dto: PlaceBetDto): Promise<Bet> {
  console.log('placeBet: Sending request', dto);
  const response = await fetch(`${API_URL}/bets`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    console.error('placeBet: Error response', { status: response.status, errorData });
    throw new Error(errorData.message || `HTTP ${response.status}: Failed to place order`);
  }
  
  const result = await response.json();
  console.log('placeBet: Success response', result);
  
  // Unwrap envelope if present
  return result.data || result;
}

/**
 * Get user's bets for current round
 */
export async function getCurrentRoundBets(): Promise<Bet[]> {
  const response = await fetch(`${API_URL}/bets/current-round`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const result = await handleResponse<any>(response);
  
  // Unwrap envelope: { data: [...], message, statusCode, timestamp }
  const payload = result?.data ?? result;
  
  // Return array or empty array
  return Array.isArray(payload) ? payload : [];
}

/**
 * Get user's bet history
 */
export async function getBetHistory(page = 1, limit = 20) {
  const response = await fetch(`${API_URL}/bets/history?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Get user's betting statistics
 */
export async function getBetStats() {
  const response = await fetch(`${API_URL}/bets/stats`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Cancel a bet (Premium only)
 */
export async function cancelBet(betId: string) {
  const response = await fetch(`${API_URL}/bets/cancel/${betId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

// =============================================================================
// WALLET API
// =============================================================================

export interface Wallet {
  available: number;
  held: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalWon: number;
  totalLost: number;
}

/**
 * Get user's wallet balance
 */
export async function getWallet(): Promise<Wallet> {
  const response = await fetch(`${API_URL}/wallet/balance`, {
    method: 'GET',
    headers: getHeaders(),
  });
  // Parse and coerce numeric fields to ensure UI always receives numbers
  const data = await handleResponse<any>(response);
  // Support envelope responses like { data: { available: '2500', ... } }
  const payload = data?.data ?? data;
  const wallet: Wallet = {
    available: Number(payload?.available) || 0,
    held: Number(payload?.held) || 0,
    totalDeposited: Number(payload?.totalDeposited) || 0,
    totalWithdrawn: Number(payload?.totalWithdrawn) || 0,
    totalWon: Number(payload?.totalWon) || 0,
    totalLost: Number(payload?.totalLost) || 0,
  };

  return wallet;
}

export interface CreateDepositDto {
  amount: number;
  method: string;
  reference?: string;
  idempotencyKey?: string;
}

export interface CreateWithdrawalDto {
  amount: number;
  method: string;
  reference?: string;
  idempotencyKey?: string;
}

export interface CreateTransferDto {
  recipient: string;
  amount: number;
  feePayer: 'SENDER' | 'RECIPIENT';
  idempotencyKey?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  fee: number;
  status: string;
  method?: string;
  reference?: string;
  description?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Create a deposit request
 */
export async function createDeposit(dto: CreateDepositDto): Promise<{ transaction: Transaction; wallet: Wallet; newBalance: number; instant: boolean }> {
  const response = await fetch(`${API_URL}/wallet/deposit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...dto,
      idempotencyKey: dto.idempotencyKey || `deposit-${Date.now()}-${Math.random()}`,
    }),
  });
  return handleResponse(response);
}

/**
 * Create a withdrawal request
 */
export async function createWithdrawal(dto: CreateWithdrawalDto): Promise<{ transaction: Transaction; amount: number; fee: number; totalDeduction: number }> {
  const response = await fetch(`${API_URL}/wallet/withdraw`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...dto,
      idempotencyKey: dto.idempotencyKey || `withdraw-${Date.now()}-${Math.random()}`,
    }),
  });
  return handleResponse(response);
}

/**
 * Create an internal transfer (Premium only)
 */
export async function createTransfer(dto: CreateTransferDto): Promise<any> {
  const response = await fetch(`${API_URL}/wallet/transfer`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...dto,
      idempotencyKey: dto.idempotencyKey || `transfer-${Date.now()}-${Math.random()}`,
    }),
  });
  return handleResponse(response);
}

/**
 * Search users for transfer (Premium only)
 */
export async function searchUsersForTransfer(query: string): Promise<User[]> {
  const response = await fetch(`${API_URL}/wallet/transfer/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Get transfer details with recipient info (Premium only)
 */
export async function getTransfer(transferId: string): Promise<any> {
  const response = await fetch(`${API_URL}/wallet/transfer/${transferId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * Get user transactions
 */
export async function getTransactions(page = 1, limit = 10, type?: string): Promise<TransactionResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (type) {
    params.append('type', type);
  }
  const response = await fetch(`${API_URL}/wallet/transactions?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

// =============================================================================
// USER API
// =============================================================================

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  premium: boolean;
  premiumExpiresAt?: string;
  verificationBadge: boolean;
}

/**
 * Get current user info
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Check if user is premium
 */
export function isPremiumUser(): boolean {
  const user = getCurrentUser();
  if (!user || !user.premium) return false;
  if (user.premiumExpiresAt) {
    return new Date(user.premiumExpiresAt) >= new Date();
  }
  return true;
}

