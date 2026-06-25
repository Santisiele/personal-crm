import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';

/**
 * Domain service holding the authorization rules for companies. Pure logic, free
 * of persistence or transport concerns, so it is trivially unit-testable.
 */
export class CompanyAccessPolicy {
  private static readonly PRIVILEGED_ROLES = [UserRole.ADMIN, UserRole.CREATOR];

  /** Only privileged actors (ADMIN or CREATOR) may create a company. */
  canCreate(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  /** Linking contacts is part of managing a company, so same rule as creation. */
  canLinkContacts(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  /** Editing a company's fields is managing it, so same rule as creation. */
  canEdit(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  /** Transitioning a company's status is managing it; same rule as creation. */
  canChangeStatus(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  /** Deleting a company is managing it, so same rule as creation. */
  canDelete(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  /**
   * Managing the `company_status` catalogue (creating and listing statuses) is
   * an admin surface restricted to CREATORs only.
   */
  canManageStatuses(actor: Actor): boolean {
    return actor.role === UserRole.CREATOR;
  }

  private isPrivileged(actor: Actor): boolean {
    return CompanyAccessPolicy.PRIVILEGED_ROLES.includes(actor.role);
  }
}
