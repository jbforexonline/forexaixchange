// =============================================================================
// FINANCE ADMIN API - New Ledger-Based Finance System
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function handleResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Error ${res.status}`);
  }
  return data.data || data;
}

// =============================================================================
// TYPES
// =============================================================================

export interface Deposit {
  id: string;
  userId: string;
  amount: string;
  method: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  referenceId?: string;
  paymentProof?: string;
  createdAt: string;
  processedAt?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  processedBy?: {
    id: string;
    username: string;
  };
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  fee: string;
  netAmount: string;
  method: string;
  status: 'PENDING_OTP' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  destinationAddress?: string;
  bankName?: string;
  accountNumber?: string;
  createdAt: string;
  processedAt?: string;
  paidAt?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface HouseAccount {
  id: string;
  name: string;
  code: string;
  type: string;
  balance: string;
}

export interface ReserveStatus {
  bankBalance: string;
  totalUserLiabilities: string;
  reserveRatio: string | number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  minRatioThreshold?: string;
  warningRatioThreshold?: string;
  isWithdrawalsLocked?: boolean;
  isLargeWithdrawalsPaused?: boolean;
  alerts?: any[];
}

export interface HouseAccountDetailed {
  id: string;
  type: string;
  name: string;
  balance: string;
  currency: string;
  stats: {
    transactionCount: number;
    totalDebits: string;
    totalCredits: string;
  };
  recentTransactions: {
    id: string;
    type: string;
    amount: string;
    description: string;
    direction: 'DEBIT' | 'CREDIT';
    counterparty: string;
    createdAt: string;
  }[];
}

export interface Settlement {
  id: string;
  roundId: string;
  roundNumber: number;
  totalPool: string;
  totalPayouts: string;
  houseFee: string;
  houseProfit: string;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  settledAt: string;
  round?: {
    indecisionTriggered: boolean;
    outerWinner: string;
    middleWinner: string;
    innerWinner: string;
  };
}

export interface SettlementSummary {
  totalSettlements: number;
  totalPool: string;
  totalPayouts: string;
  totalHouseProfit: string;
  totalHouseFees: string;
  avgPoolPerRound: string;
  avgProfitPerRound: string;
  today: { settlements: number; profit: string; volume: string };
  thisWeek: { settlements: number; profit: string; volume: string };
  platformAccount: {
    balance: string;
    reserveBalance: string;
    totalFees: string;
    totalPaidOut: string;
    totalCollected: string;
    totalSubsidy: string;
  } | null;
}

export interface Alert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  type: string;
  message: string;
  details?: any;
  isAcknowledged: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  deposits: {
    pending: number;
    todayApproved: number;
    todayAmount: string;
  };
  withdrawals: {
    pendingReview: number;
    approved: number;
    todayPaid: string;
  };
  reserve: ReserveStatus;
  alerts: {
    unacknowledged: number;
    critical: number;
  };
}

// =============================================================================
// DASHBOARD
// =============================================================================

export async function getFinanceDashboard(): Promise<DashboardSummary> {
  const res = await fetch(`${API_URL}/admin/finance/dashboard`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// =============================================================================
// HOUSE ACCOUNTS & RESERVE
// =============================================================================

export async function getHouseStatus(): Promise<{
  houseAccounts: HouseAccount[];
  reserveStatus: ReserveStatus;
}> {
  const res = await fetch(`${API_URL}/admin/finance/house`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getReserveStatus(): Promise<ReserveStatus> {
  const res = await fetch(`${API_URL}/admin/finance/reserve`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function updateBankBalance(
  bankBalance: number,
  bankAccountRef?: string,
  notes?: string
): Promise<any> {
  const res = await fetch(`${API_URL}/admin/finance/reserve/update`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ bankBalance, bankAccountRef, notes }),
  });
  return handleResponse(res);
}

export async function getBankSnapshots(limit = 30): Promise<any[]> {
  const res = await fetch(`${API_URL}/admin/finance/reserve/snapshots?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// =============================================================================
// DEPOSITS
// =============================================================================

