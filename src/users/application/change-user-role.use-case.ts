import { Actor } from '@/shared/domain/actor';
import { UserId } from '@/users/domain/user';
import { UserRole } from '@/users/domain/user-role';
import { UserRepository } from '@/users/domain/user.repository';
import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { UserNotFoundError } from '@/users/domain/user-not-found.error';

export interface ChangeUserRoleCommand {
  actor: Actor;
  userId: UserId;
  role: UserRole;
}

/**
 * Application service for changing a user's role (e.g. promoting to ADMIN).
 *
 * The decision is delegated to the UserAccessPolicy domain service, which needs
 * the target's current role as well as the requested one — an ADMIN is barred
 * both from granting privilege and from stripping it off a superior. The user is
 * loaded before the check because that current role is part of the decision.
 */
export class ChangeUserRole {
  private readonly policy = new UserAccessPolicy();

  constructor(private readonly users: UserRepository) {}

  async execute(command: ChangeUserRoleCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }
    if (!this.policy.canAssignRole(command.actor, user.role, command.role)) {
      throw new UserAccessDeniedError();
    }
    user.changeRole(command.role);
    await this.users.save(user);
  }
}
