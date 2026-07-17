import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  changeUserRole,
  createUser,
  deactivateUser,
  listUsers,
} from '@/api/users';
import type { UserRole, UserView } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';

const USERS_KEY = ['users'] as const;

/**
 * Loads the user directory. Only privileged actors may list users, so the query
 * is disabled for plain users to avoid a guaranteed 403.
 */
export function useUsers() {
  const { privileged } = useAuth();
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: listUsers,
    enabled: privileged,
  });
}

/** A stable id → name map for labelling owners/assignees across the UI. */
export function useUserNames(): Map<string, string> {
  const { data } = useUsers();
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const user of data ?? []) {
      map.set(user.id, user.name);
    }
    return map;
  }, [data]);
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; password: string; role: UserRole }) =>
      createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      changeUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export type { UserView };
