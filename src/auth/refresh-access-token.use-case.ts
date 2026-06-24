import { TokenIssuer } from '@/auth/token-issuer';

export interface RefreshAccessTokenCommand {
  refreshToken: string;
}

/**
 * Application service for the refresh flow. Validates the supplied refresh token
 * through the TokenIssuer port and mints a fresh access token for the same
 * principal. An invalid, expired, or wrong-kind token rejects with an
 * InvalidTokenError (raised by the port), which the delivery layer maps to 401.
 *
 * Framework-free: a plain class wired via useFactory in the module.
 */
export class RefreshAccessToken {
  constructor(private readonly tokens: TokenIssuer) {}

  async execute(command: RefreshAccessTokenCommand): Promise<string> {
    const principal = await this.tokens.verifyRefreshToken(
      command.refreshToken,
    );
    return this.tokens.issueAccessToken(principal);
  }
}
