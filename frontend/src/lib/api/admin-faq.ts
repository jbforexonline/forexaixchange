const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

function getHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  return h;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function listFaq(): Promise<FaqItem[]> {
  const r = await fetch(`${API_URL}/api/admin/faq`, { headers: getHeaders() });
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = json?.message ?? "Failed to load FAQ";
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  const data = json?.data ?? json;
  return Array.isArray(data) ? data : [];
}

export async function getFaq(id: string): Promise<FaqItem> {
  const r = await fetch(`${API_URL}/api/admin/faq/${id}`, { headers: getHeaders() });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.message ?? "Failed to load");
  return json?.data ?? json;
}

export async function createFaq(data: {
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
}): Promise<FaqItem> {
  const r = await fetch(`${API_URL}/api/admin/faq`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.message ?? "Failed to create");
  return json?.data ?? json;
}

export async function updateFaq(
  id: string,
  data: { category?: string; question?: string; answer?: string; sortOrder?: number }
): Promise<FaqItem> {
  const r = await fetch(`${API_URL}/api/admin/faq/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.message ?? "Failed to update");
  return json?.data ?? json;
}

export async function deleteFaq(id: string): Promise<void> {
  const r = await fetch(`${API_URL}/api/admin/faq/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!r.ok) {
    const json = await r.json().catch(() => null);
    throw new Error(json?.message ?? "Failed to delete");
  }
}
