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
 * - Granting a role to a user is likewise the CREATOR's prerogative; an ADMIN is
 *   confined to plain users (see canAssignRole).
 */
export class UserAccessPolicy {
  private static readonly PRIVILEGED_ROLES = [UserRole.ADMIN, UserRole.CREATOR];

  canList(actor: Actor): boolean {
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
   * The CREATOR has full authority. An ADMIN is confined to plain users and may
   * not grant anything above USER, so it can neither mint a peer nor tamper with
   * a superior — the two ways an ADMIN could otherwise escalate. Everyone else,
   * notably a plain user acting on themselves, is refused outright.
   *
   * Both ends are constrained on purpose: gating only `newRole` would still let
   * an ADMIN demote the CREATOR, and gating only `currentRole` would let one
   * ADMIN promote a plain user into a second ADMIN. With today's three roles that
   * leaves an ADMIN no effective move; the rule is nonetheless stated in full so
   * that adding a role below USER needs no rethink here.
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
      return currentRole === UserRole.USER && newRole === UserRole.USER;
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
