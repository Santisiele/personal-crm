import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Actor } from '@/shared/domain/actor';
import { UserRole } from '@/users/domain/user-role';
import { IS_PUBLIC_KEY } from '@/auth/public.decorator';
import { TOKEN_ISSUER, TokenIssuer } from '@/auth/token-issuer';
import { InvalidTokenError } from '@/auth/invalid-token.error';

/**
 * Global guard verifying the Bearer access token on every request. Routes flagged
 * with @Public() bypass verification. On success the decoded principal is
 * attached to `request.user`, which the @CurrentActor decorator then reads. This
 * is the single seam where transport credentials become a domain Actor.
 *
 * Verification is delegated to the TokenIssuer port (not jsonwebtoken directly),
 * keeping the token-format knowledge in one adapter and the seam testable. A
 * missing, expired, or otherwise invalid token raises an InvalidTokenError
 * (AuthenticationError → 401 via the DomainExceptionFilter).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: Actor }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new InvalidTokenError();
    }

    const principal = await this.tokens.verifyAccessToken(token);
    request.user = { id: principal.sub, role: principal.role as UserRole };
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers['authorization'];
    if (typeof header !== 'string') {
      return null;
    }
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
