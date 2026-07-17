import axios from 'axios';
import { api } from '@/api/client';
import type { TokenPair, UserView } from '@/api/types';

const baseURL = import.meta.env.VITE_API_URL ?? '';

/** Authenticates by name + password, returning the access/refresh token pair. */
export async function login(
  name: string,
  password: string,
): Promise<TokenPair> {
  // A bare axios call: there is no session yet, so the request interceptor has
  // nothing to attach and the response interceptor must not try to refresh.
  const { data } = await axios.post<TokenPair>(`${baseURL}/auth/login`, {
    name,
    password,
  });
  return data;
}

/** Returns the authenticated user's safe view (id, name, role). */
export async function fetchMe(): Promise<UserView> {
  const { data } = await api.get<UserView>('/auth/me');
  return data;
}

/** Registers a new user. Public endpoint; used by the self-service sign-up. */
export async function register(input: {
  name: string;
  password: string;
  role: string;
}): Promise<UserView> {
  const { data } = await axios.post<UserView>(`${baseURL}/users`, input);
  return data;
}
