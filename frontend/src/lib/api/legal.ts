/**
 * Legal API client: active docs, accept, age-confirm
 */

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export const LEGAL_REACCEPT_REQUIRED = 'LEGAL_REACCEPT_REQUIRED';
export const AGE_CONFIRM_REQUIRED = 'AGE_CONFIRM_REQUIRED';

export interface ActiveLegalDoc {
  id: string;
  type: string;
  version: string;
  content: string;
  effectiveAt: string;
}

export async function getActiveLegal(type: 'terms' | 'privacy'): Promise<ActiveLegalDoc | null> {
  const res = await fetch(`${API_URL}/api/legal/${type}/active`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch ${type}`);
  const json = await res.json();
  return (json.data ?? json) as ActiveLegalDoc;
}

export async function acceptLegal(type: 'terms' | 'privacy'): Promise<{ accepted: boolean }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/api/legal/${type}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to accept ${type}`);
  return res.json();
}

export async function confirmAge(): Promise<{ confirmed: boolean }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/api/legal/age-confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to confirm age');
  return res.json();
}

export const AGE_GATE_STORAGE_KEY = 'forexai_age_gate_18_confirmed';

export function getAgeGateConfirmed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem(AGE_GATE_STORAGE_KEY);
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

export function setAgeGateConfirmed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AGE_GATE_STORAGE_KEY, '1');
    document.cookie = `${AGE_GATE_STORAGE_KEY}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}
