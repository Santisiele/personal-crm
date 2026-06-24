import { PasswordHasher } from '@/users/domain/password-hasher';
import { UserRepository } from '@/users/domain/user.repository';
import { InvalidCredentialsError } from '@/auth/invalid-credentials.error';
import { TokenIssuer } from '@/auth/token-issuer';

export interface LoginCommand {
  name: string;
  password: string;
}

/**
 * Application service for password-based login. Resolves the user by name,
 * verifies the supplied password against the stored hash via the PasswordHasher
 * port, and delegates token minting to the TokenIssuer port. A missing user and
 * a wrong password fail identically (InvalidCredentialsError) so the response
 * does not leak which names exist.
 */
export class Login {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<string> {
    const user = await this.users.findByName(command.name);
    if (
      !user ||
      !(await this.hasher.verify(command.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsError();
    }
    return this.tokens.issue({ sub: user.id!, role: user.role });
  }
}
