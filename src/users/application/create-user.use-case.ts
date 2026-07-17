import { PasswordHasher } from '@/users/domain/password-hasher';
import { User } from '@/users/domain/user';
import { UserNameTakenError } from '@/users/domain/user-name-taken.error';
import { UserRole } from '@/users/domain/user-role';
import { UserRepository } from '@/users/domain/user.repository';

export interface CreateUserCommand {
  name: string;
  password: string;
}

/**
 * Application service orchestrating user registration. Depends only on domain
 * ports (Dependency Inversion), so it is agnostic to persistence and hashing
 * strategies. Identity is assigned by the repository on save.
 *
 * Registration always mints a plain USER: sign-up must never confer privilege.
 * Elevated roles are reached solely through an authorized grant (ChangeUserRole,
 * gated by UserAccessPolicy.canAssignRole), so a public, unauthenticated caller
 * cannot register as an ADMIN or CREATOR.
 */
export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
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
