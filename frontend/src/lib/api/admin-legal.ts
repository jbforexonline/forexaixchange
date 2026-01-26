const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

function getHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  return h;
}

export interface LegalVersion {
  id: string;
  type: string;
  version: string;
  effectiveAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string | null;
}

export interface LegalDocument {
  id: string;
  type: string;
  version: string;
  content: string;
  effectiveAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string | null;
  createdByAdmin?: { id: string; username: string } | null;
}

export async function listVersions(type: "terms" | "privacy"): Promise<LegalVersion[]> {
  const r = await fetch(`${API_URL}/api/admin/legal/${type}/versions`, { headers: getHeaders() });
  let json: any;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  if (!r.ok) {
    const message =
      (json && (Array.isArray(json.message) ? json.message.join(", ") : json.message)) ||
      "Failed";
    throw new Error(message);
  }
  const data = (json?.data ?? json) as LegalVersion[] | undefined;
  return Array.isArray(data) ? data : [];
}

export async function getPreview(id: string): Promise<LegalDocument> {
  const r = await fetch(`${API_URL}/api/admin/legal/preview/${id}`, { headers: getHeaders() });
  let json: any;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  if (!r.ok) {
    const message =
      (json && (Array.isArray(json.message) ? json.message.join(", ") : json.message)) ||
      "Failed";
    throw new Error(message);
  }
  return (json?.data ?? json) as LegalDocument;
}

export async function createDraft(
  type: "terms" | "privacy",
  data: { version: string; content: string; effectiveAt: string }
): Promise<LegalDocument> {
  const r = await fetch(`${API_URL}/api/admin/legal/${type}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  let json: any;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  if (!r.ok) {
    const message =
      (json && (Array.isArray(json.message) ? json.message.join(", ") : json.message)) ||
      "Failed";
    throw new Error(message);
  }
  return (json?.data ?? json) as LegalDocument;
}

export async function activateVersion(id: string): Promise<LegalDocument> {
  const r = await fetch(`${API_URL}/api/admin/legal/${id}/activate`, {
    method: "PUT",
    headers: getHeaders(),
  });
  let json: any;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  if (!r.ok) {
    const message =
      (json && (Array.isArray(json.message) ? json.message.join(", ") : json.message)) ||
      "Failed";
    throw new Error(message);
  }
  return (json?.data ?? json) as LegalDocument;
}
