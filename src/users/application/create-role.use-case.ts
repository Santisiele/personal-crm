import { Actor } from '@/shared/domain/actor';
import { Role } from '@/users/domain/role';
import { RoleRepository } from '@/users/domain/role.repository';
import { RoleAlreadyExistsError } from '@/users/domain/role-already-exists.error';
import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';

export interface CreateRoleCommand {
  actor: Actor;
  description: string;
}

/**
 * Application service for creating a role definition. Only a CREATOR may manage
 * roles; the decision is delegated to the UserAccessPolicy domain service. A
 * duplicate description is rejected as a conflict. Identity is assigned by the
 * repository on save.
 */
export class CreateRole {
  private readonly policy = new UserAccessPolicy();

  constructor(private readonly roles: RoleRepository) {}

  async execute(command: CreateRoleCommand): Promise<Role> {
    if (!this.policy.canManageRoles(command.actor)) {
      throw new UserAccessDeniedError();
    }
    if (await this.roles.findByDescription(command.description)) {
      throw new RoleAlreadyExistsError(command.description);
    }
    const role = Role.create({ description: command.description });
    await this.roles.save(role);
    return role;
  }
}
