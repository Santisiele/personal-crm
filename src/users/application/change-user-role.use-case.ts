import { UserId } from '../domain/user';
import { UserRole } from '../domain/user-role';
import { UserRepository } from '../domain/user.repository';
import { UserNotFoundError } from '../domain/user-not-found.error';

export interface ChangeUserRoleCommand {
  userId: UserId;
  role: UserRole;
}

/**
 * Application service for changing a user's role (e.g. promoting to ADMIN).
 */
export class ChangeUserRole {
  constructor(private readonly users: UserRepository) {}

  async execute(command: ChangeUserRoleCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }
    user.changeRole(command.role);
    await this.users.save(user);
  }
}
