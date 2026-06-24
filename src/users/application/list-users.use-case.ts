import { Actor } from '@/shared/domain/actor';
import { UserRepository } from '@/users/domain/user.repository';
import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { toUserView, UserView } from '@/users/application/user-view';

export interface ListUsersQuery {
  actor: Actor;
}

/**
 * Application service for listing the user directory. Only privileged actors
 * (ADMIN, CREATOR) may list everyone; the decision is delegated to the
 * UserAccessPolicy domain service. Results are projected onto a hash-free view.
 */
export class ListUsers {
  private readonly policy = new UserAccessPolicy();

  constructor(private readonly users: UserRepository) {}

  async execute(query: ListUsersQuery): Promise<UserView[]> {
    if (!this.policy.canList(query.actor)) {
      throw new UserAccessDeniedError();
    }
    const users = await this.users.findAll();
    return users.map(toUserView);
  }
}
