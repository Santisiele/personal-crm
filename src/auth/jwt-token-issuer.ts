import { sign } from 'jsonwebtoken';
import { TokenIssuer } from '@/auth/token-issuer';

/**
 * Driven adapter issuing JWTs with `jsonwebtoken`. Kept free of NestJS so the
 * application layer depends only on the TokenIssuer port.
 */
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly secret: string) {}

  issue(payload: { sub: string; role: string }): Promise<string> {
    return Promise.resolve(sign(payload, this.secret, { expiresIn: '1h' }));
  }
}
