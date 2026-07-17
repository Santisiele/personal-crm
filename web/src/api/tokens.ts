// Persists the JWT access/refresh pair in localStorage and lets the app react to
// changes (login/logout). The access token is short-lived and refreshed on 401;
// the refresh token is exchanged at POST /auth/refresh.

import type { TokenPair } from '@/api/types';

const ACCESS_KEY = 'crm.accessToken';
const REFRESH_KEY = 'crm.refreshToken';

type Listener = () => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(pair: TokenPair): void {
  localStorage.setItem(ACCESS_KEY, pair.accessToken);
  localStorage.setItem(REFRESH_KEY, pair.refreshToken);
  emit();
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  emit();
}

export function hasSession(): boolean {
  return getAccessToken() !== null;
}

/** Subscribes to login/logout transitions; returns an unsubscribe function. */
export function onTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}
