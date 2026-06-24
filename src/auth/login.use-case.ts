import { PasswordHasher } from '@/users/domain/password-hasher';
import { UserRepository } from '@/users/domain/user.repository';
import { InvalidCredentialsError } from '@/auth/invalid-credentials.error';
import { TokenIssuer } from '@/auth/token-issuer';

export interface LoginCommand {
  name: string;
  password: string;
}

/** A successful login mints a short-lived access token and a refresh token. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Application service for password-based login. Resolves the user by name,
 * verifies the supplied password against the stored hash via the PasswordHasher
 * port, and delegates token minting to the TokenIssuer port. A missing user and
 * a wrong password fail identically (InvalidCredentialsError) so the response
 * does not leak which names exist.
 *
 * Returns both an access token (presented on every request) and a refresh token
 * (exchanged for a fresh access token at POST /auth/refresh).
 */
export class Login {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<TokenPair> {
    const user = await this.users.findByName(command.name);
    if (
      !user ||
      !(await this.hasher.verify(command.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsError();
    }
    const principal = { sub: user.id!, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.issueAccessToken(principal),
      this.tokens.issueRefreshToken(principal),
    ]);
    return { accessToken, refreshToken };
  }
}
