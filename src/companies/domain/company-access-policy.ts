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

  private isPrivileged(actor: Actor): boolean {
    return CompanyAccessPolicy.PRIVILEGED_ROLES.includes(actor.role);
  }
}
