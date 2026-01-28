/**
 * Admin Finance API Client
 * Handles admin financial operations: monitoring, approvals, and configuration
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
    // Unwrap backend global response wrapper
    if (json && 'data' in json && 'statusCode' in json) {
        return json.data;
    }
    return json;
}

export interface PendingTransaction {
    id: string;
    userId: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: string;
    fee: string;
    status: string;
    method: string;
    reference?: string;
    createdAt: string;
}

export interface InternalTransfer {
    id: string;
    senderId: string;
    sender: {
        id: string;
        username: string;
        email: string;
    };
    recipientId: string;
    recipient: {
        id: string;
        username: string;
        email: string;
    };
    amount: string;
    fee: string;
    feePayer: 'SENDER' | 'RECIPIENT';
    status: string;
    createdAt: string;
}

export interface SystemConfig {
    key: string;
    value: string;
    updatedBy?: string;
    updatedAt: string;
}

// Transactions
export async function getPendingTransactions(): Promise<PendingTransaction[]> {
    const response = await fetch(`${API_URL}/wallet/admin/transactions/pending`, {
        method: 'GET',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

export async function approveTransaction(id: string): Promise<any> {
    const response = await fetch(`${API_URL}/wallet/admin/transactions/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

export async function rejectTransaction(id: string): Promise<any> {
    const response = await fetch(`${API_URL}/wallet/admin/transactions/${id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// Transfers
export async function getPendingTransfers(): Promise<InternalTransfer[]> {
    const response = await fetch(`${API_URL}/wallet/admin/transfers?status=PENDING`, {
        method: 'GET',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

export async function approveTransfer(id: string): Promise<any> {
    const response = await fetch(`${API_URL}/wallet/admin/transfers/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

export async function rejectTransfer(id: string): Promise<any> {
    const response = await fetch(`${API_URL}/wallet/admin/transfers/${id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// Configuration
export async function getSystemConfig(): Promise<SystemConfig[]> {
    const response = await fetch(`${API_URL}/sysadmin/config`, {
        method: 'GET',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

export async function updateSystemConfig(key: string, value: string): Promise<SystemConfig> {
    const response = await fetch(`${API_URL}/sysadmin/config/${key}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ value }),
    });
    return handleResponse(response);
}

export interface TransactionResponse {
    data: any[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export async function getAllTransactions(page = 1, limit = 20, type?: string, status?: string): Promise<TransactionResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    });
    if (type && type !== 'ALL') params.append('type', type);
    if (status && status !== 'ALL') params.append('status', status);

    const response = await fetch(`${API_URL}/sysadmin/transactions?${params.toString()}`, {
        method: 'GET',
        headers: getHeaders(),
    });
    return handleResponse(response);
}
