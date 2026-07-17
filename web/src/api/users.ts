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

/**
 * Creates a user with a target role. Registration always yields a plain USER, so
 * a non-USER role is applied as a second, authorized step (PATCH /users/:id/role,
 * which only a CREATOR may do). Returns the resulting view.
 */
export async function createUser(input: {
  name: string;
  password: string;
  role: UserRole;
}): Promise<UserView> {
  const { data: created } = await api.post<UserView>('/users', {
    name: input.name,
    password: input.password,
  });
  if (input.role === 'USER') {
    return created;
  }
  await changeUserRole(created.id, input.role);
  return { ...created, role: input.role };
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
