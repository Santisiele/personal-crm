import { sign, verify, type JwtPayload } from 'jsonwebtoken';
import { TokenIssuer, TokenPrincipal } from '@/auth/token-issuer';
import { InvalidTokenError } from '@/auth/invalid-token.error';

/** Distinguishes the two signed token kinds so they are not interchangeable. */
type TokenPurpose = 'access' | 'refresh';

export interface JwtTokenIssuerOptions {
  /** Access-token lifetime, in seconds. Defaults to one hour. */
  accessTtlSeconds?: number;
  /** Refresh-token lifetime, in seconds. Defaults to seven days. */
  refreshTtlSeconds?: number;
}

const ONE_HOUR = 60 * 60;
const SEVEN_DAYS = 7 * 24 * 60 * 60;

/**
 * Driven adapter issuing and verifying JWTs with `jsonwebtoken`. Kept free of
 * NestJS so the application layer depends only on the TokenIssuer port.
 *
 * Both kinds are stateless signed JWTs carrying a `purpose` claim; refresh stays
 * simple (no server-side store) until a scenario forces revocation. Tokens carry
 * an `exp`, and every verification failure (expired, tampered, wrong purpose)
 * surfaces as an InvalidTokenError.
 */
export class JwtTokenIssuer implements TokenIssuer {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly secret: string,
    options: JwtTokenIssuerOptions = {},
  ) {
    this.accessTtlSeconds = options.accessTtlSeconds ?? ONE_HOUR;
    this.refreshTtlSeconds = options.refreshTtlSeconds ?? SEVEN_DAYS;
  }

  issueAccessToken(principal: TokenPrincipal): Promise<string> {
    return this.issue(principal, 'access', this.accessTtlSeconds);
  }

  issueRefreshToken(principal: TokenPrincipal): Promise<string> {
    return this.issue(principal, 'refresh', this.refreshTtlSeconds);
  }

  verifyAccessToken(token: string): Promise<TokenPrincipal> {
    return this.verifyWithPurpose(token, 'access');
  }

  verifyRefreshToken(token: string): Promise<TokenPrincipal> {
    return this.verifyWithPurpose(token, 'refresh');
  }

  private issue(
    principal: TokenPrincipal,
    purpose: TokenPurpose,
    ttlSeconds: number,
  ): Promise<string> {
    return Promise.resolve(
      sign({ sub: principal.sub, role: principal.role, purpose }, this.secret, {
        expiresIn: ttlSeconds,
      }),
    );
  }

  private verifyWithPurpose(
    token: string,
    expected: TokenPurpose,
  ): Promise<TokenPrincipal> {
    let payload: JwtPayload & {
      sub?: string;
      role?: string;
      purpose?: TokenPurpose;
    };
    try {
      payload = verify(token, this.secret) as typeof payload;
    } catch {
      // Malformed, tampered, or expired — never leak which.
      return Promise.reject(new InvalidTokenError());
    }
    if (payload.purpose !== expected || !payload.sub || !payload.role) {
      return Promise.reject(new InvalidTokenError());
    }
    return Promise.resolve({ sub: payload.sub, role: payload.role });
  }
}
