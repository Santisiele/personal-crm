import { Actor } from '@/shared/domain/actor';
import { UserId } from '@/users/domain/user';
import { UserRepository } from '@/users/domain/user.repository';
import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { UserNotFoundError } from '@/users/domain/user-not-found.error';
import { toUserView, UserView } from '@/users/application/user-view';

export interface ViewUserQuery {
  actor: Actor;
  userId: UserId;
}

/**
 * Application service for reading a single user. A privileged actor may view
 * anyone; a plain user may only view themselves. The authorization decision is
 * delegated to the UserAccessPolicy domain service, and the result is projected
 * onto a hash-free view.
 */
export class ViewUser {
  private readonly policy = new UserAccessPolicy();

  constructor(private readonly users: UserRepository) {}

  async execute(query: ViewUserQuery): Promise<UserView> {
    if (!this.policy.canView(query.actor, query.userId)) {
      throw new UserAccessDeniedError();
    }
    const user = await this.users.findById(query.userId);
    if (!user) {
      throw new UserNotFoundError(query.userId);
    }
    return toUserView(user);
  }
}
