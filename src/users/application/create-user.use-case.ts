import { Actor } from '@/shared/domain/actor';
import { PasswordHasher } from '@/users/domain/password-hasher';
import { User } from '@/users/domain/user';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserNameTakenError } from '@/users/domain/user-name-taken.error';
import { UserRole } from '@/users/domain/user-role';
import { UserRepository } from '@/users/domain/user.repository';

export interface CreateUserCommand {
  actor: Actor;
  name: string;
  password: string;
}

/**
 * Application service for creating a user account. There is no public
 * self-registration: only a privileged actor (ADMIN, CREATOR) may create an
 * account — the decision is delegated to UserAccessPolicy.canCreateUser. The new
 * account is always a plain USER; elevated roles are reached solely through an
 * authorized grant (ChangeUserRole), so creation can never confer privilege.
 *
 * Depends only on domain ports (Dependency Inversion), so it is agnostic to
 * persistence and hashing strategies. Identity is assigned by the repository on
 * save.
 */
export class CreateUser {
  private readonly policy = new UserAccessPolicy();

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    if (!this.policy.canCreateUser(command.actor)) {
      throw new UserAccessDeniedError();
    }
    if (await this.users.findByName(command.name)) {
      throw new UserNameTakenError(command.name);
    }
    const user = User.create({
      name: command.name,
      role: UserRole.USER,
      passwordHash: await this.hasher.hash(command.password),
    });
    await this.users.save(user);
    return user;
  }
}
