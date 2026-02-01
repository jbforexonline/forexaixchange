/**
 * Wallet API Client
 * Handles wallet operations, transactions, deposits, withdrawals, and transfers
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

export interface Wallet {
  available: number;
  held: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalWon: number;
  totalLost: number;
  demoAvailable?: number;
  demoHeld?: number;
  demoTotalWon?: number;
  demoTotalLost?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'BET' | 'PAYOUT';
  amount: number;
  fee: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
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

export interface TransferDetails {
  id: string;
  senderId: string;
  recipientId: string;
  recipientUsername: string;
  amount: number;
  fee: number;
  feePayer: 'SENDER' | 'RECIPIENT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  completedAt?: string;
}

export async function getWalletBalance(): Promise<Wallet> {
  const response = await fetch(`${API_URL}/wallet/balance`, {
    method: 'GET',
    headers: getHeaders(),
  });
  // Parse and coerce numeric fields to ensure UI always receives numbers
  const data = await handleResponse<any>(response);
  // Some backends return an envelope { data: { ... } }
  const payload = data?.data ?? data;
  const wallet: Wallet = {
    available: Number(payload?.available) || 0,
    held: Number(payload?.held) || 0,
    totalDeposited: Number(payload?.totalDeposited) || 0,
    totalWithdrawn: Number(payload?.totalWithdrawn) || 0,
    totalWon: Number(payload?.totalWon) || 0,
    totalLost: Number(payload?.totalLost) || 0,
    demoAvailable: Number(payload?.demoAvailable) || 0,
    demoHeld: Number(payload?.demoHeld) || 0,
    demoTotalWon: Number(payload?.demoTotalWon) || 0,
    demoTotalLost: Number(payload?.demoTotalLost) || 0,
  };

  return wallet;
}

export async function getTransactions(
  page = 1,
  limit = 20,
  type?: string
): Promise<TransactionResponse> {
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

export async function createDeposit(
  amount: number,
  method: string,
  reference?: string
): Promise<{ transaction: Transaction; wallet: Wallet; newBalance: number; instant: boolean }> {
  const response = await fetch(`${API_URL}/wallet/deposit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      amount,
      method,
      reference,
      idempotencyKey: `deposit-${Date.now()}-${Math.random()}`,
    }),
  });
  return handleResponse(response);
}

export async function createWithdrawal(
  amount: number,
  method: string,
  reference?: string
): Promise<{ transaction: Transaction; amount: number; fee: number; totalDeduction: number }> {
  const response = await fetch(`${API_URL}/wallet/withdraw`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      amount,
      method,
      reference,
      idempotencyKey: `withdraw-${Date.now()}-${Math.random()}`,
    }),
  });
  return handleResponse(response);
}

/**
 * @deprecated Internal transfers have been permanently disabled
 * This function will throw an error if called
 */
export async function searchUsersForTransfer(query: string): Promise<any[]> {
  throw new Error('Internal transfers have been permanently disabled. Please use deposits and withdrawals through official channels.');
}

/**
 * @deprecated Internal transfers have been permanently disabled
 * This function will throw an error if called
 */
export async function createTransfer(
  recipient: string,
  amount: number,
  feePayer: 'SENDER' | 'RECIPIENT' = 'SENDER'
): Promise<TransferDetails> {
  throw new Error('Internal transfers have been permanently disabled. Please use deposits and withdrawals through official channels.');
}

/**
 * @deprecated Internal transfers have been permanently disabled
 * Returns empty array for backward compatibility
 */
export async function getTransferHistory(
  page = 1,
  limit = 20
): Promise<{ data: TransferDetails[]; meta: any }> {
  console.warn('getTransferHistory is deprecated - internal transfers have been disabled');
  return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
}

/**
 * @deprecated Internal transfers have been permanently disabled
 * This function will throw an error if called
 */
export async function getTransferDetails(transferId: string): Promise<TransferDetails> {
  throw new Error('Internal transfers have been permanently disabled.');
}

export async function resetDemoBalance(amount: number): Promise<Wallet> {
  const response = await fetch(`${API_URL}/wallet/demo/reset`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ amount }),
  });
  return handleResponse<any>(response).then(data => {
      // Support envelope or direct response
      const payload = data?.data ?? data;
       return {
        available: Number(payload?.available) || 0,
        held: Number(payload?.held) || 0,
        totalDeposited: Number(payload?.totalDeposited) || 0,
        totalWithdrawn: Number(payload?.totalWithdrawn) || 0,
        totalWon: Number(payload?.totalWon) || 0,
        totalLost: Number(payload?.totalLost) || 0,
        demoAvailable: Number(payload?.demoAvailable) || 0,
        demoHeld: Number(payload?.demoHeld) || 0,
        demoTotalWon: Number(payload?.demoTotalWon) || 0,
        demoTotalLost: Number(payload?.demoTotalLost) || 0,
      };
  });
}
