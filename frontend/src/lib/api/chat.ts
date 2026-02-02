/**
 * Chat/Community API Client
 * Group chatroom for premium/verified users – room-based only (no direct messaging).
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
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error((error as { message?: string }).message || `HTTP ${response.status}`);
  }
  return response.json();
}

/** Backend room types: GENERAL, PREMIUM (members' room), ADMIN */
export type ChatRoomType = 'GENERAL' | 'PREMIUM' | 'ADMIN';

export interface ChatMessageUser {
  id: string;
  username: string;
  premium: boolean;
  verificationBadge: boolean;
  role?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  roomType: ChatRoomType;
  createdAt: string;
  user: ChatMessageUser;
}

export interface CreateMessageDto {
  content: string;
  roomType: ChatRoomType;
}

/** Get recent messages for a room (group chat, no DMs). Backend wraps in { data }; returns array (newest first, reverse for display). */
export async function getChatMessages(roomType: ChatRoomType): Promise<ChatMessage[]> {
  const response = await fetch(`${API_URL}/chat/${roomType}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const raw = await handleResponse<{ data?: ChatMessage[] } | ChatMessage[]>(response);
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'data' in raw ? (raw as { data?: ChatMessage[] }).data : null);
  return Array.isArray(list) ? [...list] : [];
}

export async function sendChatMessage(dto: CreateMessageDto): Promise<ChatMessage> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  const raw = await handleResponse<{ data?: ChatMessage } | ChatMessage>(response);
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: ChatMessage }).data) {
    return (raw as { data: ChatMessage }).data;
  }
  return raw as ChatMessage;
}

export async function deleteChatMessage(
  messageId: string,
  reason?: string
): Promise<{ success?: boolean; message?: string }> {
  const response = await fetch(`${API_URL}/chat/message/${messageId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
}

export interface SentimentData {
  BUY: number;
  SELL: number;
  BLUE: number;
  RED: number;
  HIGH_VOL: number;
  LOW_VOL: number;
  INDECISION: number;
}

export async function getCommunitysSentiment(): Promise<{ sentiment: SentimentData; lastUpdated: string }> {
  const response = await fetch(`${API_URL}/chat/sentiment`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}
