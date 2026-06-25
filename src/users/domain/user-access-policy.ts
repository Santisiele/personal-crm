import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { UserId } from '@/users/domain/user';

/**
 * Domain service holding the authorization rules for the user directory. Pure
 * logic, free of persistence or transport concerns, so it is trivially
 * unit-testable.
 *
 * - Listing every user is reserved for privileged actors (ADMIN, CREATOR).
 * - Viewing a single user is allowed to privileged actors or to the user
 *   themselves.
 * - Deactivating (logically deleting) a user is reserved for privileged actors.
 */
export class UserAccessPolicy {
  private static readonly PRIVILEGED_ROLES = [UserRole.ADMIN, UserRole.CREATOR];

  canList(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  canDeactivate(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  canView(actor: Actor, targetUserId: UserId): boolean {
    return this.isPrivileged(actor) || actor.id === targetUserId;
  }

  private isPrivileged(actor: Actor): boolean {
    return UserAccessPolicy.PRIVILEGED_ROLES.includes(actor.role);
  }
}
