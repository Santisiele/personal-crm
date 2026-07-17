import { api } from '@/api/client';
import type { UserRole, UserView } from '@/api/types';

/** Lists the user directory. Privileged actors (ADMIN/CREATOR) only. */
export async function listUsers(): Promise<UserView[]> {
  const { data } = await api.get<UserView[]>('/users');
  return data;
}

export async function getUser(id: string): Promise<UserView> {
  const { data } = await api.get<UserView>(`/users/${id}`);
  return data;
}

export async function createUser(input: {
  name: string;
  password: string;
  role: UserRole;
}): Promise<UserView> {
  const { data } = await api.post<UserView>('/users', input);
  return data;
}

export async function changeUserRole(
  id: string,
  role: UserRole,
): Promise<void> {
  await api.patch(`/users/${id}/role`, { role });
}

export async function deactivateUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function changeOwnPassword(newPassword: string): Promise<void> {
  await api.patch('/users/me/password', { newPassword });
}
