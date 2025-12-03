/**
 * Authentication utilities
 */

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getCurrentUser(): any | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Disconnect WebSocket if connected
  try {
    const { cleanupWebSocket } = require('./websocket');
    cleanupWebSocket();
  } catch (error) {
    console.error('Error cleaning up WebSocket:', error);
  }
  
  // Emit an event so components can react (client-side router should handle navigation)
  try {
    const evt = new Event('logged-out');
    window.dispatchEvent(evt);
  } catch (error) {
    // ignore
  }
}

