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
 * - Managing role definitions is reserved for the CREATOR alone.
 * - Granting a role is authorized by a hierarchy: the CREATOR may assign any
 *   role; an ADMIN manages the ordinary team (USER <-> ADMIN) but may never grant
 *   the CREATOR role nor touch a CREATOR (see canAssignRole).
 */
export class UserAccessPolicy {
  private static readonly PRIVILEGED_ROLES = [UserRole.ADMIN, UserRole.CREATOR];

  canList(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  /**
   * Creating an account is reserved for privileged actors (ADMIN, CREATOR):
   * there is no public self-registration. A new account is always a plain USER;
   * elevating it goes through canAssignRole.
   */
  canCreateUser(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  canDeactivate(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  /** Creating and listing role definitions is reserved for the CREATOR. */
  canManageRoles(actor: Actor): boolean {
    return actor.role === UserRole.CREATOR;
  }

  /**
   * Whether the actor may move a user from `currentRole` to `newRole`.
   *
   * The CREATOR has full authority. An ADMIN manages the ordinary team: it may
   * move a target freely between USER and ADMIN (promote a user, demote an
   * admin), but both ends must stay within {USER, ADMIN}. That single constraint
   * blocks the two escalations an ADMIN could otherwise attempt: granting the
   * CREATOR role (newRole === CREATOR) and demoting or otherwise touching a
   * CREATOR (currentRole === CREATOR). Everyone else — notably a plain user
   * acting on themselves — is refused outright.
   */
  canAssignRole(
    actor: Actor,
    currentRole: UserRole,
    newRole: UserRole,
  ): boolean {
    if (actor.role === UserRole.CREATOR) {
      return true;
    }
    if (actor.role === UserRole.ADMIN) {
      const manageable: UserRole[] = [UserRole.USER, UserRole.ADMIN];
      return manageable.includes(currentRole) && manageable.includes(newRole);
    }
    return false;
  }

  canView(actor: Actor, targetUserId: UserId): boolean {
    return this.isPrivileged(actor) || actor.id === targetUserId;
  }

  private isPrivileged(actor: Actor): boolean {
    return UserAccessPolicy.PRIVILEGED_ROLES.includes(actor.role);
  }
}
