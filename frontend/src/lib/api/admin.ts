/**
 * Admin API Client
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

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    banned: number;
    premium: number;
  };
  financial: {
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    pendingTransfers: number;
  };
  activity: {
    totalSpins: number;
    totalTransactions: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_URL}/admin/dashboard`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export interface RecentActivity {
  recentUsers: any[];
  recentSpins: any[];
  recentTransactions: any[];
}

export async function getRecentActivity(limit = 20): Promise<RecentActivity> {
  const response = await fetch(`${API_URL}/admin/activity?limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  isPublic: boolean;
}

export async function getSystemConfig(): Promise<SystemConfig[]> {
  const response = await fetch(`${API_URL}/admin/config`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function updateSystemConfig(key: string, value: string): Promise<SystemConfig> {
  const response = await fetch(`${API_URL}/admin/config/${key}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ value }),
  });
  return handleResponse(response);
}

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  premium: boolean;
  isActive: boolean;
  isBanned: boolean;
  isVerified: boolean;
  verificationBadge: boolean;
  wallet?: {
    available: number;
    held: number;
    totalDeposited: number;
    totalWithdrawn: number;
  };
}

export interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getAllUsers(page = 1, limit = 20, search?: string): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) {
    params.append('search', search);
  }
  const response = await fetch(`${API_URL}/users?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function banUser(userId: string, reason?: string): Promise<User> {
  const response = await fetch(`${API_URL}/users/${userId}/ban`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
}

export async function unbanUser(userId: string): Promise<User> {
  const response = await fetch(`${API_URL}/users/${userId}/unban`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

