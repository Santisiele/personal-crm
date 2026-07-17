import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '@/api/tokens';

// Same-origin by default (production, where Nest serves the SPA under /app and
// the API at the root); overridable to the API's dev origin via VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({ baseURL });

// Attach the current access token to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// A single in-flight refresh shared by all requests that 401 at once, so a burst
// of expired-token responses triggers exactly one POST /auth/refresh.
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  // A bare axios call (not `api`) avoids recursing through these interceptors.
  const { data } = await axios.post<{ accessToken: string }>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
  );
  setAccessToken(data.accessToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const isAuthCall = original?.url?.includes('/auth/');
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retried ||
      isAuthCall
    ) {
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
      return api(original);
    } catch (refreshError) {
      // The refresh token is gone or invalid: drop the session so the app routes
      // back to the login screen.
      clearTokens();
      return Promise.reject(refreshError);
    }
  },
);
