// Shared shapes of the CRM API contract. The API is in English; only free-form,
// user-authored data (e.g. company status descriptions) may be Spanish.

export type UserRole = 'USER' | 'ADMIN' | 'CREATOR';

export const PRIVILEGED_ROLES: UserRole[] = ['ADMIN', 'CREATOR'];

export function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

/** Role seniority, low to high, mirroring the API's ROLE_RANK. */
export const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  ADMIN: 1,
  CREATOR: 2,
};

/** Whether role `a` is strictly more senior than role `b`. */
export function outranks(a: UserRole, b: UserRole): boolean {
  return ROLE_RANK[a] > ROLE_RANK[b];
}

export interface UserView {
  id: string;
  name: string;
  role: UserRole;
}

/** A minimal directory entry for picking an assignee (no role/credentials). */
export interface AssignableUser {
  id: string;
  name: string;
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
  contactId: string | null;
  status: TaskStatus;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  companyId?: string | null;
  contactId?: string | null;
}

export interface EditTaskInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
  companyId?: string | null;
  contactId?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Role {
  id: string;
  description: string;
}

export interface Contact {
  id: string;
  contactName: string;
  email: string | null;
  birth: string | null;
}

export interface CreateContactInput {
  contactName: string;
  email?: string | null;
  birth?: string | null;
}

export type EditContactInput = Partial<CreateContactInput>;

export interface Company {
  id: string;
  companyName: string;
  ownerId: string;
  cuit: string | null;
  brand: string | null;
  product: string | null;
  origin: string | null;
  status: string | null;
}

/** A contact as seen from a company's detail: the contact plus its link fields. */
export interface LinkedContact {
  id: string;
  contactName: string;
  email: string | null;
  roleInCompany: string | null;
  phone: string | null;
}

export interface CompanyWithContacts extends Company {
  contacts: LinkedContact[];
}

export interface CreateCompanyInput {
  companyName: string;
  cuit?: string | null;
  brand?: string | null;
  product?: string | null;
  origin?: string | null;
}

export type EditCompanyInput = Partial<CreateCompanyInput>;

export interface LinkContactInput {
  contactId: string;
  roleInCompany?: string | null;
  phone?: string | null;
}

export interface CompanyStatus {
  id: string;
  description: string;
}

/** A logged task activity as returned by the API (owner/privileged only). */
export interface TaskActivity {
  id: string;
  taskId: string;
  authorId: string;
  actionType: string;
  status: string;
  activityDate: string;
  description: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
}

export interface LogActivityInput {
  actionType: string;
  status: string;
  activityDate: string;
  description?: string;
  nextAction?: string;
  nextActionDate?: string;
}

export type AssignmentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface TaskAssignment {
  id: string;
  taskId: string;
  assigneeId: string;
  assignedById: string;
  status: AssignmentStatus;
  assignedAt: string;
}
