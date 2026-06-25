import { Actor } from '@/shared/domain/actor';
import { UserId } from '@/users/domain/user';
import { UserRepository } from '@/users/domain/user.repository';
import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { UserNotFoundError } from '@/users/domain/user-not-found.error';

export interface DeactivateUserCommand {
  actor: Actor;
  userId: UserId;
}

/**
 * Application service for deactivating a user (logical delete). The user is
 * marked deleted so it disappears from the directory listing and login lookups,
 * yet stays retrievable by id so historical references remain viewable; the row
 * is never physically removed. Only privileged actors (ADMIN, CREATOR) may
 * deactivate a user — the decision is delegated to the UserAccessPolicy domain
 * service.
 */
export class DeactivateUser {
  private readonly policy = new UserAccessPolicy();

  constructor(private readonly users: UserRepository) {}

  async execute(command: DeactivateUserCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }
    if (!this.policy.canDeactivate(command.actor)) {
      throw new UserAccessDeniedError();
    }
    await this.users.softDelete(command.userId, command.actor.id);
  }
}
