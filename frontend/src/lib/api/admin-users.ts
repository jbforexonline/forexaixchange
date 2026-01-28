/**
 * Admin User Management API Client
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
  const json = await response.json();
  // Unwrap backend global response wrapper: { data: T, message: string, statusCode: number }
  if (json && 'data' in json && 'statusCode' in json) {
    return json.data;
  }
  return json;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  premium: boolean;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  verificationBadge: boolean;
  createdAt: string;
  wallet?: {
    available: number;
    held: number;
  };
  referrer?: {
    username: string;
    email: string;
  };
  _count?: {
    referrals: number;
    spins: number;
    transactions: number;
    premiumSubscriptions: number;
  };
}

export interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
      active: number;
      premium: number;
      banned: number;
    };
  };
}

export async function getAllUsers(page = 1, limit = 20, search?: string): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);

  const response = await fetch(`${API_URL}/sysadmin/users?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const response = await fetch(`${API_URL}/sysadmin/users/${userId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function setMaintenanceMode(enabled: boolean): Promise<any> {
  const response = await fetch(`${API_URL}/sysadmin/maintenance`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ enabled }),
  });
  return handleResponse(response);
}
