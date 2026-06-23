import { PasswordHasher } from '@/users/domain/password-hasher';
import { UserId } from '@/users/domain/user';
import { UserNotFoundError } from '@/users/domain/user-not-found.error';
import { UserRepository } from '@/users/domain/user.repository';

export interface ChangePasswordCommand {
  userId: UserId;
  newPassword: string;
}

/**
 * Application service for a user changing their own password. Hashing is
 * delegated to the PasswordHasher port; the new hash replaces the old one so
 * the previous password no longer verifies.
 */
export class ChangePassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }
    user.changePassword(await this.hasher.hash(command.newPassword));
    await this.users.save(user);
  }
}
