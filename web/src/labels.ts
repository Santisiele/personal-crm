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

// Action types a user can log (the ARCHIVE type is internal to task archiving,
// so it is not offered here). These are technical keys the API resolves.
export const ACTIVITY_ACTION_TYPES = ['CALL', 'MEETING', 'EMAIL', 'NOTE'];

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  CALL: 'Llamada',
  MEETING: 'Reunión',
  EMAIL: 'Email',
  NOTE: 'Nota',
  ARCHIVE: 'Archivado',
};

export function actionLabel(actionType: string): string {
  return ACTIVITY_ACTION_LABELS[actionType] ?? actionType;
}
