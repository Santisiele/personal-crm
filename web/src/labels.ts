// The API contract is in English (status enums, roles). The frontend owns the
// Spanish translation of those technical keys for display. Free-form data (e.g.
// company status descriptions) is shown verbatim and never translated.

import type { TaskStatus, UserRole } from '@/api/types';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completada',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: 'gray',
  IN_PROGRESS: 'blue',
  DONE: 'green',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Usuario',
  ADMIN: 'Administrador',
  CREATOR: 'Creador',
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'DONE',
];
