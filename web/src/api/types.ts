// Shared shapes of the CRM API contract. The API is in English; only free-form,
// user-authored data (e.g. company status descriptions) may be Spanish.

export type UserRole = 'USER' | 'ADMIN' | 'CREATOR';

export const PRIVILEGED_ROLES: UserRole[] = ['ADMIN', 'CREATOR'];

export function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

export interface UserView {
  id: string;
  name: string;
  role: UserRole;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  ownerId: string;
  assigneeId: string | null;
  title: string;
  description: string;
  dueDate: string | null;
  companyId: string | null;
  status: TaskStatus;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  companyId?: string | null;
}

export interface EditTaskInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Role {
  id: string;
  description: string;
}
