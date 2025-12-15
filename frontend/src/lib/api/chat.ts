/**
 * Chat/Community API Client
 * Handles community chatroom messages and sentiment data
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

export type ChatRoomType = 'GENERAL' | 'STRATEGIES' | 'CHART_ANALYSIS' | 'TRADING_IDEAS';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  roomType: ChatRoomType;
  userBadge?: boolean;
  isPremium?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoom {
  type: ChatRoomType;
  name: string;
  description: string;
  messageCount: number;
  activeUsers: number;
  requiresPremium: boolean;
  lastActivityAt: string;
}

export interface CreateMessageDto {
  content: string;
  roomType: ChatRoomType;
}

export async function getAvailableChatRooms(): Promise<ChatRoom[]> {
  const response = await fetch(`${API_URL}/chat/rooms`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function getChatRoomMessages(
  roomType: ChatRoomType,
  limit = 50,
  offset = 0
): Promise<{
  messages: ChatMessage[];
  total: number;
  roomType: ChatRoomType;
}> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  const response = await fetch(`${API_URL}/chat/${roomType}?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function sendChatMessage(dto: CreateMessageDto): Promise<ChatMessage> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse(response);
}

export async function deleteMessage(messageId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/chat/message/${messageId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
}

export interface CommunityStats {
  totalMessages: number;
  activeUsers: number;
  topContributors: Array<{
    username: string;
    messageCount: number;
    badge?: boolean;
  }>;
  lastActivityAt: string;
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const response = await fetch(`${API_URL}/chat/stats`, {
    method: 'GET',
    headers: getHeaders(),
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
