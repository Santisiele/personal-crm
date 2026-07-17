import { UserId } from '@/users/domain/user';
import { UserRepository } from '@/users/domain/user.repository';

/**
 * A minimal directory entry for picking a task's assignee: just enough to show
 * and choose a person, with no role or credentials.
 */
export interface AssignableUser {
  id: UserId;
  name: string;
}

/**
 * Lists the users a task may be assigned to, as id + name only. Unlike the full
 * directory (ListUsers, privileged-only), this is open to any authenticated
 * actor: assigning work needs to know who exists, and roles/credentials are not
 * exposed. Authorization is just "authenticated", enforced by the global guard.
 */
export class ListAssignableUsers {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<AssignableUser[]> {
    const users = await this.users.findAll();
    return users.map((user) => ({ id: user.id as UserId, name: user.name }));
  }
}
