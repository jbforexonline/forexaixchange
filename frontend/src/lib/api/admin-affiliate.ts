/**
 * Admin Affiliate API Client
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

export async function getAffiliateSettings(): Promise<any> {
    const response = await fetch(`${API_URL}/sysadmin/affiliate/settings`, {
        method: 'GET',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

export async function updateAffiliateSettings(settings: any): Promise<any> {
    const response = await fetch(`${API_URL}/sysadmin/affiliate/settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(settings),
    });
    return handleResponse(response);
}
