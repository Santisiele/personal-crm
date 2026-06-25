import { Actor } from '@/shared/domain/actor';
import { Role } from '@/users/domain/role';
import { RoleRepository } from '@/users/domain/role.repository';
import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';

export interface ListRolesQuery {
  actor: Actor;
}

/**
 * Application service for listing the role definitions. Only a CREATOR may
 * manage roles; the decision is delegated to the UserAccessPolicy domain
 * service.
 */
export class ListRoles {
  private readonly policy = new UserAccessPolicy();

  constructor(private readonly roles: RoleRepository) {}

  async execute(query: ListRolesQuery): Promise<Role[]> {
    if (!this.policy.canManageRoles(query.actor)) {
      throw new UserAccessDeniedError();
    }
    return this.roles.findAll();
  }
}