export async function getDeposits(params?: {
  status?: string;
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Deposit[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_URL}/admin/finance/deposits?${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getPendingDeposits(): Promise<{ data: Deposit[]; total: number }> {
  const res = await fetch(`${API_URL}/admin/finance/deposits/pending`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getDeposit(id: string): Promise<Deposit> {
  const res = await fetch(`${API_URL}/admin/finance/deposits/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function createDepositForUser(data: {
  userId: string;
  amount: number;
  method: string;
  referenceId?: string;
  paymentProof?: string;
}): Promise<Deposit> {
  const res = await fetch(`${API_URL}/admin/finance/deposits`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function approveDeposit(id: string, reason?: string): Promise<Deposit> {
  const res = await fetch(`${API_URL}/admin/finance/deposits/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
}

export async function rejectDeposit(id: string, reason?: string): Promise<Deposit> {
  const res = await fetch(`${API_URL}/admin/finance/deposits/${id}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
}

// =============================================================================
// WITHDRAWALS
// =============================================================================

export async function getWithdrawals(params?: {
  status?: string;
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Withdrawal[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_URL}/admin/finance/withdrawals?${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getPendingWithdrawals(): Promise<{ data: Withdrawal[]; total: number }> {
  const res = await fetch(`${API_URL}/admin/finance/withdrawals/pending`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getApprovedWithdrawals(): Promise<{ data: Withdrawal[]; total: number }> {
  const res = await fetch(`${API_URL}/admin/finance/withdrawals/approved`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getWithdrawal(id: string): Promise<Withdrawal> {
  const res = await fetch(`${API_URL}/admin/finance/withdrawals/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function approveWithdrawal(id: string, reason?: string): Promise<Withdrawal> {
  const res = await fetch(`${API_URL}/admin/finance/withdrawals/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
}

export async function rejectWithdrawal(id: string, reason?: string): Promise<Withdrawal> {
  const res = await fetch(`${API_URL}/admin/finance/withdrawals/${id}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
}

export async function markWithdrawalPaid(
  id: string,
  payoutReference?: string,
  reason?: string
): Promise<Withdrawal> {
  const res = await fetch(`${API_URL}/admin/finance/withdrawals/${id}/pay`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ payoutReference, reason }),
  });
  return handleResponse(res);
}

// =============================================================================
// ALERTS
// =============================================================================

export async function getAlerts(params?: {
  acknowledged?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ data: Alert[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.acknowledged !== undefined) query.set('acknowledged', params.acknowledged.toString());
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_URL}/admin/finance/alerts?${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function acknowledgeAlert(id: string): Promise<Alert> {
  const res = await fetch(`${API_URL}/admin/finance/alerts/${id}/acknowledge`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// =============================================================================
// AUDIT LOG
// =============================================================================

export async function getAuditLog(params?: {
  adminId?: string;
  targetUserId?: string;
  actionType?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.adminId) query.set('adminId', params.adminId);
  if (params?.targetUserId) query.set('targetUserId', params.targetUserId);
  if (params?.actionType) query.set('actionType', params.actionType);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_URL}/admin/finance/audit/actions?${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// =============================================================================
// HOUSE ACCOUNTS DETAILED
// =============================================================================

export async function getHouseAccountsDetailed(): Promise<HouseAccountDetailed[]> {
  const res = await fetch(`${API_URL}/admin/finance/house/accounts`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getHouseAccountTransactions(
  accountId: string,
  params?: { page?: number; limit?: number }
): Promise<{ account: any; transactions: any[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_URL}/admin/finance/house/accounts/${accountId}/transactions?${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function transferBetweenHouseAccounts(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reason: string;
}): Promise<any> {
  const res = await fetch(`${API_URL}/admin/finance/house/transfer`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function withdrawHouseToBank(data: {
  fromAccountId: string;
  amount: number;
  bankReference?: string;
  reason: string;
}): Promise<any> {
  const res = await fetch(`${API_URL}/admin/finance/house/withdraw-to-bank`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function depositHouseFromBank(data: {
  toAccountId: string;
  amount: number;
  bankReference?: string;
  reason: string;
}): Promise<any> {
  const res = await fetch(`${API_URL}/admin/finance/house/deposit-from-bank`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// =============================================================================
// SETTLEMENTS
// =============================================================================

export async function getSettlements(params?: {
  page?: number;
  limit?: number;
}): Promise<{ settlements: Settlement[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_URL}/admin/finance/settlements?${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getSettlementsSummary(): Promise<SettlementSummary> {
  const res = await fetch(`${API_URL}/admin/finance/settlements/summary`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getPlatformLedger(params?: {
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ entries: any[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.type) query.set('type', params.type);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_URL}/admin/finance/platform-ledger?${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}
