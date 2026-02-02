'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getChatMessages, sendChatMessage, type ChatMessage, type ChatRoomType } from '@/lib/api/chat';
import { getCurrentUser, type User } from '@/lib/api/spin';
import { useUserData } from '@/hooks/useUserData';
import './ChatRoom.scss';

const ROOM_TYPE: ChatRoomType = 'PREMIUM';
const POLL_INTERVAL_MS = 15000;
const MAX_MESSAGE_LENGTH = 500;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoom() {
  const { user, loading: userLoading } = useUserData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentUser: User | null = user ?? getCurrentUser();
  const isPremiumOrVerified = (() => {
    if (!currentUser) return false;
    const premium = currentUser.premium && (!currentUser.premiumExpiresAt || new Date(currentUser.premiumExpiresAt) >= new Date());
    const verified = !!currentUser.verificationBadge;
    return premium || verified;
  })();

  const fetchMessages = useCallback(async () => {
    if (!isPremiumOrVerified) return;
    try {
      const list = await getChatMessages(ROOM_TYPE);
      setMessages(Array.isArray(list) ? [...list].reverse() : []);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load messages';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isPremiumOrVerified]);

  useEffect(() => {
    if (!isPremiumOrVerified) {
      setLoading(false);
      return;
    }
    fetchMessages();
  }, [isPremiumOrVerified, fetchMessages]);

  useEffect(() => {
    if (!isPremiumOrVerified) return;
    const id = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPremiumOrVerified, fetchMessages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !isPremiumOrVerified) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      setSendError(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
      return;
    }
    setSendError(null);
    setSending(true);
    try {
      const sent = await sendChatMessage({ content: text, roomType: ROOM_TYPE });
      setMessages((prev) => [...prev, sent]);
      setInput('');
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const hasUser = currentUser != null;
  if (!hasUser) {
    return (
      <div className="chat-room chat-room--loading">
        <p>{userLoading ? 'Loading...' : 'Please log in to access the chat.'}</p>
      </div>
    );
  }

  if (!isPremiumOrVerified) {
    return (
      <div className="chat-room chat-room--locked">
        <div className="chat-room__lock-card">
          <h2>Members&apos; Chart Room</h2>
          <p>This room is for <strong>premium</strong> and <strong>verified</strong> members to share experience and ideas.</p>
          <p>Upgrade to premium or get verified to join the conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-room">
      <header className="chat-room__header">
        <h1>Members&apos; Chart Room</h1>
        <p className="chat-room__subtitle">Share experience and ideas with the community. Group chat only — no direct messages.</p>
      </header>

      <div className="chat-room__body">
        <div className="chat-room__list" ref={listRef} role="log" aria-label="Chat messages">
          {loading ? (
            <div className="chat-room__loading">Loading messages...</div>
          ) : error ? (
            <div className="chat-room__error">{error}</div>
          ) : messages.length === 0 ? (
            <div className="chat-room__empty">No messages yet. Be the first to share!</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="chat-room__message">
                <div className="chat-room__message-meta">
                  <span className="chat-room__message-author">
                    {msg.user?.username ?? '—'}
                    {msg.user?.verificationBadge && <span className="chat-room__badge" title="Verified">✓</span>}
                    {msg.user?.premium && <span className="chat-room__badge chat-room__badge--premium" title="Premium">★</span>}
                  </span>
                  <span className="chat-room__message-time">{formatTime(msg.createdAt)}</span>
                </div>
                <div className="chat-room__message-content">{msg.content}</div>
              </div>
            ))
          )}
        </div>

        <form className="chat-room__form" onSubmit={handleSend}>
          {sendError && <div className="chat-room__send-error">{sendError}</div>}
          <div className="chat-room__input-wrap">
            <input
              type="text"
              className="chat-room__input"
              placeholder="Share your experience or idea..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={sending || !!error}
              aria-label="Message"
            />
            <button type="submit" className="chat-room__send" disabled={sending || !input.trim() || !!error}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          <span className="chat-room__hint">{input.length}/{MAX_MESSAGE_LENGTH} · Wait 2s between messages</span>
        </form>
      </div>
    </div>
  );
}
